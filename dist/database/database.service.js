"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const user_entity_1 = require("./entities/user.entity");
class DatabaseService {
    dataSource;
    userRepository;
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.userRepository = dataSource.getRepository(user_entity_1.User);
    }
    async findUserByMobile(mobileNumber) {
        return this.userRepository.findOneBy({ mobileNumber });
    }
    async findUserById(userId) {
        return this.userRepository.findOneBy({ id: userId });
    }
    async createUser(data) {
        const user = this.userRepository.create({
            mobileNumber: data.mobileNumber,
            isAuthenticated: data.isAuthenticated ?? false,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        return this.userRepository.save(user);
    }
    async updateUser(userId, data) {
        await this.userRepository.update(userId, data);
        return this.findUserById(userId);
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=database.service.js.map