
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const {
  normalizeEmail,
  isValidEmail,
  isStrongEnoughPassword
} = require('../utils/validators');

async function createStaff(req, res, next) {
  try {
    const name =
      typeof req.body.name === 'string'
        ? req.body.name.trim()
        : '';

    const email = normalizeEmail(req.body.email);

    const contactNumber =
      typeof req.body.contactNumber === 'string'
        ? req.body.contactNumber.trim()
        : '';

    const password = req.body.password;

    if (name.length < 2 || name.length > 50) {
      return sendError(res, 'Name must contain 2 to 50 characters.', 400);
    }

    if (!isValidEmail(email) || email.length > 100) {
      return sendError(res, 'Enter a valid email address.', 400);
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

    const existingUser = await User.findOne({ email }).lean();

    if (existingUser) {
      return sendError(
        res,
        'An account with this email already exists.',
        409
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const staff = await User.create({
      name,
      email,
      contactNumber,
      passwordHash,
      role: 'Staff',
      isActive: true
    });

    return sendSuccess(
      res,
      'Staff account created successfully.',
      {
        staff: {
          id: staff._id.toString(),
          name: staff.name,
          email: staff.email,
          contactNumber: staff.contactNumber,
          role: staff.role,
          isActive: staff.isActive
        }
      },
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

module.exports = { createStaff };
