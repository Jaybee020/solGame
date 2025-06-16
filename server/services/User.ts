import { UserModel, IUser, UserDocument } from "../models/User";

class User {
  model: typeof UserModel;
  constructor() {
    this.model = UserModel;
  }

  async get(id: string): Promise<UserDocument | null> {
    try {
      return await this.model.findById(id);
    } catch (error) {
      throw new Error(`Failed to get user: ${error}`);
    }
  }

  async getByWalletAddress(
    walletAddress: string
  ): Promise<UserDocument | null> {
    try {
      return await this.model.findOne({ walletAddress });
    } catch (error) {
      throw new Error(`Failed to get user by wallet address: ${error}`);
    }
  }

  async getByTelegramId(telegramId: number): Promise<UserDocument | null> {
    try {
      return await this.model.findOne({ telegramId });
    } catch (error) {
      throw new Error(`Failed to get user by telegram ID: ${error}`);
    }
  }

  async create(userData: Partial<IUser>): Promise<UserDocument> {
    try {
      const user = new this.model(userData);
      return await user.save();
    } catch (error) {
      throw new Error(`Failed to create user: ${error}`);
    }
  }
}

export default new User();
