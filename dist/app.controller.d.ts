import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getStatus(): {
        service: string;
        status: string;
        message: string;
        version: string;
        environment: string;
        timestamp: string;
        docs: string;
        health: string;
    };
}
