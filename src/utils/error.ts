import { NextFunction, Request, Response } from "express";
import { Log } from "./logger";
import { R } from "../R";
import { ErrorCode } from "../R/errors";

/**
 * Shaves down an error to only **message** and
 * **code**.
 */ // @ts-ignore
export function getPureError(err: R.errors._Error) {
  return { message: err.message, code: err.code };
}

/**
 * Handles errors passed down to the end of the
 * express middleware chain.
 */
export function lastErrorHandler( // @ts-ignore
  err: R.errors._Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // @ts-ignore
  const { endpointPathIdentifier } = req;
  err.name = endpointPathIdentifier ?? "SERVER";

  if (err && err.message) {
    const { message, status, code } = err;
    Log.e(`(${code ?? ErrorCode.UNKNOWN_ERROR}) ${message}`, err.name);
    res.status(status ?? 500).send({ error: getPureError(err) });
  } else {
    console.dir(err);
    lastErrorHandler(R.errors.UNKNOWN_ERROR, req, res, next);
  }
}
