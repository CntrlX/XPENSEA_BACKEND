const jwt = require("jsonwebtoken");

exports.generateToken = (userId, roleId, companyId) => {
  const payload = {
    userId,
  };
  return jwt.sign({ payload }, process.env.JWT_SECRET, {});
};
