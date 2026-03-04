const authService = require("./auth.service");

async function register(req, res) {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ message: "Phone and password required" });
    }
    const user = await authService.registerUser(phone, password);
    return res.status(201).json(user);
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Internal server error" });
  }
}

async function login(req, res) {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ message: "Phone and password required" });
    }
    const result = await authService.loginUser(phone, password);
    return res.status(200).json(result);
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Internal server error" });
  }
}

module.exports = { register, login };
