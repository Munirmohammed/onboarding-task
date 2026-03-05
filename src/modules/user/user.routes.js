const router = require("express").Router();
const { use } = require("react");
const userController = require("./user.controller");

router.post("/send-otp", userController.sendOTP);
router.post("/reset-password", userController.resetPassword);
module.exports = router;
