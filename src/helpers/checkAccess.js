const Role = require("../modules/role/roleModel");

const checkAccess = async (roleId, access) => {
  const findRole = await Role.findById(roleId);
  if (!findRole) {
    return false;
  }

  if (access === "permissions") {
    return findRole.permissions;
  } else if (access === "locationAccess") {
    return findRole.locationAccess;
  }
};

module.exports = checkAccess;