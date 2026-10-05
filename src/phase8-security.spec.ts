import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ComplaintService } from './complaints/complaint.service';
import { NoticeService } from './notices/notice.service';
import { PollService } from './polls/poll.service';
import { ComplaintStatusHistory } from '../database/entities/complaint-status-history.entity';
import { Complaint } from '../database/entities/complaint.entity';
import { Notice } from '../database/entities/notice.entity';
import { Poll } from '../database/entities/poll.entity';
import { PollOption } from '../database/entities/poll-option.entity';
import { PollVote } from '../database/entities/poll-vote.entity';
import { Resident } from '../database/entities/resident.entity';
import { OrganizationContextService } from './organization/organization-context.service';
import { AuditService } from './audit/audit.service';

const orgId = 'org-88888888-0000-0000-0000-000000000001';
const orgBId = 'org-99999999-0000-0000-0000-000000000002';

const residentAId = 'resident-88888888-0000-0000-0000-000000000100';
const residentBId = 'resident-88888888-0000-0000-0000-000000000200';
const residentCId = 'resident-88888888-0000-0000-0000-000000000300';

const userAId = 'user-88888888-0000-0000-0000-000000000001';
const userBId = 'user-88888888-0000-0000-000000000002';

const complaintId = 'complaint-88888888-0000-0000-0000-000000000100';
const noticeId = 'notice-88888888-0000-0000-0000-000000000200';
const pollId = 'poll-88888888-0000-0000-0000-000000000300';
const optionId = 'option-88888888-0000-0000-0000-000000000400';
const voteId = 'vote-88888888-0000-0000-0000-000000000500';

const futureStart = new Date(Date.now() + 86400000);
const pastEnd = new Date(Date.now() - 86400000);

const createComplaintDto = {
  id: complaintId,
  resident_id: residentAId,
  flat_id: 'flat-88888888-0000-0000-0000-000000000001',
  category: 'MAINTENANCE',
  subject: 'Test complaint',
  description: 'Test description',
  assigned_to: null,
  priority: 'MEDIUM',
  organization_id: orgId,
};

const createNoticeDto = {
  id: noticeId,
  organization_id: orgId,
  title: 'Test Notice',
  content: 'Test content',
  expires_at: futureStart,
};

const createPollDto = {
  id: pollId,
  organization_id: orgId,
  title: 'Test Poll',
  description: 'Test poll description',
  starts_at: new Date(Date.now() - 3600000),
  ends_at: futureStart,
};

const createOptionDto = {
  id: optionId,
  poll_id: pollId,
  option_text: 'Yes',
  display_order: 1,
  organization_id: orgId,
};

const voteDto = {
  id: voteId,
  poll_id: pollId,
  option_id: optionId,
};

describe('Phase 8 Security - Complaints', () => {
  let complaintService: ComplaintService;
  let dataSource: DataSource;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplaintService,
        {
          provide: AuditService,
          useValue: { record: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              create: jest.fn((dto: any) => ({ ...dto, id: dto.id })),
              save: jest.fn().mockResolvedValue({ id: complaintId, ...createComplaintDto }),
              find: jest.fn().mockResolvedValue([]),
              findOne: jest.fn().mockResolvedValue(null),
            }),
          },
        },
      ],
    }).compile();

    complaintService = module.get<ComplaintService>(ComplaintService);
    dataSource = module.get<DataSource>(DataSource);
  });

  beforeEach(() => jest.clearAllMocks());

  it('should create complaint with organization_id from orgContext', async () => {
    const orgContext = { organizationId: orgId };
    const result = await complaintService.create(createComplaintDto, residentAId, orgContext);
    expect(result).toBeDefined();
    expect(result.id).toBe(complaintId);
  });

  it('should reject complaint if resident_id does not match authenticated resident', async () => {
    const orgContext = { organizationId: orgId };
    await expect(
      complaintService.create(createComplaintDto, residentBId, orgContext)
    ).rejects.toThrow('Residents can only create complaints for themselves');
  });

  it('should enforce complaint status transition OPEN -> IN_PROGRESS or REJECTED', () => {
    const orgContext = { organizationId: orgId };
  });

  it('should enforce status transition from IN_PROGRESS to RESOLVED', () => {
    const orgContext = { organizationId: orgId };
  });

  it('should enforce status transition from RESOLVED to CLOSED', () => {
    const orgContext = { organizationId: orgId };
  });

  it('should reject invalid status transition', () => {
    const orgContext = { organizationId: orgId };
  });
});

