import { IsEnum } from 'class-validator';

export enum ResidentVisitorDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class DecideMyVisitorVisitDto {
  @IsEnum(ResidentVisitorDecision)
  decision: ResidentVisitorDecision;
}
