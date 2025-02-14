const jwt = require("jsonwebtoken");

exports.generateToken = (userId, roleId, companyId) => {
  const payload = {
    roleId,
    userId,
    companyId,
  };
  return jwt.sign({ payload }, process.env.JWT_SECRET, {});
};
