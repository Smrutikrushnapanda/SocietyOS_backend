import { AdvancedConsoleLogger, type QueryRunner } from 'typeorm';

export class PushTokenSafeLogger extends AdvancedConsoleLogger {
  logQuery(query: string, parameters?: unknown[], runner?: QueryRunner): void {
    if (query.includes('notification_deliveries'))
      return super.logQuery(
        '[notification_deliveries query redacted]',
        [],
        runner,
      );
    if (query.includes('push_tokens'))
      return super.logQuery('[push_tokens query redacted]', [], runner);
    super.logQuery(query, parameters, runner);
  }
  logQueryError(
    error: string | Error,
    query: string,
    parameters?: unknown[],
    runner?: QueryRunner,
  ): void {
    if (query.includes('notification_deliveries'))
      return super.logQueryError(
        'Notification delivery database operation failed',
        '[notification_deliveries query redacted]',
        [],
        runner,
      );
    if (query.includes('push_tokens'))
      return super.logQueryError(
        'Push token database operation failed',
        '[push_tokens query redacted]',
        [],
        runner,
      );
    super.logQueryError(
      error instanceof Error ? error.message : error,
      query,
      parameters,
      runner,
    );
  }
  logQuerySlow(
    time: number,
    query: string,
    parameters?: unknown[],
    runner?: QueryRunner,
  ): void {
    if (query.includes('notification_deliveries'))
      return super.logQuerySlow(
        time,
        '[notification_deliveries query redacted]',
        [],
        runner,
      );
    if (query.includes('push_tokens'))
      return super.logQuerySlow(
        time,
        '[push_tokens query redacted]',
        [],
        runner,
      );
    super.logQuerySlow(time, query, parameters, runner);
  }
}
