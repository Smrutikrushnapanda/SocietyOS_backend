import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { Subject } from 'rxjs';
import type { VisitorVisit } from '../../database/entities/visitor-visit.entity';

export const VISITOR_LIVE_CHANNEL = 'visitor.live.v1';
export type VisitorLiveType =
  | 'visit.created'
  | 'visit.arrived'
  | 'visit.approved'
  | 'visit.rejected'
  | 'visit.checked_out'
  | 'visit.status_changed'
  | 'visit.approval_changed'
  | 'visit.pass_changed';

export interface VisitorLiveEvent {
  version: 1;
  eventId: string;
  type: VisitorLiveType;
  organizationId: string;
  visitId: string;
  occurredAt: string;
}

@Injectable()
export class VisitorLiveEvents {
  private readonly subject = new Subject<VisitorLiveEvent>();
  private readonly logger = new Logger(VisitorLiveEvents.name);
  readonly events = this.subject.asObservable();

  // Call only after repository save or the enclosing transaction has completed.
  publish(
    visit: Pick<VisitorVisit, 'id' | 'organization_id' | 'updatedAt'>,
    type: VisitorLiveType,
  ): void {
    try {
      const occurredAt = (visit.updatedAt ?? new Date()).toISOString();
      const eventId = createHash('sha256')
        .update(
          JSON.stringify([
            1,
            visit.organization_id,
            visit.id,
            type,
            occurredAt,
          ]),
        )
        .digest('hex');
      this.subject.next({
        version: 1,
        eventId,
        type,
        organizationId: visit.organization_id,
        visitId: visit.id,
        occurredAt,
      });
    } catch {
      this.logger.warn({
        event: 'visitor_live_invalidation_failed',
        recovery: 'authorized_refetch',
      });
    }
  }
}

export function visitorStatusEvent(
  status: VisitorVisit['visit_status'],
): VisitorLiveType {
  if (status === 'CONFIRMED') return 'visit.approved';
  if (status === 'CANCELLED') return 'visit.rejected';
  if (status === 'COMPLETED') return 'visit.checked_out';
  return 'visit.status_changed';
}
