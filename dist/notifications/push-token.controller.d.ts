import { PushTokenService } from './push-token.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
export declare class PushTokenController {
    private readonly pushTokenService;
    constructor(pushTokenService: PushTokenService);
    register(req: any, dto: RegisterPushTokenDto): Promise<import("../database/entities/push-token.entity").PushToken>;
    deactivate(req: any, id: string): Promise<{
        message: string;
    }>;
}
