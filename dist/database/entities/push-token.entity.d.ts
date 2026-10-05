export declare enum PushTokenPlatform {
    WEB = "WEB",
    ANDROID = "ANDROID",
    IOS = "IOS"
}
export declare class PushToken {
    id: string;
    user_id: string;
    organization_id: string;
    token: string;
    platform: PushTokenPlatform;
    is_active: boolean;
    last_seen_at: Date | null;
    created_at: Date;
    updated_at: Date;
}
