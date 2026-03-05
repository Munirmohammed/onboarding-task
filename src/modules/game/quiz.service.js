const { notificationQueue } = require("../notification.queue");
const prisma = require("../prisma");

async function startQuiz(userId) {
  const session = await prisma.quizSession.create({ data: { userId } });
  return session;
}

async function getQuestion(sessionId) {
  const totalQuestions = await prisma.question.count();
  const randomIndex = Math.floor(Math.random() * totalQuestions);

  const question = await prisma.question.findFirst({
    skip: randomIndex,
  });
  if (!question) {
    throw new Error("No questions available");
  }
  await prisma.questionAttempt.create({
    data: { sessionId, questionId: question.id },
  });
  return {
    questionId: question.id,
    text: question.text,
    options: question.options,
  };
}

async function submitAnswer(sessionId, questionId, answer) {
  return await prisma.$transaction(async (tx) => {
    const attempt = await tx.questionAttempt.findUnique({
      where: {
        sessionId_questionId: {
          sessionId,
          questionId,
        },
      },
      include: { question: true, session: true },
    });

    if (!attempt) {
      throw new Error("Question was not requested for this session");
    }

    if (attempt.answered) {
      throw new Error("Question already answered");
    }
    const isCorrect = attempt.question.correctAnswer === answer;
    let newTotalScore;
    if (isCorrect) {
      await tx.quizSession.update({
        where: { id: sessionId },
        data: { score: { increment: 10 } },
      });

      const updatedUser = await tx.user.update({
        where: { id: attempt.session.userId },
        data: { totalScore: { increment: 10 } },
      });
      newTotalScore = updatedUser.totalScore;

      await tx.questionAttempt.update({
        where: {
          sessionId_questionId: {
            sessionId,
            questionId,
          },
        },
        data: { answered: true },
      });
      if (isCorrect && newTotalScore) {
        await notificationQueue.add(
          "sendScoreNotification",
          {
            userId: attempt.session.userId,
            score: newTotalScore,
          },
          {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 2000,
            },
          },
        );
      }
    }
    return { correct: isCorrect };
  });
}

//For testing purpose to add questions
async function createQuestion(text, options, correctAnswer) {
  if (!options.includes(correctAnswer)) {
    throw new Error("Correct answer must be one of the options.");
  }
  return await prisma.question.create({
    data: {
      text,
      options,
      correctAnswer,
    },
  });
}
module.exports = { startQuiz, getQuestion, submitAnswer, createQuestion };
