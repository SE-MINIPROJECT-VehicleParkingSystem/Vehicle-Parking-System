import { Router } from "express";
import { createRoleGuard } from "./auth.js";
import { createParkingOperations } from "./parkingOperations.js";

export function createParkingRouter({ jwtSecret, ParkingSlot, ParkingSession, runTransaction }) {
  const router = Router();
  const operations = createParkingOperations({ ParkingSlot, ParkingSession, runTransaction });
  const staffAccess = createRoleGuard(jwtSecret, ["Gate Staff", "Administrator"]);

  router.post("/entries", staffAccess, async (request, response, next) => {
    try {
      response.status(201).json(await operations.enter(request.body));
    } catch (error) {
      if (error instanceof TypeError || error.status) {
        return response.status(error.status || 400).json({ error: error.message });
      }
      next(error);
    }
  });

  router.post("/exits", staffAccess, async (request, response, next) => {
    try {
      response.json(await operations.exit(request.body?.ticketNumber));
    } catch (error) {
      if (error instanceof TypeError || error.status) {
        return response.status(error.status || 400).json({ error: error.message });
      }
      next(error);
    }
  });

  return router;
}