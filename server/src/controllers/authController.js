
const COOKIE_NAME = 'parking_token';

function cookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000
  };
}

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const {
  normalizeEmail,
  isValidEmail,
  isStrongEnoughPassword
} = require('../utils/validators');

const MAX_FAILED_ATTEMPTS = 3;
const LOCK_MINUTES = Number.parseInt(
  process.env.LOGIN_LOCK_MINUTES || '15',
  10
);

function safeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    contactNumber: user.contactNumber,
    role: user.role,
    isActive: user.isActive
  };
}

function createToken(user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters.');
  }

  return jwt.sign(
    { role: user.role },
    process.env.JWT_SECRET,
    {
      subject: user._id.toString(),
      expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    }
  );
}

async function register(req, res, next) {
  try {
    const name =
      typeof req.body.name === 'string'
        ? req.body.name.trim()
        : '';

    const email = normalizeEmail(req.body.email);
    const password = req.body.password;

    const contactNumber =
      typeof req.body.contactNumber === 'string'
        ? req.body.contactNumber.trim()
        : '';

    if (name.length < 2 || name.length > 50) {
      return sendError(
        res,
        'Name must contain 2 to 50 characters.',
        400
      );
    }

    if (!isValidEmail(email) || email.length > 100) {
      return sendError(
        res,
        'Enter a valid email address.',
        400
      );
    }

    if (!contactNumber || contactNumber.length > 15) {
      return sendError(
        res,
        'Contact number is required and must not exceed 15 characters.',
        400
      );
    }

    if (!isStrongEnoughPassword(password)) {
      return sendError(
        res,
        'Password must contain between 8 and 128 characters.',
        400
      );
    }

    if (await User.findOne({ email }).lean()) {
      return sendError(
        res,
        'An account with this email already exists.',
        409
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Public registration always creates an Owner.
    // Never accept req.body.role from the client.
    const user = await User.create({
      name,
      email,
      passwordHash,
      contactNumber,
      role: 'Owner'
    });

    return sendSuccess(
      res,
      'Registration successful.',
      { user: safeUser(user) },
      201
    );
  } catch (error) {
    if (error && error.code === 11000) {
      return sendError(
        res,
        'An account with this email already exists.',
        409
      );
    }

    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;

    if (
      !isValidEmail(email) ||
      typeof password !== 'string' ||
      !password
    ) {
      return sendError(
        res,
        'Invalid email or password.',
        401
      );
    }

    const user = await User.findOne({ email }).select(
      '+passwordHash +failedLoginAttempts +lockUntil'
    );

    // Use the same public error for unknown or inactive users.
    if (!user || !user.isActive) {
      return sendError(
        res,
        'Invalid email or password.',
        401
      );
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return sendError(
        res,
        'Account temporarily locked. Try again later.',
        423
      );
    }

    if (user.lockUntil && user.lockUntil <= new Date()) {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
    }

    const matches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!matches) {
      user.failedLoginAttempts =
        (user.failedLoginAttempts || 0) + 1;

      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(
          Date.now() + LOCK_MINUTES * 60 * 1000
        );
      }

      await user.save();

      if (user.lockUntil) {
        return sendError(
          res,
          'Account temporarily locked. Try again later.',
          423
        );
      }

      return sendError(
        res,
        'Invalid email or password.',
        401
      );
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;

    await user.save();

    const token = createToken(user);

    res.cookie(COOKIE_NAME, token, cookieOptions());

    return sendSuccess(
      res,
      'Login successful.',
      {
        user: safeUser(user)
      }
    );
  } catch (error) {
    return next(error);
  }
}

function logout(_req, res) {
  const isProduction = process.env.NODE_ENV === 'production';

  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/'
  });

  return sendSuccess(
    res,
    'Logged out successfully.',
    null
  );
}

async function getCurrentUser(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
      return sendError(
        res,
        'Not authenticated.',
        401
      );
    }

    if (
      !process.env.JWT_SECRET ||
      process.env.JWT_SECRET.length < 32
    ) {
      throw new Error(
        'JWT_SECRET must be at least 32 characters.'
      );
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.sub);

    if (!user || !user.isActive) {
      return sendError(
        res,
        'Not authenticated.',
        401
      );
    }

    return sendSuccess(
      res,
      'Session restored.',
      {
        user: safeUser(user)
      }
    );
  } catch (error) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError' ||
      error.name === 'NotBeforeError'
    ) {
      return sendError(
        res,
        'Not authenticated.',
        401
      );
    }

    return next(error);
  }
}

module.exports = {
  register,
  login,
  logout,
  getCurrentUser
};
