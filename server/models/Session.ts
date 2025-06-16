import { Document, Model, Schema, Types, model } from "mongoose";
import { IUser } from "./User";

export interface ISession {
  userId: Types.ObjectId | IUser;
  expiresAt: Date;
  sessionData?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionDocument extends ISession, Document {}

export interface SessionModel extends Model<SessionDocument> {}

const SessionSchema = new Schema<SessionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    sessionData: {
      type: Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

export const SessionModel = model<SessionDocument, SessionModel>(
  "Session",
  SessionSchema
);
