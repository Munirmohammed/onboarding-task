const express = require("express");
const router = express.Router();
const quizController = require("./quiz.controller");

router.post("/start", quizController.startQuiz);
router.get("/:sessionId/question", quizController.getQuestion);
router.post("/:sessionId/answer", quizController.submitAnswer);
router.post("/add", quizController.createQuestion);
module.exports = router;
