import { Document, Model, Schema, Types, model } from "mongoose";
import { IUser } from "./User";

export interface IGameResult {
  userId: Types.ObjectId | IUser;
  gameType: string;
  timestamp: Date;
  result: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameResultDocument extends IGameResult, Document {}

export interface GameResultModel extends Model<GameResultDocument> {}

const GameResultSchema = new Schema<GameResultDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    gameType: {
      type: String,
      required: true,
      index: true,
    },
    result: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

export const GameResultModel = model<GameResultDocument, GameResultModel>(
  "GameResult",
  GameResultSchema
);
