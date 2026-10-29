import { randomUUID } from "node:crypto";

export class ParkingOperationError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function validateEntryInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Entry details must be an object");
  }

  const plateNumber = typeof input.plateNumber === "string"
    ? input.plateNumber.trim().toUpperCase().replace(/[\s-]/g, "")
    : "";
  const vehicleType = typeof input.vehicleType === "string" ? input.vehicleType.trim() : "";
  if (!/^[A-Z0-9]{3,20}$/.test(plateNumber)) {
    throw new TypeError("Plate number must contain 3 to 20 letters or numbers");
  }
  if (!vehicleType || vehicleType.length > 30) {
    throw new TypeError("Vehicle type is required and must be 30 characters or fewer");
  }

  return { plateNumber, vehicleType };
}

export function createParkingOperations({ ParkingSlot, ParkingSession, runTransaction, now = () => new Date() }) {
  return {
    async enter(input) {
      const { plateNumber, vehicleType } = validateEntryInput(input);
      const ticketNumber = randomUUID();

      try {
        return await runTransaction(async (session) => {
          const duplicateQuery = ParkingSession.exists({ plateNumber, active: true });
          if (session && typeof duplicateQuery.session === "function") duplicateQuery.session(session);
          if (await duplicateQuery) {
            throw new ParkingOperationError(409, "This vehicle already has an active parking session");
          }

          const slot = await ParkingSlot.findOneAndUpdate(
            { vehicleType, status: "Available" },
            { $set: { status: "Occupied", activeTicket: ticketNumber } },
            { new: true, sort: { slotNumber: 1 }, session }
          );
          if (!slot) throw new ParkingOperationError(409, "No available slot matches this vehicle type");

          const [parkingSession] = await ParkingSession.create([{
            ticketNumber,
            plateNumber,
            vehicleType,
            slotNumber: slot.slotNumber,
            enteredAt: now(),
            exitedAt: null,
            active: true
          }], { session });

          return { ticketNumber, slotNumber: slot.slotNumber, enteredAt: parkingSession.enteredAt };
        });
      } catch (error) {
        if (error.code === 11000) {
          throw new ParkingOperationError(409, "This vehicle or slot already has an active parking session");
        }
        throw error;
      }
    },

    async exit(ticketNumber) {
      if (typeof ticketNumber !== "string" || !/^[0-9a-f-]{36}$/i.test(ticketNumber)) {
        throw new TypeError("A valid parking ticket number is required");
      }

      return runTransaction(async (session) => {
        const exitedAt = now();
        const parkingSession = await ParkingSession.findOneAndUpdate(
          { ticketNumber, active: true, exitedAt: null },
          { $set: { active: false, exitedAt } },
          { new: true, session }
        );
        if (!parkingSession) throw new ParkingOperationError(404, "Active parking session not found");

        const slot = await ParkingSlot.findOneAndUpdate(
          { slotNumber: parkingSession.slotNumber, activeTicket: ticketNumber, status: "Occupied" },
          { $set: { status: "Available", activeTicket: null } },
          { new: true, session }
        );
        if (!slot) throw new ParkingOperationError(409, "Slot state is inconsistent; exit was not recorded");

        return { ticketNumber, slotNumber: slot.slotNumber, exitedAt };
      });
    }
  };
}