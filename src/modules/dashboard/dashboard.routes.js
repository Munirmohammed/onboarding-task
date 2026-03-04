const router = require("express").Router();
const auth   = require("../../middleware/auth");
const ctrl   = require("./dashboard.controller");

// All dashboard routes require authentication
router.use(auth);

router.get("/stats",        ctrl.stats);        // platform-wide totals
router.get("/users",        ctrl.users);        // paginated user list
router.get("/scores",       ctrl.scores);       // paginated score feed
router.get("/sms",          ctrl.smsLogs);      // paginated SMS log
router.get("/coin-batches", ctrl.coinBatches);  // bulk upload history

module.exports = router;