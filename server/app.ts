import mongoose from "mongoose";
import {
  MANAGER_WALLET_ADDRESS,
  MONGO_URI,
  REDIS_URL,
  SOLANA_RPC_URL,
} from "./config/constants";
import { createServer } from "http";
import Redis from "ioredis";
import cors from "cors";
import morgan from "morgan";
import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import { json, urlencoded } from "body-parser";
import { consoleLogger } from "./services/logger/pinoLogger";
import authRouter from "./routes/auth";
import gameRouter from "./routes/games";
import { payOutWorker } from "./jobs/payoutQueue";

const PORT = process.env.PORT || 8000;
const app = express();
const httpServer = createServer(app);
export const redisClient = new Redis(REDIS_URL);

mongoose
  .connect(MONGO_URI, { maxPoolSize: 10000, serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log("Connected to the database");
  })
  .catch((err) => {
    console.log(err);
    console.error("Could not connect to database");
  });

async function Mainrun() {
  try {
    app.use(morgan("dev"));
    app.get("", async (req: Request, res: Response) => {
      res.status(200).send("Pinged Server");
    });
    app.use(cors());
    app.use(urlencoded({ extended: true }));
    app.use(json({ limit: "50mb" }));
    app.use(cookieParser());
    app.use("/auth", authRouter);
    app.use("/games", gameRouter);
    payOutWorker.start();
    //@ts-ignore
    httpServer.listen(PORT, "0.0.0.0", async (error) => {
      consoleLogger.info("Started listening on port", PORT);
    });
  } catch (error) {
    consoleLogger.info("Occured Mainrun", error);
  }
}

Mainrun();
