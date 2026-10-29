import "dotenv/config";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import { createAdminRouter } from "./adminRoutes.js";
import { createReportRouter } from "./reportRoutes.js";
import { ParkingSession, ParkingSlot, ParkingTransaction, PricingRule } from "./models.js";

export function createApp({ jwtSecret, ParkingSlot, PricingRule, ParkingSession, ParkingTransaction }) {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN || false }));
  app.use(express.json({ limit: "32kb" }));

  app.use("/api/admin", (request, response, next) => {
    if (!jwtSecret) {
      return response.status(503).json({ error: "Authentication is not configured" });
    }

    const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) {
      return response.status(401).json({ error: "Authentication required" });
    }

    try {
      const user = jwt.verify(token, jwtSecret);
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
    console.error(error);
    response.status(500).json({ error: "An unexpected error occurred" });
  });

  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3000);
  const mongoUri = process.env.MONGODB_URI;
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret || !mongoUri) {
    throw new Error("JWT_SECRET and MONGODB_URI must be configured");
  }

  await mongoose.connect(mongoUri);
  const app = createApp({ jwtSecret, ParkingSlot, PricingRule, ParkingSession, ParkingTransaction });
  app.listen(port, () => console.log(`Parking API listening on port ${port}`));
}