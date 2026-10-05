import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
export declare class DatabaseService {
    private readonly dataSource;
    private readonly userRepository;
    constructor(dataSource: DataSource);
    findUserByMobile(mobileNumber: string): Promise<User | null>;
    findUserById(userId: string): Promise<User | null>;
    createUser(data: {
        mobileNumber: string;
        isAuthenticated?: boolean;
    }): Promise<User>;
    updateUser(userId: string, data: Partial<User>): Promise<User | null>;
}
