import express, {
  Router,
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import Joi from "joi";
import { SERVER_API_KEY } from "../../../config/constants";
import { UserDocument, UserModel } from "../../../models/User";

export interface Req extends Request {
  token?: string;
  user?: UserDocument;
}

export const authenticatetoken = function (req: Req, res: Response, next: any) {
  if (!req.headers.authorization) {
    throw Error("Wrong Authorization Token");
  }
  const [serverKey, token] = req.headers.authorization!.split(":");

  if (serverKey !== SERVER_API_KEY) {
    throw Error("Wrong API Key");
  }
  //auth header should take the form "JWT TOKEN_VALUE"
  //   const authHeader = req.headers.authorization;
  if (token) {
    UserModel.findByToken(token, (err: Error, user: UserDocument | null) => {
      if (err) {
        console.error(err);
      }
      if (!user) {
        res
          .status(403)
          .send({ auth: false, message: "Authentication Failed!" });
      } else {
        req.token = token;
        req.user = user;
        next();
      }
    });
  } else {
    res.status(403).send({ auth: false, message: "Wrong cookie!" });
  }
};

export const authenticateAPIKey = function (
  req: Req,
  res: Response,
  next: any
) {
  if (!req.headers.authorization) {
    throw Error("Wrong Authorization Token");
  }
  const serverKey = req.headers.authorization;

  if (serverKey !== SERVER_API_KEY) {
    res.status(403).send({ auth: false, message: "Wrong cookie!" });
  }
  next();
};

export const authenticateAdminAPIKey = function (
  req: Req,
  res: Response,
  next: any
) {
  if (!req.headers.authorization) {
    throw Error("Wrong Authorization Token");
  }
  const serverKey = req.headers.authorization;

  if (serverKey !== SERVER_API_KEY) {
    res.status(403).send({ auth: false, message: "Wrong cookie!" });
  }
  next();
};

/**
 * Middleware to validate a request against a given Joi schema.
 * @param schema - The Joi schema to validate against.
 * @param source - The part of the request to validate (e.g., 'body', 'query', 'params').
 */
export const validateRequest =
  (schema: Joi.ObjectSchema, source: "body" | "query" | "params" = "body") =>
  (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      allowUnknown: true,
    });

    if (error) {
      // Respond with validation errors
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: error.details.map((err) => ({
          path: err.path.join("."),
          message: err.message,
        })),
      });
    }

    // Replace the validated value in the request (optional)
    req[source] = value;

    // Proceed to the next middleware
    next();
  };
