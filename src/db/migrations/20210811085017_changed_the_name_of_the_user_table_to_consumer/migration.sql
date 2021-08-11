-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "EventTag" AS ENUM ('WTF', 'ERROR', 'INFO', 'WARNING', 'DEBUG');

-- CreateTable
CREATE TABLE "Consumer" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT E'USER',
    "howManyPerMonth" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Log" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "EventTag" NOT NULL DEFAULT E'INFO',
    "useragent" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTime" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Consumer.username_unique" ON "Consumer"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Consumer.email_unique" ON "Consumer"("email");

-- AddForeignKey
ALTER TABLE "Log" ADD FOREIGN KEY ("userId") REFERENCES "Consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
