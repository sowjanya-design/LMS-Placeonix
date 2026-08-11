const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const Role = require('../models/Role');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Verifies JWT and attaches user to request.
 * Reads token from Authorization header or httpOnly cookie.
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return next(new AppError('Not authorized — please log in', 401));
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Session expired — please log in again', 401));
    }
    return next(new AppError('Invalid token', 401));
  }

  const user = await User.findById(decoded.id).select('-password');
  if (!user) {
    return next(new AppError('User no longer exists', 401));
  }
  if (user.status !== 'active') {
    return next(new AppError(`Account is ${user.status}`, 403));
  }

  req.user = user;
  next();
});

/**
 * Role-based access control.
 * Usage: router.get('/', protect, authorize('admin', 'mentor'), handler)
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError('Not authenticated', 401));
  if (req.user.role === 'super_admin' || roles.includes(req.user.role)) {
    return next();
  }
  return next(
    new AppError(`Forbidden — role '${req.user.role}' cannot access this resource`, 403)
  );
};

/**
 * Allow only the resource owner OR admin.
 * Expects req.params.userId or req.params.id to match req.user._id
 */
const ownerOrAdmin = (paramKey = 'id') => (req, res, next) => {
  const targetId = req.params[paramKey];
  if (req.user.role === 'super_admin' || req.user.role === 'admin') return next();
  if (String(req.user._id) === String(targetId)) return next();
  return next(new AppError('Forbidden — you can only access your own resources', 403));
};

/**
 * Fine-grained, permission-code based access control — a second layer on top
 * of authorize(...roles). admin always passes (super-role), everyone else is
 * checked against their Role document's `permissions` array. If no Role
 * document exists yet for a role code (fresh install before seeding), this
 * fails closed rather than silently allowing — seed roles before relying on
 * can() in production.
 *
 * Usage: router.patch('/:id/role', protect, can('users.manage_role'), handler)
 */
const can = (...permissionCodes) => async (req, res, next) => {
  if (!req.user) return next(new AppError('Not authenticated', 401));
  if (req.user.role === 'super_admin' || req.user.role === 'admin') return next();

  const role = await Role.findOne({ code: req.user.role });
  const granted = role?.permissions || [];
  const hasPermission = permissionCodes.some((code) => granted.includes(code));

  if (!hasPermission) {
    return next(
      new AppError(`Forbidden — role '${req.user.role}' lacks permission: ${permissionCodes.join(', ')}`, 403)
    );
  }
  next();
};

module.exports = { protect, authorize, ownerOrAdmin, can };
