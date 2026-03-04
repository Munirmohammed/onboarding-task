const quizService = require("./quiz.service");
async function startQuiz(req, res) {
  try {
    const session = await quizService.startQuiz(req.userId);
    res.json(session);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function getQuestion(req, res) {
  try {
    const { sessionId } = req.params;
    const question = await quizService.getQuestion(sessionId);
    res.json(question);
  } catch (error) {
    return res.json({ message: error.message || "Internal server error" });
  }
}

async function submitAnswer(req, res) {
  try {
    const { sessionId } = req.params;
    const { questionId, answer } = req.body;
    const result = await quizService.submitAnswer(
      sessionId,
      questionId,
      answer,
    );
    res.json(result);
  } catch (error) {
    return res.json({ message: error.message || "Internal server error" });
  }
}
async function createQuestion(req, res) {
  try {
    const { text, options, correctAnswer } = req.body;
    const question = await quizService.createQuestion(
      text,
      options,
      correctAnswer,
    );
    res.status(201).json(question);
  } catch (error) {
    return res.json({ message: error.message || "Internal server error" });
  }
}
module.exports = { startQuiz, getQuestion, submitAnswer, createQuestion };
