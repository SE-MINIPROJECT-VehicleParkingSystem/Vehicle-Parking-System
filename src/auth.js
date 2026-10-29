import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const tokenIssuer = "vehicle-parking-system";
export const tokenAudience = "vehicle-parking-system";

export function assertSecureJwtSecret(secret) {
  if (typeof secret !== "string" || Buffer.byteLength(secret, "utf8") < 32 || secret === "replace-with-a-private-random-secret") {
    throw new TypeError("JWT_SECRET must be a private value of at least 32 bytes");
  }
}

export function validateRegistrationInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Registration details must be an object");
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!name || name.length > 80) throw new TypeError("Name is required and must be 80 characters or fewer");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new TypeError("A valid email address is required");
  }

  const password = input.password;
  if (typeof password !== "string" || password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    throw new TypeError("Password must be at least 12 characters and no more than 72 bytes");
  }

  return { name, email, password };
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function provisionAdministrator(User, { email, password }) {
  const input = validateRegistrationInput({ name: "Administrator", email, password });
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    if (existing.role !== "Administrator") {
      throw new Error("Bootstrap email is already assigned to a non-administrator account");
    }
    return existing;
  }

  return User.create({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: "Administrator"
  });
}

export function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function signAccessToken(user, secret) {
  return jwt.sign(
    { role: user.role },
    secret,
    {
      algorithm: "HS256",
      audience: tokenAudience,
      expiresIn: "15m",
      issuer: tokenIssuer,
      subject: String(user._id)
    }
  );
}

export function verifyAccessToken(token, secret) {
  return jwt.verify(token, secret, {
    algorithms: ["HS256"],
    audience: tokenAudience,
    issuer: tokenIssuer
  });
}

export function createRoleGuard(secret, allowedRoles) {
  return (request, response, next) => {
    if (!secret) return response.status(503).json({ error: "Authentication is not configured" });

    const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return response.status(401).json({ error: "Authentication required" });

    try {
      const user = verifyAccessToken(token, secret);
      if (!allowedRoles.includes(user.role)) {
        return response.status(403).json({ error: "This role cannot perform the requested action" });
      }
      request.user = user;
      next();
    } catch {
      response.status(401).json({ error: "Invalid authentication token" });
    }
  };
}