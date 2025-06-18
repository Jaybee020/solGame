import * as Factory from "factory.ts";
import { IUser } from "../../models/User";
import { Types } from "mongoose";

export const userFactory = Factory.Sync.makeFactory<Partial<IUser>>({
  walletAddress: Factory.each((i) => `wallet_address_${i}`),
  telegramId: Factory.each((i) => 1000000 + i),
  lastActivity: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  token: Factory.each((i) => `token_${i}`),
});
