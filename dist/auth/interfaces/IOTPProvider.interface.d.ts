export interface IOTPProvider {
    requestOTP(mobileNumber: string): Promise<{
        otp: string;
        expiresAt: Date;
    }>;
    verifyOTP(mobileNumber: string, otp: string): Promise<{
        valid: boolean;
        user?: any;
    }>;
    invalidateOTP(mobileNumber: string): Promise<void>;
}
