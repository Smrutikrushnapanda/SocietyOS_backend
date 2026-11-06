import { BadRequestException } from '@nestjs/common';
export enum NoticePriority {
  NORMAL = 'NORMAL',
  IMPORTANT = 'IMPORTANT',
  EMERGENCY = 'EMERGENCY',
}
export function noticeDates(
  expires: string | Date,
  scheduled?: string | Date,
): { expiry: Date; publication: Date | null } {
  const expiry = new Date(expires);
  const publication = scheduled ? new Date(scheduled) : null;
  if (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= Date.now())
    throw new BadRequestException('Expiration must be in the future');
  if (
    publication &&
    (!Number.isFinite(publication.getTime()) ||
      publication.getTime() <= Date.now() ||
      publication >= expiry)
  )
    throw new BadRequestException(
      'Publication must be in the future and before expiration',
    );
  return { expiry, publication };
}
export const NOTICE_ATTACHMENT_LIMIT = 5;
export const NOTICE_ATTACHMENT_BYTES = 2 * 1024 * 1024;
export const NOTICE_ATTACHMENT_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
