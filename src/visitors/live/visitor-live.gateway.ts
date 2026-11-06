import { Logger, OnModuleDestroy } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  type GatewayMetadata,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { Subscription } from 'rxjs';
import {
  VisitorLiveAuthorization,
  type LiveIdentity,
} from './visitor-live.authorization';
import {
  VisitorLiveEvents,
  VISITOR_LIVE_CHANNEL,
  type VisitorLiveEvent,
} from './visitor-live.events';

export function visitorLiveOriginAllowed(origin: string | undefined): boolean {
  const origins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    ...(process.env.CORS_ORIGIN ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  ];
  return origin !== undefined && origins.includes(origin);
}

export const visitorLiveGatewayOptions: GatewayMetadata = {
  namespace: '/visitors-live',
  path: '/socket.io',
  transports: ['websocket'],
  maxHttpBufferSize: 8192,
  cors: {
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allowed?: boolean) => void,
    ) => callback(null, visitorLiveOriginAllowed(origin)),
    credentials: true,
  },
  allowRequest: (
    request: { headers: { origin?: string } },
    callback: (error: string | null, allowed: boolean) => void,
  ) => callback(null, visitorLiveOriginAllowed(request.headers.origin)),
};

@WebSocketGateway(visitorLiveGatewayOptions)
export class VisitorLiveGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleDestroy
{
  @WebSocketServer() server: Namespace;
  private readonly logger = new Logger(VisitorLiveGateway.name);
  private readonly identities = new Map<Socket, LiveIdentity>();
  private readonly attempts = new Map<
    string,
    { count: number; until: number }
  >();
  private readonly queue: VisitorLiveEvent[] = [];
  private draining = false;
  private stopped = false;
  private authenticating = 0;
  private sweeping = false;
  private timer?: ReturnType<typeof setInterval>;
  private subscription?: Subscription;

  constructor(
    private readonly authorization: VisitorLiveAuthorization,
    private readonly events: VisitorLiveEvents,
  ) {}

  afterInit(server: Namespace): void {
    server.use((socket, next) => {
      const now = Date.now();
      for (const [key, bucket] of this.attempts)
        if (bucket.until <= now) this.attempts.delete(key);
      const ip = socket.handshake.address;
      const bucket = this.attempts.get(ip) ?? { count: 0, until: now + 60000 };
      if (
        this.authenticating >= 100 ||
        this.identities.size >= 1000 ||
        this.attempts.size >= 5000 ||
        ++bucket.count > 30
      ) {
        next(new Error('LIVE_CONNECTION_LIMIT'));
        return;
      }
      this.attempts.set(ip, bucket);
      ++this.authenticating;
      const credentials: unknown = socket.handshake.auth;
      void this.authorization
        .authenticate(credentials)
        .then((identity) => {
          if (
            this.stopped ||
            this.identities.size >= 1000 ||
            [...this.identities.values()].filter(
              (item) => item.userId === identity.userId,
            ).length >= 5
          )
            throw new Error('LIVE_CONNECTION_LIMIT');
          this.identities.set(socket, identity);
          socket.once('disconnect', () => this.identities.delete(socket));
          next();
        })
        .catch(() => {
          this.logger.warn({ event: 'visitor_live_connection_denied' });
          next(new Error('LIVE_AUTH_DENIED'));
        })
        .finally(() => {
          --this.authenticating;
        });
    });
    this.subscription = this.events.events.subscribe((event) => {
      if (this.queue.length >= 100) {
        this.logger.warn({
          event: 'visitor_live_queue_full',
          recovery: 'authorized_refetch',
        });
        return;
      }
      this.queue.push(event);
      void this.drain();
    });
    this.timer = setInterval(() => {
      void this.sweep();
    }, 20000);
    this.timer.unref();
  }

  async handleConnection(socket: Socket): Promise<void> {
    const identity = this.identities.get(socket);
    if (!identity) {
      socket.disconnect(true);
      return;
    }
    try {
      await socket.join(
        `visitor:${identity.organizationId}:${identity.userId}`,
      );
    } catch {
      socket.disconnect(true);
      this.identities.delete(socket);
      return;
    }
    // No client subscription/mutation protocol: arbitrary rooms and payloads are rejected.
    socket.onAny(() => socket.disconnect(true));
    this.logger.log({ event: 'visitor_live_connected' });
  }

  handleDisconnect(socket: Socket): void {
    this.identities.delete(socket);
  }

  private async sweep(): Promise<void> {
    if (this.sweeping || this.stopped) return;
    this.sweeping = true;
    try {
      const sockets = [...this.identities.entries()];
      for (
        let offset = 0;
        !this.stopped && offset < sockets.length;
        offset += 16
      ) {
        await Promise.all(
          sockets
            .slice(offset, offset + 16)
            .map(([socket, identity]) => this.revalidate(socket, identity)),
        );
      }
    } finally {
      this.sweeping = false;
    }
  }

  private async revalidate(
    socket: Socket,
    identity: LiveIdentity,
  ): Promise<boolean> {
    try {
      if (!socket.connected || identity.expiresAt <= Date.now())
        throw new Error('LIVE_AUTH_DENIED');
      await this.authorization.authenticate({
        accessToken: identity.accessToken,
        organizationId: identity.organizationId,
      });
      if (
        this.stopped ||
        this.identities.get(socket) !== identity ||
        identity.expiresAt <= Date.now()
      )
        return false;
      return true;
    } catch {
      socket.disconnect(true);
      this.identities.delete(socket);
      return false;
    }
  }

  private async drain(): Promise<void> {
    if (this.draining || this.stopped) return;
    this.draining = true;
    try {
      let event: VisitorLiveEvent | undefined;
      while (!this.stopped && (event = this.queue.shift())) {
        const current = event;
        const sockets = [...this.identities.entries()].filter(
          ([, identity]) => identity.organizationId === current.organizationId,
        );
        for (let offset = 0; offset < sockets.length; offset += 16) {
          await Promise.all(
            sockets
              .slice(offset, offset + 16)
              .map(async ([socket, identity]) => {
                try {
                  if (
                    !(await this.revalidate(socket, identity)) ||
                    !(await this.authorization.canReceive(identity, current))
                  )
                    return;
                  if (
                    !this.stopped &&
                    socket.connected &&
                    this.identities.get(socket) === identity &&
                    identity.expiresAt > Date.now()
                  )
                    socket.emit(VISITOR_LIVE_CHANNEL, current);
                } catch {
                  socket.disconnect(true);
                  this.identities.delete(socket);
                  this.logger.warn({
                    event: 'visitor_live_delivery_failed',
                    recovery: 'authorized_refetch',
                  });
                }
              }),
          );
        }
      }
    } finally {
      this.draining = false;
    }
  }

  onModuleDestroy(): void {
    this.stopped = true;
    clearInterval(this.timer);
    this.subscription?.unsubscribe();
    for (const socket of this.identities.keys()) socket.disconnect(true);
    this.identities.clear();
    this.attempts.clear();
    this.queue.length = 0;
  }
}
