import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import { createAuthRouter } from "./authRoutes.js";
import { assertSecureJwtSecret, provisionAdministrator, verifyAccessToken } from "./auth.js";
import { createAdminRouter } from "./adminRoutes.js";
import { createReportRouter } from "./reportRoutes.js";
import { ParkingSession, ParkingSlot, ParkingTransaction, PricingRule, User as UserModel } from "./models.js";

export function createApp({ jwtSecret, ParkingSlot, PricingRule, ParkingSession, ParkingTransaction, User = UserModel }) {
  const app = express();
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN || false }));
  app.use(express.json({ limit: "32kb" }));
  app.use("/api/auth", createAuthRouter({ User, jwtSecret }));

  app.use("/api/admin", (request, response, next) => {
    if (!jwtSecret) {
      return response.status(503).json({ error: "Authentication is not configured" });
    }

    const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) {
      return response.status(401).json({ error: "Authentication required" });
    }

    try {
      const user = verifyAccessToken(token, jwtSecret);
      if (user.role !== "Administrator") {
        return response.status(403).json({ error: "Administrator access required" });
      }
      next();
    } catch {
      response.status(401).json({ error: "Invalid authentication token" });
    }
  });

  app.use("/api/admin", createAdminRouter({ ParkingSlot, PricingRule }));
  app.use("/api/admin", createReportRouter({ ParkingSlot, ParkingSession, ParkingTransaction }));

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
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    await provisionAdministrator(UserModel, {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });
  }
  const app = createApp({ jwtSecret, ParkingSlot, PricingRule, ParkingSession, ParkingTransaction });
  app.listen(port, () => console.log(`Parking API listening on port ${port}`));
}