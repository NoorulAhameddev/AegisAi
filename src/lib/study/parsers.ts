export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  difficulty: "easy" | "medium" | "hard";
  mastered: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // index in options
  explanation?: string;
  difficulty: "easy" | "medium" | "hard";
}

/**
 * Parse flashcards from markdown content formatted as:
 * Q: ...\nA: ... (repeated)
 */
export function parseFlashcards(markdown: string): Flashcard[] {
  const lines = markdown.split(/\r?\n/);
  const cards: Flashcard[] = [];
  let currentQ: string | null = null;
  let currentA: string | null = null;

  const pushCard = () => {
    if (currentQ && currentA) {
      cards.push({
        id: `${cards.length + 1}`,
        question: currentQ.trim(),
        answer: currentA.trim(),
        difficulty: "medium",
        mastered: false,
      });
    }
    currentQ = null;
    currentA = null;
  };

  for (const line of lines) {
    const qMatch = line.match(/^\s*Q:\s*(.*)$/i);
    const aMatch = line.match(/^\s*A:\s*(.*)$/i);
    if (qMatch) {
      // if a previous pair exists, push it
      if (currentQ !== null && currentA !== null) pushCard();
      currentQ = qMatch[1];
      currentA = null;
    } else if (aMatch) {
      currentA = aMatch[1];
      // push immediately after answer if next lines are empty
    } else if (line.trim() === "" && currentQ && currentA) {
      pushCard();
    }
  }
  // push trailing
  if (currentQ && currentA) pushCard();
  return cards;
}

/**
 * Parse quiz from markdown content formatted as:
 * Q1: Question\nA) ...\nB) ...\nC) ...\nD) ...\nCorrect: X
 */
export function parseQuiz(markdown: string): QuizQuestion[] {
  const blocks = markdown.split(/\n\s*Q\d+:/i).filter(Boolean);
  const questions: QuizQuestion[] = [];

  // Add back the leading 'Qn:' label if needed by parsing
  const qMatches = markdown.match(/Q\d+:/gi) || [];

  for (let i = 0; i < blocks.length; i++) {
    const label = qMatches[i] || `Q${i + 1}:`;
    const block = blocks[i];
    const full = `${label}${block}`;
    const lines = full.split(/\r?\n/);
    const qLine = lines[0].replace(/^Q\d+:\s*/i, "").trim();
    const options: string[] = [];
    let correctLetter: string | null = null;
    let explanation: string | undefined;

    for (let j = 1; j < lines.length; j++) {
      const line = lines[j];
      const opt = line.match(/^\s*([A-D])\)\s*(.*)$/i);
      const corr = line.match(/^\s*Correct:\s*([A-D])/i);
      const expl = line.match(/^\s*Explanation:\s*(.*)$/i);
      if (opt) {
        options.push(opt[2].trim());
      } else if (corr) {
        correctLetter = corr[1].toUpperCase();
      } else if (expl) {
        explanation = expl[1].trim();
      }
    }

    const correctIndex =
      correctLetter ? ["A", "B", "C", "D"].indexOf(correctLetter) : 0;
    questions.push({
      id: `${questions.length + 1}`,
      question: qLine,
      options,
      correctAnswer: correctIndex >= 0 ? correctIndex : 0,
      explanation,
      difficulty: "medium",
    });
  }

  return questions;
}
