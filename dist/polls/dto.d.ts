export declare enum PollStatus {
    DRAFT = "DRAFT",
    PUBLISHED = "PUBLISHED",
    CLOSED = "CLOSED"
}
export declare class CreatePollDto {
    title: string;
    description?: string;
    starts_at: Date;
    ends_at: Date;
    created_by: string;
    id?: string;
    options?: CreatePollOptionDto[];
}
export declare class CreatePollOptionDto {
    option_text: string;
    display_order?: number;
}
export declare class VotePollDto {
    poll_id: string;
    option_id: string;
    id?: string;
}
export declare class UpdatePollDto {
    status?: PollStatus;
    id?: string;
}
