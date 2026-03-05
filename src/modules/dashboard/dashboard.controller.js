const dashboardService = require("./dashboard.service");

exports.getStats = async (req, res) => {
  try {
    const stats = await dashboardService.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getNotificationStats = async (req, res) => {
  try {
    const stats = await dashboardService.getNotificationStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
