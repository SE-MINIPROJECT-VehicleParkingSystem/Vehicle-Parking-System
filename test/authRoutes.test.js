import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import request from "supertest";
import { assertSecureJwtSecret, provisionAdministrator, verifyAccessToken, verifyPassword } from "../src/auth.js";
import { createApp } from "../src/server.js";

const jwtSecret = "auth-route-test-secret-at-least-32-bytes";

function makeAuthApp() {
  const users = [];
  const findOne = ({ email }) => {
    const query = {
      select: async () => users.find((user) => user.email === email) ?? null,
      then: (resolve, reject) => Promise.resolve(users.find((user) => user.email === email) ?? null).then(resolve, reject)
    };
    return query;
  };
  const User = {
    exists: async ({ email }) => users.some((user) => user.email === email),
    create: async (input) => {
      const user = { ...input, _id: `user-${users.length + 1}` };
      users.push(user);
      return user;
    },
    findOne
  };
  const inertModel = { find: () => ({ sort: async () => [] }), aggregate: async () => [] };
  const app = createApp({
    jwtSecret,
    User,
    ParkingSlot: inertModel,
    PricingRule: inertModel,
    ParkingSession: inertModel,
    ParkingTransaction: inertModel
  });
  return { app, users, User };
}

test("public registration creates only owners and stores a bcrypt hash", async () => {
  const { app, users } = makeAuthApp();
  const response = await request(app)
    .post("/api/auth/register")
    .send({ name: "Alex Owner", email: "ALEX@example.com", password: "long-enough-password-1", role: "Administrator" })
    .expect(201);

  assert.equal(response.body.user.role, "Owner");
  assert.equal(response.body.user.email, "alex@example.com");
  assert.equal(users[0].role, "Owner");
  assert.notEqual(users[0].passwordHash, "long-enough-password-1");
  assert.equal(await verifyPassword("long-enough-password-1", users[0].passwordHash), true);
  assert.equal("passwordHash" in response.body.user, false);
});

test("registration validates credentials and prevents duplicate accounts", async () => {
  const { app } = makeAuthApp();
  await request(app)
    .post("/api/auth/register")
    .send({ name: "Alex", email: "bad-email", password: "short" })
    .expect(400);

  const account = { name: "Alex", email: "alex@example.com", password: "long-enough-password-1" };
  await request(app).post("/api/auth/register").send(account).expect(201);
  await request(app).post("/api/auth/register").send(account).expect(409);
});

test("login issues a short-lived scoped token and returns a generic invalid-credential error", async () => {
  const { app } = makeAuthApp();
  await request(app)
    .post("/api/auth/register")
    .send({ name: "Alex Owner", email: "alex@example.com", password: "long-enough-password-1" })
    .expect(201);

  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: "ALEX@example.com", password: "long-enough-password-1" })
    .expect(200);
  assert.equal(login.body.expiresIn, 900);
  assert.equal(login.body.user.role, "Owner");
  assert.equal(login.headers["x-content-type-options"], "nosniff");
  assert.equal(verifyAccessToken(login.body.accessToken, jwtSecret).sub, "user-1");

  const denied = await request(app)
    .post("/api/auth/login")
    .send({ email: "alex@example.com", password: "wrong-password-value" })
    .expect(401);
  assert.deepEqual(denied.body, { error: "Invalid email or password" });
});

test("login limits repeated attempts and requires valid JWT issuer claims", async () => {
  const { app } = makeAuthApp();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await request(app).post("/api/auth/login").send({ email: "missing@example.com", password: "unknown-password" }).expect(401);
  }
  await request(app).post("/api/auth/login").send({ email: "missing@example.com", password: "unknown-password" }).expect(429);

  const wrongIssuer = jwt.sign({ role: "Administrator" }, jwtSecret, {
    algorithm: "HS256",
    audience: "vehicle-parking-system",
    expiresIn: "15m",
    issuer: "another-application",
    subject: "admin-1"
  });
  assert.throws(() => verifyAccessToken(wrongIssuer, jwtSecret));
});

test("JWT signing secret must be private and at least 32 bytes", () => {
  assert.throws(() => assertSecureJwtSecret("short-secret"), /at least 32 bytes/);
  assert.throws(() => assertSecureJwtSecret("replace-with-a-private-random-secret"), /at least 32 bytes/);
  assert.doesNotThrow(() => assertSecureJwtSecret(jwtSecret));
});

test("administrator bootstrap hashes the configured password and does not promote existing owners", async () => {
  const { User } = makeAuthApp();
  const admin = await provisionAdministrator(User, {
    email: "admin@example.com",
    password: "bootstrap-password-1"
  });
  assert.equal(admin.role, "Administrator");
  assert.equal(await verifyPassword("bootstrap-password-1", admin.passwordHash), true);

  await User.create({ _id: "owner-1", name: "Owner", email: "owner@example.com", role: "Owner" });
  await assert.rejects(() => provisionAdministrator(User, {
    email: "owner@example.com",
    password: "bootstrap-password-1"
  }), /non-administrator/);
});