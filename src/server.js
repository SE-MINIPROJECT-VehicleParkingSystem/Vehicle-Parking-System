import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import { createAuthRouter } from "./authRoutes.js";
import { assertSecureJwtSecret, createRoleGuard, provisionAdministrator } from "./auth.js";
import { createAdminRouter } from "./adminRoutes.js";
import { createReportRouter } from "./reportRoutes.js";
import { createParkingRouter } from "./parkingRoutes.js";
import { ParkingSession, ParkingSlot, ParkingTransaction, PricingRule, User as UserModel } from "./models.js";

export function createApp({
  jwtSecret,
  ParkingSlot,
  PricingRule,
  ParkingSession,
  ParkingTransaction,
  User = UserModel,
  runTransaction = (operation) => mongoose.connection.transaction(operation)
}) {
  const app = express();
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN || false }));
  app.use(express.json({ limit: "32kb" }));
  app.use("/api/auth", createAuthRouter({ User, jwtSecret }));

  app.use("/api/admin", createRoleGuard(jwtSecret, ["Administrator"]));
  app.use("/api/admin", createAdminRouter({ ParkingSlot, PricingRule }));
  app.use("/api/admin", createReportRouter({ ParkingSlot, ParkingSession, ParkingTransaction }));
  app.use("/api/staff", createParkingRouter({ jwtSecret, ParkingSlot, ParkingSession, runTransaction }));

  app.use((error, _request, response, _next) => {
    if (error.type === "entity.parse.failed") {
      return response.status(400).json({ error: "Request body must contain valid JSON" });
    }
    if (error.type === "entity.too.large") {
      return response.status(413).json({ error: "Request body is too large" });
    }
    if (error.code === 11000) {
      return response.status(409).json({ error: "A record with these settings already exists" });
    }

    console.error(error);
    response.status(500).json({ error: "An unexpected error occurred" });
  });

  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3000);
  const mongoUri = process.env.MONGODB_URI;
  const jwtSecret = process.env.JWT_SECRET;

  if (!mongoUri) {
    throw new Error("MONGODB_URI must be configured");
  }
  assertSecureJwtSecret(jwtSecret);

  if (Boolean(process.env.ADMIN_EMAIL) !== Boolean(process.env.ADMIN_PASSWORD)) {
    throw new Error("Set both ADMIN_EMAIL and ADMIN_PASSWORD to provision the administrator account");
  }

  await mongoose.connect(mongoUri);
  await Promise.all([ParkingSlot.init(), ParkingSession.init(), PricingRule.init(), ParkingTransaction.init(), UserModel.init()]);
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    await provisionAdministrator(UserModel, {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });
  }
  const app = createApp({ jwtSecret, ParkingSlot, PricingRule, ParkingSession, ParkingTransaction });
  app.listen(port, () => console.log(`Parking API listening on port ${port}`));
}