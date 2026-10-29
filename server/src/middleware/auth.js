const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendError } = require('../utils/apiResponse');

async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.parking_token;
    if (!token) return sendError(res, 'Not authenticated.', 401);

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters.');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.sub);
    if (!user || !user.isActive) return sendError(res, 'Not authenticated.', 401);

    req.user = user;
    return next();
  } catch (error) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError' ||
      error.name === 'NotBeforeError'
    ) {
      return sendError(res, 'Not authenticated.', 401);
    }
    return next(error);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(res, 'You do not have permission to perform this action.', 403);
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };