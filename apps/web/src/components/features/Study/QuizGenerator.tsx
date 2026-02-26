"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Loader2, CheckCircle, XCircle, SkipForward } from "lucide-react";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  difficulty: "easy" | "medium" | "hard";
}

interface UserAnswer {
  questionId: string;
  answer: number | null;
  correct: boolean;
}

interface QuizGeneratorProps {
  onGenerate: () => Promise<QuizQuestion[]>;
  loading?: boolean;
}

export function QuizGenerator({
  onGenerate,
  loading = false,
}: QuizGeneratorProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleGenerate = async () => {
    const quiz = await onGenerate();
    setQuestions(quiz);
    setCurrentIndex(0);
    setAnswers([]);
    setShowResults(false);
  };

  const handleSelectAnswer = (optionIndex: number) => {
    const question = questions[currentIndex];
    const isCorrect = optionIndex === question.correctAnswer;

    const newAnswers = [...answers];
    const existingAnswerIndex = newAnswers.findIndex(
      (a) => a.questionId === question.id,
    );

    if (existingAnswerIndex >= 0) {
      newAnswers[existingAnswerIndex] = {
        questionId: question.id,
        answer: optionIndex,
        correct: isCorrect,
      };
    } else {
      newAnswers.push({
        questionId: question.id,
        answer: optionIndex,
        correct: isCorrect,
      });
    }

    setAnswers(newAnswers);

    // Auto-advance after selection
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setShowResults(true);
      }
    }, 500);
  };

  if (questions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-600 mb-4">No quiz yet</p>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition"
        >
          {loading ? "Generating Quiz..." : "Generate Quiz"}
        </button>
      </Card>
    );
  }

  if (showResults) {
    const correctCount = answers.filter((a) => a.correct).length;
    const percentage = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="space-y-4">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="text-center">
            <p className="text-4xl font-bold text-blue-600 mb-2">
              {percentage}%
            </p>
            <p className="text-lg font-semibold text-gray-800 mb-2">
              {correctCount} out of {questions.length} correct
            </p>
            <div className="flex items-center justify-center gap-2">
              {percentage >= 80 ? (
                <>
                  <CheckCircle size={20} className="text-green-600" />
                  <span className="text-green-600 font-medium">Excellent!</span>
                </>
              ) : percentage >= 60 ? (
                <>
                  <Badge variant="warning">Good effort!</Badge>
                </>
              ) : (
                <>
                  <XCircle size={20} className="text-red-600" />
                  <span className="text-red-600 font-medium">Try again!</span>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Review Answers */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Review Answers</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {questions.map((question, idx) => {
              const userAnswer = answers.find(
                (a) => a.questionId === question.id,
              );
              const isCorrect = userAnswer?.correct;

              return (
                <div key={question.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    {isCorrect ? (
                      <CheckCircle
                        size={18}
                        className="text-green-600 flex-shrink-0 mt-0.5"
                      />
                    ) : (
                      <XCircle
                        size={18}
                        className="text-red-600 flex-shrink-0 mt-0.5"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {idx + 1}. {question.question}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Your answer: {question.options[userAnswer?.answer || 0]}
                      </p>
                      {!isCorrect && (
                        <p className="text-xs text-green-600 mt-1">
                          Correct: {question.options[question.correctAnswer]}
                        </p>
                      )}
                      {question.explanation && (
                        <p className="text-xs text-gray-600 mt-2 italic">
                          {question.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <button
          onClick={() => {
            setQuestions([]);
            setCurrentIndex(0);
            setAnswers([]);
            setShowResults(false);
          }}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
        >
          Generate New Quiz
        </button>
      </div>
    );
  }

  const question = questions[currentIndex];
  const userAnswer = answers.find((a) => a.questionId === question.id);

  return (
    <div className="space-y-4">
      {/* Progress */}
      <Card className="p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">
            Question {currentIndex + 1} of {questions.length}
          </p>
          <Badge
            variant={
              question.difficulty === "easy"
                ? "success"
                : question.difficulty === "medium"
                  ? "warning"
                  : "error"
            }
          >
            {question.difficulty.toUpperCase()}
          </Badge>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
      </Card>

      {/* Question */}
      <Card className="p-6 bg-blue-50">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          {question.question}
        </h2>

        {/* Options */}
        <div className="space-y-2 mb-4">
          {question.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectAnswer(idx)}
              className={`w-full p-3 text-left rounded-lg border-2 transition ${
                userAnswer?.answer === idx
                  ? userAnswer.correct
                    ? "border-green-500 bg-green-50"
                    : "border-red-500 bg-red-50"
                  : "border-gray-200 hover:border-blue-300"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    userAnswer?.answer === idx
                      ? userAnswer.correct
                        ? "border-green-500 bg-green-500"
                        : "border-red-500 bg-red-500"
                      : "border-gray-300"
                  }`}
                >
                  {userAnswer?.answer === idx && (
                    <span className="text-white font-semibold">
                      {userAnswer.correct ? "✓" : "✕"}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-900">{option}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
          }}
          disabled={currentIndex === 0}
          className="flex-1 py-2 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
        >
          Previous
        </button>
        <button
          onClick={() => {
            if (currentIndex < questions.length - 1) {
              setCurrentIndex(currentIndex + 1);
            } else {
              setShowResults(true);
            }
          }}
          className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
        >
          {currentIndex === questions.length - 1 ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
}
