const { user } = require("../prisma");
const userService = require("./user.service");

async function sendOTP(req, res) {
  try {
    const { phone } = req.body;
    const result = await userService.sendOTP(phone);
    res.json(result);
  } catch (error) {
    return res.json({ message: error.message || "Internal server error" });
  }
}
async function resetPassword(req, res) {
  try {
    const { phone, code, newPassword } = req.body;
    const result = await userService.resetPassword(phone, code, newPassword);
    res.json(result);
  } catch (error) {
    return res.json({ message: error.message || "Internal server error" });
  }
}

module.exports = { sendOTP, resetPassword };
