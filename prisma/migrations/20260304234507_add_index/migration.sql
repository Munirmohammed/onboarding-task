-- CreateIndex
CREATE INDEX "QuestionAttempt_sessionId_idx" ON "QuestionAttempt"("sessionId");

-- CreateIndex
CREATE INDEX "QuizSession_userId_idx" ON "QuizSession"("userId");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_totalScore_idx" ON "User"("totalScore");
