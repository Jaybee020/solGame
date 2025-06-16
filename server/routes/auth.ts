import express, { Request, Response } from "express";
import Joi from "joi";
import moment from "moment";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import {
  authenticateAPIKey,
  authenticatetoken,
  Req,
} from "../services/api/auth/auth";
import User from "../services/User";
import { UserModel } from "../models/User";

let authRouter = express.Router();

/**
 * @openapi
 * /auth/profile:
 *   get:
 *     tags:
 *     - "Auth"
 *     produces:
 *       - application/json
 *     consumes:
 *       - application/json
 *     description: list blockchain
 *     responses:
 *       200:
 *         description: get list blockchain.
 */
authRouter.get(
  "/profile",
  authenticatetoken,
  async (req: Req, res: Response) => {
    try {
      const userId = req.user?._id as string;
      const foundUserDetails = await User.get(userId);
      //check if foundUserDetails has a password
      if (!foundUserDetails) {
        res.status(200).json({ data: "Unable to find user of specific Id" });
        return;
      }
      const data = foundUserDetails.toObject();
      data.token = req.token;
      res.status(200).json({
        success: true,
        data: data,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error });
    }
  }
);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags:
 *     - "Auth"
 *     requestBody:
 *       description: description
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - signature
 *               - publicAddress
 *               - message
 *               - referrerId
 *             properties:
 *                signature:
 *                  type: string
 *                publicAddress:
 *                  type: string
 *                message:
 *                  type: string
 *                referrerId:
 *                  type: string
 *     description: user verify login with wallet
 *     responses:
 *       200:
 *         description: login with address success.
 *       422:
 *         description: Invalid request.
 */

authRouter.post(
  "/login",
  authenticateAPIKey,
  async (req: Request, res: Response) => {
    try {
      const { signature, publicAddress, message } = req.body;
      const schema = Joi.object({
        signature: Joi.string().required(),
        publicAddress: Joi.string().required(),
        message: Joi.string().required(),
      });
      let { error } = schema.validate({
        signature,
        publicAddress,
        message,
      });
      if (error !== undefined) {
        res.status(422).json({
          message: "Invalid request",
          data: req.query,
          error,
          success: false,
        });

        return;
      }

      if (moment().diff(moment.unix(Number(message) / 1000), "seconds") >= 60) {
        res.status(500).json({
          message: "Message expired.",
          success: false,
        });
        return;
      }

      const messageBytes = new TextEncoder().encode(message);
      const result = nacl.sign.detached.verify(
        messageBytes,
        bs58.decode(signature),
        new PublicKey(publicAddress).toBytes()
      );

      if (!result) {
        res.status(500).json({
          message: "Invalid signature.",
          success: false,
        });
        return;
      }
      var user = await User.getByWalletAddress(publicAddress);
      let responseMessage = "Login Successful";
      if (!user) {
        responseMessage = "Signup successful.";
        user = await User.create({
          walletAddress: publicAddress,
        });
      }
      if (user.token != null) {
        res.status(201).json({
          success: true,
          message: responseMessage,
          id: user?.id,
          publicAddress: publicAddress,
          authToken: user.token,
          firstTime: responseMessage === "Signup successful.",
        });
        return;
      } else {
        user.generatetoken(async (err: Error, token: string) => {
          await UserModel.updateOne(
            { _id: user?._id },
            { $set: { token: token } }
          );
          res.status(201).json({
            success: true,
            message: responseMessage,
            id: user?.id,
            publicAddress: publicAddress,
            authToken: token,
            firstTime: responseMessage === "Signup successful.",
          });

          return;
        });
      }
    } catch (error: any) {
      console.error(error);
      res.status(400).json({ success: false, error: error.toString() });
    }
  }
);

authRouter.post(
  "/logout",
  authenticatetoken,
  async (req: Req, res: Response) => {
    try {
      if (req.user) {
        await UserModel.updateOne(
          { _id: req.user._id },
          {
            $unset: {
              token: 1,
            },
          },
          {
            new: true,
          }
        );
        res
          .clearCookie("x_auth")
          .status(200)
          .send({ message: "Logged out user" });
      }
    } catch (error) {
      res.status(400).send({ message: "Couldnt log out" });
    }
  }
);

export default authRouter;
