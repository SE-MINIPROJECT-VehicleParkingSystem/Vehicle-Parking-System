import { Router } from "express";
import rateLimit from "express-rate-limit";
import { hashPassword, signAccessToken, validateRegistrationInput, verifyPassword } from "./auth.js";

function publicUser(user) {
  return { id: String(user._id), name: user.name, email: user.email, role: user.role };
}

export function createAuthRouter({ User, jwtSecret }) {
  const router = Router();
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts. Try again later." }
  });

  router.post("/register", async (request, response, next) => {
    try {
      const input = validateRegistrationInput(request.body);
      const exists = await User.exists({ email: input.email });
      if (exists) return response.status(409).json({ error: "An account with this email already exists" });

      const user = await User.create({
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        role: "Owner"
      });
      response.status(201).json({ user: publicUser(user) });
    } catch (error) {
      if (error instanceof TypeError) return response.status(400).json({ error: error.message });
      if (error.code === 11000) return response.status(409).json({ error: "An account with this email already exists" });
      next(error);
    }
  });

  router.post("/login", loginLimiter, async (request, response, next) => {
    try {
      if (!jwtSecret) return response.status(503).json({ error: "Authentication is not configured" });
      const email = typeof request.body?.email === "string" ? request.body.email.trim().toLowerCase() : "";
      const password = request.body?.password;
      if (!email || typeof password !== "string") {
        return response.status(400).json({ error: "Email and password are required" });
      }

      const user = await User.findOne({ email }).select("+passwordHash");
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return response.status(401).json({ error: "Invalid email or password" });
      }

      response.json({ accessToken: signAccessToken(user, jwtSecret), expiresIn: 900, user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}