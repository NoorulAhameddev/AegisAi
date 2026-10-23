"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Loader2,
  CheckCircle,
  XCircle,
  SkipForward,
  Check,
  X,
} from "lucide-react";

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
        <p className="text-ink-400 mb-4">No quiz yet</p>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-brand text-ink-950 hover:bg-brand-dim font-mono text-[0.7rem] uppercase tracking-[0.12em] py-2 px-6 transition"
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
        <Card className="p-6 bg-ink-850 border-hair">
          <div className="text-center">
            <p className="font-display text-4xl font-medium tracking-tight text-brand mb-2">
              {percentage}%
            </p>
            <p className="text-lg font-medium text-ink-100 mb-2">
              {correctCount} out of {questions.length} correct
            </p>
            <div className="flex items-center justify-center gap-2">
              {percentage >= 80 ? (
                <>
                  <CheckCircle size={20} className="text-emerald-400" />
                  <span className="text-emerald-400 font-medium">
                    Excellent!
                  </span>
                </>
              ) : percentage >= 60 ? (
                <>
                  <Badge variant="warning">Good effort!</Badge>
                </>
              ) : (
                <>
                  <XCircle size={20} className="text-red-400" />
                  <span className="text-red-400 font-medium">Try again!</span>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Review Answers */}
        <Card className="p-4">
          <h3 className="font-display text-lg font-medium tracking-tight text-ink-100 mb-3">
            Review Answers
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {questions.map((question, idx) => {
              const userAnswer = answers.find(
                (a) => a.questionId === question.id,
              );
              const isCorrect = userAnswer?.correct;

              return (
                <div key={question.id} className="p-3 bg-ink-900 border border-hair">
                  <div className="flex items-start gap-2 mb-2">
                    {isCorrect ? (
                      <CheckCircle
                        size={18}
                        className="text-emerald-400 flex-shrink-0 mt-0.5"
                      />
                    ) : (
                      <XCircle
                        size={18}
                        className="text-red-400 flex-shrink-0 mt-0.5"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ink-100">
                        {idx + 1}. {question.question}
                      </p>
                      <p className="text-xs text-ink-500 mt-1">
                        Your answer: {question.options[userAnswer?.answer || 0]}
                      </p>
                      {!isCorrect && (
                        <p className="text-xs text-emerald-400 mt-1">
                          Correct: {question.options[question.correctAnswer]}
                        </p>
                      )}
                      {question.explanation && (
                        <p className="text-xs text-ink-400 mt-2 italic">
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
          className="w-full py-2 px-4 bg-brand text-ink-950 hover:bg-brand-dim font-mono text-[0.7rem] uppercase tracking-[0.12em] transition"
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
          <p className="text-sm font-medium text-ink-100">
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
        <div className="w-full h-2 bg-ink-800 overflow-hidden">
          <div
            className="h-full bg-brand transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
      </Card>

      {/* Question */}
      <Card className="p-6 bg-ink-850 border-hair">
        <h2 className="font-display text-lg font-medium tracking-tight text-ink-100 mb-6">
          {question.question}
        </h2>

        {/* Options */}
        <div className="space-y-2 mb-4">
          {question.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectAnswer(idx)}
              className={`w-full p-3 text-left border-2 transition ${
                userAnswer?.answer === idx
                  ? userAnswer.correct
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-red-500 bg-red-500/10"
                  : "border-ink-700 hover:border-brand"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-[2px] border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    userAnswer?.answer === idx
                      ? userAnswer.correct
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-red-500 bg-red-500"
                      : "border-ink-700"
                  }`}
                >
                  {userAnswer?.answer === idx && (
                    <span className="text-ink-950 font-semibold">
                      {userAnswer.correct ? <Check size={14} /> : <X size={14} />}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-ink-100">{option}</p>
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
          className="flex-1 py-2 px-4 border border-hair font-medium text-ink-100 hover:bg-ink-800 disabled:opacity-50 transition"
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
          className="flex-1 py-2 px-4 bg-brand text-ink-950 hover:bg-brand-dim font-medium transition"
        >
          {currentIndex === questions.length - 1 ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
}
