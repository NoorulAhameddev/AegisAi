'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { BookOpen, Plus, Trash2, RefreshCw } from 'lucide-react';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  mastered: boolean;
}

interface FlashcardGeneratorProps {
  onGenerate: () => Promise<Flashcard[]>;
  loading?: boolean;
}

export function FlashcardGenerator({ onGenerate, loading = false }: FlashcardGeneratorProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [tab, setTab] = useState<'study' | 'list'>('study');

  const handleGenerate = async () => {
    const cards = await onGenerate();
    setFlashcards(cards);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleMastered = () => {
    const updated = [...flashcards];
    updated[currentIndex].mastered = true;
    setFlashcards(updated);
    if (currentIndex < updated.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handleSkip = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const masteredCount = flashcards.filter((f) => f.mastered).length;
  const currentCard = flashcards[currentIndex];

  if (flashcards.length === 0) {
    return (
      <Card className="p-8 text-center">
        <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 mb-4">No flashcards yet</p>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition"
        >
          {loading ? 'Generating...' : 'Generate Flashcards'}
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Progress</p>
          <p className="text-sm text-gray-500">
            {masteredCount} of {flashcards.length} mastered
          </p>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${(masteredCount / flashcards.length) * 100}%` }}
          />
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('study')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
            tab === 'study'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Study Mode
        </button>
        <button
          onClick={() => setTab('list')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
            tab === 'list'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Cards
        </button>
      </div>

      {/* Study Mode */}
      {tab === 'study' && currentCard && (
        <div className="space-y-4">
          <p className="text-sm text-center text-gray-500">
            Card {currentIndex + 1} of {flashcards.length}
          </p>

          {/* Flashcard */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="h-64 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg cursor-pointer transform transition-transform hover:scale-105 p-8 flex items-center justify-center shadow-lg"
          >
            <div className="text-center text-white">
              <p className="text-sm opacity-70 mb-4">
                {isFlipped ? 'ANSWER' : 'QUESTION'}
              </p>
              <p className="text-2xl font-semibold leading-relaxed">
                {isFlipped ? currentCard.answer : currentCard.question}
              </p>
              <p className="text-sm opacity-50 mt-4">Click to flip</p>
            </div>
          </div>

          {/* Difficulty Badge */}
          <div className="flex justify-center">
            <Badge
              variant={
                currentCard.difficulty === 'easy'
                  ? 'success'
                  : currentCard.difficulty === 'medium'
                    ? 'warning'
                    : 'error'
              }
            >
              {currentCard.difficulty.toUpperCase()}
            </Badge>
          </div>

          {/* Actions */}
          {isFlipped && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSkip}
                className="py-2 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Not Yet
              </button>
              <button
                onClick={handleMastered}
                className="py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
              >
                Mastered
              </button>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {tab === 'list' && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {flashcards.map((card, idx) => (
            <Card key={card.id} className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{card.question}</p>
                  <p className="text-sm text-gray-600 mt-1">{card.answer}</p>
                </div>
                <div className="flex gap-2 ml-2">
                  {card.mastered && (
                    <Badge variant="success" className="text-xs">
                      ✓
                    </Badge>
                  )}
                  <Badge
                    variant={card.difficulty === 'easy' ? 'success' : 'warning'}
                    className="text-xs"
                  >
                    {card.difficulty}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Regenerate */}
      {masteredCount === flashcards.length && (
        <button
          onClick={() => {
            setFlashcards([]);
            setCurrentIndex(0);
          }}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition"
        >
          <RefreshCw size={16} />
          Generate New Flashcards
        </button>
      )}
    </div>
  );
}
