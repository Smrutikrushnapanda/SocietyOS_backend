import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';

export class DatabaseService {
  private readonly userRepository: Repository<User>;

  constructor(private readonly dataSource: DataSource) {
    this.userRepository = dataSource.getRepository(User);
  }

  async findUserByMobile(mobileNumber: string): Promise<User | null> {
    return this.userRepository.findOneBy({ mobileNumber });
  }

  async findUserById(userId: string): Promise<User | null> {
    return this.userRepository.findOneBy({ id: userId });
  }

  async createUser(data: {
    mobileNumber: string;
    isAuthenticated?: boolean;
  }): Promise<User> {
    const user = this.userRepository.create({
      mobileNumber: data.mobileNumber,
      isAuthenticated: data.isAuthenticated ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return this.userRepository.save(user);
  }

  async updateUser(userId: string, data: Partial<User>): Promise<User | null> {
    await this.userRepository.update(userId, data);
    return this.findUserById(userId);
  }
}
