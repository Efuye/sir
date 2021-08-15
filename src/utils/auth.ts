import { Response, Request, NextFunction } from "express";
import { R } from "../R";
import jwt from "jsonwebtoken";
import { db } from "../api";

const tokenSecrete: jwt.Secret | undefined =
  process.env.ENV === "test" || process.env.ENV === "testing"
    ? process.env.TEST_TOKEN_SECRETE
    : process.env.ENV === "prod" || process.env.ENV === "production"
    ? process.env.PROD_TOKEN_SECRETE
    : process.env.DEV_TOKEN_SECRETE;

export const tokenExp: string | undefined =
  process.env.ENV === "test" || process.env.ENV === "testing"
    ? process.env.TEST_TOKEN_EXP
    : process.env.ENV === "prod" || process.env.ENV === "production"
    ? process.env.PROD_TOKEN_EXP
    : process.env.DEV_TOKEN_EXP;

/**
 * Checks if the token is valid
 */
function verifyToken(token: string): Promise<any | Error> {
  return new Promise(function (resolve, reject) {
    jwt.verify(
      token,
      <jwt.Secret>tokenSecrete,
      function (err: any, payload: any) {
        if (err) return reject(err);
        resolve(payload);
      }
    );
  });
}

/**
 * Generates a new token for use by the client
 */
export function generateToken(id: string): string {
  return jwt.sign({ id }, <jwt.Secret>tokenSecrete, {
    expiresIn: tokenExp,
  });
}

/**
 * A middleware to protect the API
 */
export async function authMiddleWare(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  let token: string | undefined =
    req.headers.authorization?.split("Bearer ")[1];

  if (!token) throw R.errors.UNAUTHORIZED;

  let payload = await verifyToken(token);
  if (!payload) throw R.errors.UNAUTHORIZED;

  let session = await db.session.findUnique({
    where: { id: payload.id },
    include: { user: true },
  });
  if (!session) throw R.errors.USER_NOT_FOUND;

  //@ts-ignore
  req["session"] = session;
  next();
}
