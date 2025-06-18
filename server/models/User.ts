import { Document, Model, Schema, Types, model } from "mongoose";
import { JwtPayload, sign, verify } from "jsonwebtoken";
import { LOGIN_SECRET } from "../config/constants";
import { Response } from "express";

export interface IUser {
  walletAddress: string;
  telegramId?: number;
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
  token?: string;
  findByToken: (token: string, cb: Function) => Promise<void>;
}

export interface UserDocument extends IUser, Document {
  generatetoken(arg0: (err: Error, token: string) => void): unknown;
}

export interface UserModel extends Model<UserDocument> {
  findByToken(
    token: string,
    arg1: (err: Error, user: UserDocument | null) => void
  ): unknown;
}

interface decodedToken extends JwtPayload {
  id: string;
}

const UserSchema = new Schema<UserDocument>(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    telegramId: {
      type: Number,
      sparse: true,
      index: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    token: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

UserSchema.statics.findByToken = async function (token: string, cb: Function) {
  var user = this;
  try {
    const { id } = <decodedToken>verify(token, LOGIN_SECRET);
    const foundUser = await user.findOne({ _id: id, token: token });
    cb(null, foundUser);
  } catch (err) {
    cb(err, null);
  }
};

UserSchema.methods.generatetoken = function (cb: Function): void {
  const user = this;
  var token = sign({ id: user._id.toString() }, LOGIN_SECRET);
  cb(null, token);
};

UserSchema.methods.deletetoken = async function () {
  var user = this;
  user.token = undefined;
  await user.save();
};

export const UserModel = model<UserDocument, UserModel>("User", UserSchema);
