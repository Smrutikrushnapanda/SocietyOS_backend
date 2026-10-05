import { AuthService } from '../auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    requestOTP(body: any): Promise<{
        success: boolean;
        message: string;
        expiresAt: Date;
    } | {
        success: boolean;
        message: string;
    }>;
    verifyOTP(body: any): Promise<{
        user: {
            id: string;
            mobileNumber: string;
        };
        accessToken: string;
        refreshToken: string;
    } | {
        success: boolean;
        message: string;
    }>;
    refreshToken(body: any): Promise<{
        user: {
            id: string;
            mobileNumber: string;
        };
        accessToken: string;
        refreshToken: string;
    } | {
        success: boolean;
        message: string;
    }>;
    logout(body: any): Promise<void | {
        success: boolean;
        message: string;
    }>;
}
