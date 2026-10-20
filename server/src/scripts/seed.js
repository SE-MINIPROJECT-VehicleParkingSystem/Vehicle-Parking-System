require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const ParkingSlot = require('../models/ParkingSlot');

async function ensureUser({ name, email, password, contactNumber, role }) {
  if (!name || !email || !password || !contactNumber) throw new Error(`Missing seed settings for ${role}; check server/.env.`);
  email = email.trim().toLowerCase();
  if (await User.findOne({ email })) { console.log(`${role} already exists: ${email}`); return; }
  // Seeded privileged accounts are created outside the public registration endpoint.
  await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), contactNumber, role });
  console.log(`Created ${role}: ${email}`);
}

async function seedSlots() {
  const zones = (process.env.SEED_ZONES || 'A,B,C').split(',').map(x => x.trim().toUpperCase()).filter(Boolean);
  const count = Number.parseInt(process.env.SLOTS_PER_ZONE || '10', 10);
  if (!Number.isInteger(count) || count < 1 || count > 500) throw new Error('SLOTS_PER_ZONE must be 1–500.');
  const vehicleTypes = ['Two-wheeler', 'Four-wheeler', 'Other'];
  let created = 0;
  for (const zone of zones) {
    for (let n = 1; n <= count; n++) {
      const slotNumber = String(n);
      const slotId = `${zone}${String(n).padStart(3, '0')}`;
      if (!(await ParkingSlot.exists({ $or: [{ slotId }, { zone, slotNumber }] }))) {
        await ParkingSlot.create({ slotId, zone, slotNumber, vehicleType: vehicleTypes[(n - 1) % vehicleTypes.length], status: 'Available' });
        created++;
      }
    }
  }
  console.log(`Created ${created} slots.`);
}

(async () => {
  try {
    await connectDB();
    await ensureUser({ name: process.env.SEED_ADMIN_NAME, email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD, contactNumber: process.env.SEED_ADMIN_CONTACT, role: 'Admin' });
    await ensureUser({ name: process.env.SEED_STAFF_NAME, email: process.env.SEED_STAFF_EMAIL, password: process.env.SEED_STAFF_PASSWORD, contactNumber: process.env.SEED_STAFF_CONTACT, role: 'Staff' });
    await seedSlots();
  } catch (error) {
    console.error(`Seed failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
