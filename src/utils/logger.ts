import { TokenIndexer } from "morgan";
import { Request, Response } from "express";
import fs from "fs";
import { R } from "../R";
import { EventTag } from "@prisma/client";
import { db } from "../server";

const chalk = require("chalk");

export class Log {
  static e(message: string, tag: string) {
    console.log(chalk.red(`[${tag ?? "ERROR"}]:`), message);
  }

  static i(message: string, tag: string) {
    console.log(chalk.gray(`[${tag ?? "INFO"}]:`), message);
  }

  static w(message: string, tag: string) {
    console.log(chalk.yellow(`[${tag ?? "WARN"}]:`), message);
  }

  static gg(message: string, tag: string) {
    console.log(chalk.green(`[${tag ?? "GREEN"}]:`), message);
  }

  static http(message: string, tag: string = "HTTP") {
    console.log(chalk.rgb(160, 90, 143)(`[${tag ?? "HTTP"}]:`), message);
  }
}

export function morganFormat(
  tokens: TokenIndexer<Request, Response>,
  req: Request,
  res: Response
) {
  //@ts-ignore
  const { session } = req;
  tokens["remote-user"] = (req: Request, res: Response) =>
    session?.user?.id || "UNAUTHORIZED";
  tokens.date = (req: Request, res: Response) => new Date().toISOString();

  return [
    tokens["remote-addr"](req, res),
    tokens["remote-user"](req, res),
    tokens.date(req, res),
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    tokens["user-agent"](req, res),
    tokens["response-time"](req, res),
    "ms",
  ].join(" ");
}

export async function write(message: string) {
  fs.appendFile(
    `${R.values.logsBaseDirectory}request/requests.log`,
    message,
    () => {
      if (!fs.existsSync(`${R.values.logsBaseDirectory}request/`))
        fs.mkdirSync(`${R.values.logsBaseDirectory}request/`, {
          recursive: true,
        });
    }
  );

  const messageBits = message.split(" ");
  const statusCode = Number.parseInt(messageBits[5]);

  await db.log.create({
    data: {
      tag: statusCode >= 400 ? EventTag.ERROR : EventTag.INFO,
      ip: messageBits[0],
      userId: messageBits[1] !== "UNAUTHORIZED" ? messageBits[1] : undefined,
      createdAt: messageBits[2],
      method: messageBits[3],
      route: messageBits[4],
      statusCode: Number.parseInt(messageBits[5]),
      useragent: messageBits[6],
      responseTime: Number.parseFloat(messageBits[7]),
    },
  });
}
