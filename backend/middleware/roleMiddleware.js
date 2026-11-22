const { errorResponse } = require('../utils/apiResponse');

/**
 * Restrict route access to specified roles
 * @param  {...string} roles - e.g. 'admin', 'cashier'
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, 'Unauthorized access.');
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(
        res,
        403,
        `Access denied. Role '${req.user.role}' is not authorized to access this resource.`
      );
    }

    next();
  };
};

module.exports = {
  authorize,
};