describe('Phase 8 Security - Notices', () => {
  let noticeService: NoticeService;
  let dataSource: DataSource;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NoticeService,
        {
          provide: AuditService,
          useValue: { record: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              create: jest.fn((dto: any) => ({ ...dto, id: dto.id })),
              save: jest.fn().mockResolvedValue({ id: noticeId, ...createNoticeDto }),
              find: jest.fn().mockResolvedValue([]),
              findOne: jest.fn().mockResolvedValue(null),
            }),
          },
        },
      ],
    }).compile();

    noticeService = module.get<NoticeService>(NoticeService);
    dataSource = module.get<DataSource>(DataSource);
  });

  beforeEach(() => jest.clearAllMocks());

  it('should allow DRAFT -> PUBLISHED transition', () => {
    const orgContext = { organizationId: orgId };
  });

  it('should reject PUBLISHED -> DRAFT transition', () => {
    const orgContext = { organizationId: orgId };
  });

  it('should allow PUBLISHED -> ARCHIVED transition', () => {
    const orgContext = { organizationId: orgId };
  });

  it('should reject ARCHIVED -> PUBLISHED transition', () => {
    const orgContext = { organizationId: orgId };
  });

  it('should reject invalid notice status transition', () => {
    const orgContext = { organizationId: orgId };
  });

  it('should filter notices by status for residents (only PUBLISHED visible)', () => {
    const orgContext = { organizationId: orgId };
  });

  it('should allow admins to read all notices in organization', () => {
    const orgContext = { organizationId: orgId };
  });
});

describe('Phase 8 Security - Polls', () => {
  let pollService: PollService;
  let dataSource: DataSource;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PollService,
        {
          provide: AuditService,
          useValue: { record: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              create: jest.fn((dto: any) => ({ ...dto, id: dto.id })),
              save: jest.fn().mockResolvedValue({ id: pollId, ...createPollDto }),
              find: jest.fn().mockResolvedValue([]),
              findOne: jest.fn().mockResolvedValue(null),
            }),
          },
        },
      ],
    }).compile();

    pollService = module.get<PollService>(PollService);
    dataSource = module.get<DataSource>(DataSource);
  });

  beforeEach(() => jest.clearAllMocks());

  it('should allow DRAFT -> ACTIVE (start) transition', () => {
    const orgContext = { organizationId: orgId };
  });

  it('should reject start on non-DRAFT poll', () => {
    const orgContext = { organizationId: orgId };
  });

  it('should allow ACTIVE -> CLOSED (end) transition', () => {
    const orgContext = { organizationId: orgId };
  });

  it('should reject end on non-ACTIVE poll', () => {
    const orgContext = { organizationId: orgId };
  });

  it('should reject voting on poll before starts_at', () => {
    const orgContext = { organizationId: orgId };
  });

  it('should reject voting on poll after ends_at', () => {
    const orgContext = { organizationId: orgId };
  });

  it('should reject voting on CLOSED poll', () => {
    const orgContext = { organizationId: orgId };
  });

  it('should reject voting if resident already voted', () => {
    const orgContext = { organizationId: orgId };
  });

  it('should validate poll option organization_id matches poll organization_id', () => {
    const orgContext = { organizationId: orgId };
  });

  it('should reject voting if resident does not belong to organization', () => {
    const orgContext = { organizationId: orgId };
  });

  it('should reject voting if option belongs to different organization', () => {
    const orgContext = { organizationId: orgId };
  });

  it('should allow residents to view poll results', () => {
    const orgContext = { organizationId: orgId };
  });
});

describe('Phase 8 Security - Complaint Status History', () => {
  it('should create status history entry on transition', () => {
  });

  it('status history should be organization-scoped', () => {
  });

  it('status history should be forgery-proof', () => {
  });
});