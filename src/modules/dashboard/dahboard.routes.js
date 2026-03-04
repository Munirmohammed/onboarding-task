const express = require("express");
const router = express.Router();
const dashboardController = require("./dashboard.controller");

router.get("/stats", dashboardController.getStats);
router.get("/notification-stats", dashboardController.getNotificationStats);

module.exports = router;
