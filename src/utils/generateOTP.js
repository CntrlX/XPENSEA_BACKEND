exports.generateOTP = (count) => {
  const digits = Math.pow(10, count - 1); 
  return Math.floor(digits + Math.random() * 9 * digits).toString();
};