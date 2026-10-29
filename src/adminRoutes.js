import { Router } from "express";
import { validatePricingInput, validateSlotInput } from "./parkingSettings.js";

export function createAdminRouter({ ParkingSlot, PricingRule }) {
  const router = Router();

  router.get("/slots", async (_request, response, next) => {
    try {
      response.json(await ParkingSlot.find().sort({ slotNumber: 1 }));
    } catch (error) {
      next(error);
    }
  });

  router.put("/slots/:slotNumber", async (request, response, next) => {
    try {
      const slot = validateSlotInput({ ...request.body, slotNumber: request.params.slotNumber });
      const updated = await ParkingSlot.findOneAndUpdate(
        { slotNumber: slot.slotNumber },
        { $set: slot },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
      );
      response.json(updated);
    } catch (error) {
      if (error instanceof TypeError || error.name === "ValidationError") {
        return response.status(400).json({ error: error.message });
      }
      next(error);
    }
  });

  router.get("/pricing", async (_request, response, next) => {
    try {
      response.json(await PricingRule.find().sort({ vehicleType: 1 }));
    } catch (error) {
      next(error);
    }
  });

  router.put("/pricing/:vehicleType", async (request, response, next) => {
    try {
      const rule = validatePricingInput({ ...request.body, vehicleType: request.params.vehicleType });
      const updated = await PricingRule.findOneAndUpdate(
        { vehicleType: rule.vehicleType },
        { $set: rule },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
      );
      response.json(updated);
    } catch (error) {
      if (error instanceof TypeError || error.name === "ValidationError") {
        return response.status(400).json({ error: error.message });
      }
      next(error);
    }
  });

  return router;
}