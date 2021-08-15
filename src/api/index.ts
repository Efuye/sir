import { NextFunction, Request, Response, Router } from "express";
import bcrypt from "bcrypt";
import { cleanseObject, getDay } from "../utils";
import { generateToken, tokenExp } from "../utils/auth";
import { R } from "../R";
import { PrismaClient, Role } from "@prisma/client";
import { getUploadMiddleware, handleUploadError } from "../utils/upload";
import path from "path";
import sharp from "sharp";
import multer from "multer";

export const testRouter = Router();
export const signinRouter = Router();
export const signupRouter = Router();
export const router = Router();
export const db = new PrismaClient();
const upload: multer.Multer = getUploadMiddleware();

testRouter.get("/", async function (req: Request, res: Response) {
  res.send(req.body);
});

signupRouter.post("/", async function (req: Request, res: Response) {
  const row = { ...req.body };
  const { password } = req.body;
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
            exp: new Date(Date.now() + getDay(tokenExp) * 8.64e7),
          },
        ],
      },
    },
    include: {
      sessions: true,
    },
  });

  const token = generateToken(user.sessions[0].id);
  res.status(201).send({
    data: {
      token: `Bearer ${token}`,
      profile: cleanseObject(user, {
        exclude: [
          "sessions",
          "passwordHash",
          "verified",
          "updatedAt",
          "createdAt",
        ],
      }),
    },
  });
});

signinRouter.post("/", async function (req: Request, res: Response) {
  const { identifier, password } = req.body;

  const user = await db.consumer.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }],
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
  res.status(201).send({
    data: {
      token: `Bearer ${token}`,
      profile: cleanseObject(user, {
        exclude: ["passwordHash", "verified", "updatedAt", "createdAt"],
      }),
    },
  });
});

router.patch("/pass", async function (req: Request, res: Response) {
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

router.delete("/signout", async function (req: Request, res: Response) {
  const {
    // @ts-ignore
    session: { id },
  } = req;

  await db.session.delete({ where: { id } });

  res.status(204).end();
});

router.get("/consumer", async function (req: Request, res: Response) {
  const {
    // @ts-ignore
    session: {
      user: { role },
    },
  } = req;
  const { id, limit, createdAt, searchString } = req.query;
  const filterCondition: any = {
    NOT: { OR: [{ role: Role.ADMIN }, { role: Role.OWNER }] },
  };

  if (role !== Role.ADMIN && role !== Role.OWNER)
    throw R.errors.UNAUTHORIZED_RESOURCE_ACCESS;

  if (createdAt)
    filterCondition.createdAt = { gt: new Date(createdAt as string) };

  if (id) filterCondition.id = id;
  else if (searchString) {
    const condition: any = { contains: `%${searchString}%` };

    filterCondition["OR"] = ["username", "email"].map((column) => {
      return { [column]: condition };
    });
  }

  const consumers = await db.consumer.findMany({
    where: filterCondition,
    take: Number.parseInt(limit as string) || 30,
  });

  if (!consumers.length) throw R.errors.USER_NOT_FOUND;

  res.status(200).send({
    data: consumers.map((consumer) => {
      return cleanseObject(consumer, {
        exclude: ["passwordHash", "verified", "updatedAt", "createdAt"],
      });
    }),
  });
});

router.get("/admin", async function (req: Request, res: Response) {
  const {
    // @ts-ignore
    session: {
      user: { role },
    },
  } = req;
  const { id, limit, createdAt, searchString } = req.query;
  const filterCondition: any = { role: Role.ADMIN };

  if (role !== Role.OWNER) throw R.errors.UNAUTHORIZED_RESOURCE_ACCESS;

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

  res.status(200).send({
    data: admins.map((admin) => {
      return cleanseObject(admin, {
        exclude: ["passwordHash", "verified", "updatedAt", "createdAt"],
      });
    }),
  });
});

router.patch("/admin/verify", async function (req: Request, res: Response) {
  const {
    // @ts-ignore
    session: {
      user: { role },
    },
    query: { id },
  } = req;

  if (role !== Role.OWNER) throw R.errors.UNAUTHORIZED_RESOURCE_ACCESS;

  const updateResult = await db.consumer.update({
    where: { id: id as string },
    data: { verified: true, role: Role.ADMIN },
  });

  if (!updateResult) throw R.errors.DATABASE_ERROR;

  res.status(204).end();
});

router.patch("/admin/remove", async function (req: Request, res: Response) {
  const {
    // @ts-ignore
    session: {
      user: { role },
    },
    query: { id },
  } = req;

  if (role !== Role.OWNER) throw R.errors.UNAUTHORIZED_RESOURCE_ACCESS;

  const updateResult = await db.consumer.update({
    where: { id: id as string },
    data: { verified: false, role: Role.USER },
  });

  if (!updateResult) throw R.errors.DATABASE_ERROR;

  res.status(204).end();
});

router.post(
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

router.get("/log", async function (req: Request, res: Response) {
  const {
    // @ts-ignore
    session: {
      user: { role },
    },
  } = req;
  const { id, limit, createdAt, searchString } = req.query;
  const filterCondition: any = {};

  if (role !== Role.ADMIN && role !== Role.OWNER)
    throw R.errors.UNAUTHORIZED_RESOURCE_ACCESS;

  if (createdAt)
    filterCondition.createdAt = { gt: new Date(createdAt as string) };
  if (id) filterCondition.id = id;
  if (searchString) {
    const condition: any = { contains: `%${searchString}%` };

    filterCondition["OR"] = [
      "tag",
      "ip",
      "method",
      "route",
      "statusCode",
      "useragent",
      "responseTime",
    ].map((column) => {
      return { [column]: condition };
    });
  }

  const logs = await db.log.findMany({
    where: filterCondition,
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
