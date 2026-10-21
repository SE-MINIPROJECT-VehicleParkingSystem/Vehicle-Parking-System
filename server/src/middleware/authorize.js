
const { sendError } = require('../utils/apiResponse');

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 'You do not have permission to access this resource.', 403);
    }

    next();
  };
}

module.exports = authorize;
