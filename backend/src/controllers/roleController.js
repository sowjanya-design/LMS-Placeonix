const Role = require("../models/Role");
const Permission = require("../models/Permission");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { auditLog } = require("../utils/audit");

// @desc   List roles
// @route  GET /api/v1/roles
exports.listRoles = asyncHandler(async (req, res) => {
  const roles = await Role.find().sort("code");
  return ApiResponse.success(res, 200, "Roles fetched", { roles });
});

// @desc   List the permission catalog
// @route  GET /api/v1/roles/permissions
exports.listPermissions = asyncHandler(async (req, res) => {
  const permissions = await Permission.find().sort("module code");
  return ApiResponse.success(res, 200, "Permissions fetched", { permissions });
});

// @desc   Update a role's permission grants
// @route  PATCH /api/v1/roles/:code
exports.updateRolePermissions = asyncHandler(async (req, res, next) => {
  const { permissions } = req.body;
  if (!Array.isArray(permissions)) {
    return next(
      new AppError("permissions must be an array of permission codes", 400),
    );
  }

  const validCodes = new Set(
    (await Permission.find().select("code")).map((p) => p.code),
  );
  const invalid = permissions.filter((p) => !validCodes.has(p));
  if (invalid.length) {
    return next(
      new AppError(`Unknown permission code(s): ${invalid.join(", ")}`, 400),
    );
  }

  const role = await Role.findOne({ code: req.params.code.toLowerCase() });
  if (!role) return next(new AppError("Role not found", 404));

  // 'admin' always has every permission (can() hardcodes this bypass) — editing
  // its grants here would be misleading, so it's excluded.
  if (role.code === "admin") {
    return next(
      new AppError(
        "The 'admin' role's permissions cannot be edited — it always has full access",
        400,
      ),
    );
  }

  const oldValue = { permissions: role.permissions };
  role.permissions = permissions;
  await role.save();

  auditLog(req, {
    module: "roles",
    action: "update_permissions",
    resource: "Role",
    resourceId: role._id,
    oldValue,
    newValue: { permissions },
  });

  return ApiResponse.success(
    res,
    200,
    `Permissions updated for role '${role.code}'`,
    { role },
  );
});
