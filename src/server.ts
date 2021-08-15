import express from "express";
import "express-async-errors";
import "express-zip";
import cors from "cors";
import { json } from "express";
import morgan from "morgan";
import { authMiddleWare } from "./utils/auth";
import { tagRequest } from "./utils";
import { lastErrorHandler } from "./utils/error";
import { morganFormat, write } from "./utils/logger";
import { router, signupRouter, signinRouter, testRouter } from "./api";

const app = express();

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

app.use("/test", testRouter);
app.use("/signup", signupRouter);
app.use("/signin", signinRouter);
app.use("/api", authMiddleWare, router);

app.use(lastErrorHandler);

export async function start() {
  app.listen(process.env.PORT, function () {
    console.log(`Server listening on http://localhost:${process.env.PORT}/`);
  });
}

// TODO encryption
// TODO fucking fix the log fetch
