import path from "path";
import * as fs from "fs";
import express, { NextFunction, Request, Response } from "express";
import "express-async-errors";
import "express-zip";
import cors from "cors";
import { json } from "express";
import { PrismaClient, Role, EventTag } from "@prisma/client";
import morgan, { TokenIndexer } from "morgan";
import multer from "multer";
import sharp from "sharp";
import bcrypt from "bcrypt";
import { getUploadMiddleware, handleUploadError } from "./utils/upload";
import { authMiddleWare, generateToken } from "./utils/auth";
import { getDay, tagRequest } from "./utils";
import { lastErrorHandler } from "./utils/error";
import { R } from "./R";
import { tokenExp } from "./utils/auth";
import { morganFormat, write } from "./utils/logger";

const app = express();
export const db = new PrismaClient();
const upload: multer.Multer = getUploadMiddleware();

app.use(cors());
app.use(json());
app.use(
  morgan(morganFormat, {
    stream: {
      write,
    },
  })
);
app.use(tagRequest);

app.get("/test", async function (req: Request, res: Response) {
  res.send(req.body);
});

app.post("/signup", async function (req: Request, res: Response) {
  const { password } = req.body;
  const row = { ...req.body };
  delete row.password;

  const passwordHash = bcrypt.hashSync(password, 10);
  const user = await db.consumer.create({
    data: {
      passwordHash,
      ...row,
      sessions: {
        create: [
          {
            active: true,
            exp: Date.now() + getDay(tokenExp) * 8.64e7,
          },
        ],
      },
    },
    include: {
      sessions: true,
    },
  });

  const token = generateToken(user.sessions[0].id);
  res.status(201).send({ data: { token } });
});

app.post("/signin", async function (req: Request, res: Response) {
  const { email, username, password } = req.body;

  const user = await db.consumer.findFirst({
    select: { id: true, passwordHash: true },
    where: {
      OR: [{ email }, { username }],
    },
  });
  if (!user) throw R.errors.USER_NOT_FOUND;

  const same: boolean = bcrypt.compareSync(password, user.passwordHash);
  if (!same) throw R.errors.CREDENTIAL_INCORRECT;

  const session = await db.session.create({
    data: {
      active: true,
      exp: new Date(Date.now() + getDay(tokenExp) * 8.64e7),
      userId: user.id,
    },
  });

  const token: string = generateToken(session.id);
  res.status(200).send({ data: { token } });
});

app.use(authMiddleWare);

app.patch("/pass", async function (req: Request, res: Response) {
  // @ts-ignore
  const { session } = req;
  const { password, newPassword } = req.body;

  const same: boolean = bcrypt.compareSync(password, session.user.passwordHash);
  if (!same) throw R.errors.CREDENTIAL_INCORRECT;

  session.user.passwordHash = bcrypt.hashSync(newPassword, 10);
  await db.consumer.update({
    where: { id: session.user.id },
    data: {
      passwordHash: bcrypt.hashSync(newPassword, 10),
    },
  });

  res.status(204).end();
});

app.delete("/signout", async function (req: Request, res: Response) {
  const {
    // @ts-ignore
    session: { id },
  } = req;

  await db.session.delete({ where: { id } });

  res.status(204).end();
});

app.get("/admin/requests", async function (req: Request, res: Response) {
  const {
    // @ts-ignore
    session: {
      user: { role },
    },
  } = req;
  const { id, limit, createdAt, searchString } = req.query;
  const filterCondition: any = {};

  if (role !== "OWNER") throw R.errors.UNAUTHORIZED_RESOURCE_ACCESS;

  if (createdAt)
    filterCondition.createdAt = { gt: new Date(createdAt as string) };

  if (id) filterCondition.id = id;
  else if (searchString) {
    const condition: any = { contains: `%${searchString}%` };

    filterCondition["OR"] = ["username", "email"].map((column) => {
      return { [column]: condition };
    });
  }

  const admins = await db.consumer.findMany({
    where: filterCondition,
    take: Number.parseInt(limit as string) || 30,
  });

  if (!admins.length) throw R.errors.USER_NOT_FOUND;

  res.status(200).send({ data: admins });
});

app.delete("/admin/verify", async function (req: Request, res: Response) {
  const {
    // @ts-ignore
    session: {
      user: { role },
    },
    query: { adminId },
  } = req;

  if (role !== "OWNER") throw R.errors.UNAUTHORIZED_RESOURCE_ACCESS;

  const updateResult = await db.consumer.update({
    where: { id: adminId as string },
    data: { verified: true },
  });

  if (!updateResult) throw R.errors.DATABASE_ERROR;

  res.status(204).end();
});

app.get("/admin/remove", async function (req: Request, res: Response) {
  const {
    // @ts-ignore
    session: {
      user: { role },
    },
    query: { adminId },
  } = req;

  if (role !== "OWNER") throw R.errors.UNAUTHORIZED_RESOURCE_ACCESS;

  const updateResult = await db.consumer.update({
    where: { id: adminId as string },
    data: { verified: false },
  });

  if (!updateResult) throw R.errors.DATABASE_ERROR;

  res.status(204).end();
});

app.post(
  "/upload",
  async function (req: Request, res: Response, next: NextFunction) {
    upload.single("file")(req, res, async function (err) {
      try {
        await handleUploadError(err);

        //@ts-ignore
        const { file, session } = req;
        let { sizes } = req.body;
        const { dir, name, ext } = path.parse(file?.path as string);
        const returnables: any = [];

        for (const size of JSON.parse(sizes)) {
          if (Array.isArray(size)) {
            const outputPath = `${dir}/${name}_${size[0]}_x_${size[1]}${ext}`;
            await sharp(file?.path)
              .resize(size[0] as number, size[1] as number)
              .toFile(outputPath);

            returnables.push({
              path: outputPath,
              name: `${name}_${size[0]}_x_${size[1]}`,
            });
          } else {
            const outputPath = `${dir}/${name}_${size}${ext}`;
            await sharp(file?.path)
              .resize(size as number)
              .toFile(outputPath);

            returnables.push({ path: outputPath, name: `${name}_${size}` });
          }
        }

        await db.consumer.update({
          where: { id: session.user.id },
          data: { howManyPerMonth: { increment: 1 } },
        });

        // @ts-ignore
        res.zip(returnables, `${file?.originalname}`);
      } catch (err) {
        next(err);
      }
    });
  }
);

app.get("/log", async function (req: Request, res: Response) {
  const {
    // @ts-ignore
    session: {
      user: { role },
    },
  } = req;
  const { id, limit, createdAt, searchString } = req.query;
  const filterCondition: any = {};

  if (role !== Role.ADMIN) throw R.errors.UNAUTHORIZED_RESOURCE_ACCESS;

  if (id) filterCondition.id = id;
  else if (searchString) {
    const condition: any = { contains: `%${searchString}%` };

    filterCondition["OR"] = ["username", "email"].map((column) => {
      return { [column]: condition };
    });
  }

  const logs = await db.log.findMany({
    where: {
      createdAt: { gt: new Date(createdAt as string) },
      blame: filterCondition,
    },
    include: {
      blame: {
        select: { username: true, email: true, howManyPerMonth: true },
      },
    },
    take: Number.parseInt(limit as string) || 30,
  });

  if (!logs.length) throw R.errors.LOGS_NOT_FOUND;

  res.status(200).send({ data: logs });
});

app.use(lastErrorHandler);

export async function start() {
  app.listen(process.env.PORT, function () {
    console.log(`Server listening on http://localhost:${process.env.PORT}/`);
  });
}

// TODO encryption
// TODO fucking fix the log fetch
