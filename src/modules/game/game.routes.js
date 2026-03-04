const router = require("express").Router();
const auth = require("../../middleware/auth");
const ctrl = require("./game.controller");

router.post("/play",        auth, ctrl.play);
router.get("/scores",       auth, ctrl.myScores);
router.get("/leaderboard",       ctrl.leaderboard);

module.exports = router;