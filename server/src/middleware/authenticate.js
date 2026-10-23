const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendError } = require('../utils/apiResponse');

async function authenticate(req, res, next) {
  try {
    const token = req.cookies?.parking_token;

    if (!token) {
      return sendError(res, 'Authentication required.', 401);
    }

    if (
      !process.env.JWT_SECRET ||
      process.env.JWT_SECRET.length < 32
    ) {
      return sendError(
        res,
        'Authentication configuration error.',
        500
      );
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (!decoded.sub) {
      return sendError(
        res,
        'Invalid authentication token.',
        401
      );
    }

    const user = await User.findById(decoded.sub);

    if (!user || !user.isActive) {
      return sendError(
        res,
        'Authentication required.',
        401
      );
    }

    req.user = {
      id: user._id.toString(),
      role: user.role
    };

    next();
  } catch (error) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError' ||
      error.name === 'NotBeforeError'
    ) {
      return sendError(
        res,
        'Invalid or expired token.',
        401
      );
    }

    return next(error);
  }
}

module.exports = authenticate;