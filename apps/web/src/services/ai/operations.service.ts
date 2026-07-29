/**
 * AI Operations Service
 * Centralized service for all AI-powered transformations
 */

import { openai } from "../ai/openai";
import { prisma } from "@/lib/prisma";
import type { NoteType } from "@prisma/client";

export interface AIOperationResult {
  content: string;
  noteId?: string;
  tokensUsed?: number;
}

/**
 * Generate short summary (5 bullet points)
 */
export async function generateShortSummary(
  text: string,
  userId: string,
  projectId?: string,
): Promise<AIOperationResult> {
  const prompt = `Summarize the following content in 5 concise bullet points. Focus on the most important facts and key takeaways.\n\nContent:\n${text.slice(0, 12000)}`;

  const response = await openai.chat.completions.create({
    model: "openai/gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  const content = response.choices[0].message.content || "";

  // Save to database
  const note = await prisma.note.create({
    data: {
      userId,
      projectId,
      type: "SUMMARY_SHORT",
      title: "Short Summary",
      content,
    },
  });

  return {
    content,
    noteId: note.id,
    tokensUsed: response.usage?.total_tokens,
  };
}

/**
 * Generate detailed summary
 */
export async function generateDetailedSummary(
  text: string,
  userId: string,
  projectId?: string,
): Promise<AIOperationResult> {
  const prompt = `Provide a comprehensive, detailed summary of the following content. Include:
- Main topic and purpose
- Key arguments and evidence
- Important details and examples
- Conclusions and implications

Content:\n${text.slice(0, 12000)}`;

  const response = await openai.chat.completions.create({
    model: "openai/gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  const content = response.choices[0].message.content || "";

  const note = await prisma.note.create({
    data: {
      userId,
      projectId,
      type: "SUMMARY_DETAILED",
      title: "Detailed Summary",
      content,
    },
  });

  return {
    content,
    noteId: note.id,
    tokensUsed: response.usage?.total_tokens,
  };
}

/**
 * Generate structured notes (organized by sections)
 */
export async function generateStructuredNotes(
  text: string,
  userId: string,
  projectId?: string,
): Promise<AIOperationResult> {
  const prompt = `Create structured, well-organized notes from the following content. Use clear headings and subheadings. Format as markdown.

Content:\n${text.slice(0, 12000)}`;

  const response = await openai.chat.completions.create({
    model: "openai/gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  const content = response.choices[0].message.content || "";

  const note = await prisma.note.create({
    data: {
      userId,
      projectId,
      type: "STRUCTURED_NOTES",
      title: "Structured Notes",
      content,
    },
  });

  return {
    content,
    noteId: note.id,
    tokensUsed: response.usage?.total_tokens,
  };
}

/**
 * Extract bullet points
 */
export async function extractBulletPoints(
  text: string,
  userId: string,
  projectId?: string,
): Promise<AIOperationResult> {
  const prompt = `Extract the most important points from the following content as a clear, organized bullet list.

Content:\n${text.slice(0, 12000)}`;

  const response = await openai.chat.completions.create({
    model: "openai/gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });

  const content = response.choices[0].message.content || "";

  const note = await prisma.note.create({
    data: {
      userId,
      projectId,
      type: "BULLET_POINTS",
      title: "Key Points",
      content,
    },
  });

  return {
    content,
    noteId: note.id,
    tokensUsed: response.usage?.total_tokens,
  };
}

/**
 * Extract key concepts
 */
export async function extractKeyConcepts(
  text: string,
  userId: string,
  projectId?: string,
): Promise<AIOperationResult> {
  const prompt = `Identify and explain the key concepts, terms, and ideas from the following content.

Content:\n${text.slice(0, 12000)}`;

  const response = await openai.chat.completions.create({
    model: "openai/gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  const content = response.choices[0].message.content || "";

  const note = await prisma.note.create({
    data: {
      userId,
      projectId,
      type: "KEY_CONCEPTS",
      title: "Key Concepts",
      content,
    },
  });

  return {
    content,
    noteId: note.id,
    tokensUsed: response.usage?.total_tokens,
  };
}

/**
 * Generate glossary
 */
export async function generateGlossary(
  text: string,
  userId: string,
  projectId?: string,
): Promise<AIOperationResult> {
  const prompt = `Create a glossary of important terms and definitions from the following content. Format as a clear list with term and definition.

Content:\n${text.slice(0, 12000)}`;

  const response = await openai.chat.completions.create({
    model: "openai/gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });

  const content = response.choices[0].message.content || "";

  const note = await prisma.note.create({
    data: {
      userId,
      projectId,
      type: "GLOSSARY",
      title: "Glossary",
      content,
    },
  });

  return {
    content,
    noteId: note.id,
    tokensUsed: response.usage?.total_tokens,
  };
}

/**
 * Generate examples
 */
export async function generateExamples(
  text: string,
  userId: string,
  projectId?: string,
): Promise<AIOperationResult> {
  const prompt = `Generate clear, practical examples that illustrate the concepts discussed in the following content.

Content:\n${text.slice(0, 12000)}`;

  const response = await openai.chat.completions.create({
    model: "openai/gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
  });

  const content = response.choices[0].message.content || "";

  const note = await prisma.note.create({
    data: {
      userId,
      projectId,
      type: "EXAMPLES",
      title: "Examples",
      content,
    },
  });

  return {
    content,
    noteId: note.id,
    tokensUsed: response.usage?.total_tokens,
  };
}

/**
 * Generate ELI5 explanation (Explain Like I'm 5)
 */
export async function generateELI5(
  text: string,
  userId: string,
  projectId?: string,
): Promise<AIOperationResult> {
  const prompt = `Explain the following content in simple, easy-to-understand language, as if explaining to a 5-year-old. Use analogies and simple examples.

Content:\n${text.slice(0, 12000)}`;

  const response = await openai.chat.completions.create({
    model: "openai/gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const content = response.choices[0].message.content || "";

  const note = await prisma.note.create({
    data: {
      userId,
      projectId,
      type: "ELI5",
      title: "Simple Explanation",
      content,
    },
  });

  return {
    content,
    noteId: note.id,
    tokensUsed: response.usage?.total_tokens,
  };
}

/**
 * Rewrite/transform content
 */
export async function rewriteContent(
  text: string,
  style: string = "professional",
): Promise<string> {
  const stylePrompts: Record<string, string> = {
    professional: "Rewrite in a professional, formal tone",
    casual: "Rewrite in a casual, friendly tone",
    academic: "Rewrite in an academic, scholarly tone",
    simplified: "Simplify and make more accessible",
    expanded: "Expand with more detail and explanation",
  };

  const prompt = `${stylePrompts[style] || stylePrompts.professional}:\n\n${text.slice(0, 8000)}`;

  const response = await openai.chat.completions.create({
    model: "openai/gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return response.choices[0].message.content || "";
}

/**
 * Generate flashcards from content
 */
export async function generateFlashcards(
  text: string,
  userId: string,
  projectId?: string,
): Promise<AIOperationResult> {
  const prompt = `Create flashcards from the following content. Format as:

Q: [Question]
A: [Answer]

Make them clear, concise, and focused on key information.

Content:\n${text.slice(0, 12000)}`;

  const response = await openai.chat.completions.create({
    model: "openai/gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
  });

  const content = response.choices[0].message.content || "";

  const note = await prisma.note.create({
    data: {
      userId,
      projectId,
      type: "FLASHCARDS",
      title: "Flashcards",
      content,
    },
  });

  return {
    content,
    noteId: note.id,
    tokensUsed: response.usage?.total_tokens,
  };
}

/**
 * Generate MCQ quiz
 */
export async function generateQuiz(
  text: string,
  userId: string,
  projectId?: string,
): Promise<AIOperationResult> {
  const prompt = `Create a multiple-choice quiz with 10 questions from the following content. Format as:

Q1: [Question]
A) [Option]
B) [Option]
C) [Option]
D) [Option]
Correct: [Letter]

Content:\n${text.slice(0, 12000)}`;

  const response = await openai.chat.completions.create({
    model: "openai/gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
  });

  const content = response.choices[0].message.content || "";

  const note = await prisma.note.create({
    data: {
      userId,
      projectId,
      type: "QUIZ",
      title: "Quiz",
      content,
    },
  });

  return {
    content,
    noteId: note.id,
    tokensUsed: response.usage?.total_tokens,
  };
}

/**
 * Generate question bank
 */
export async function generateQuestions(
  text: string,
  userId: string,
  projectId?: string,
): Promise<AIOperationResult> {
  const prompt = `Generate a comprehensive question bank from the following content. Include:
- Factual recall questions
- Conceptual understanding questions
- Application questions
- Analysis questions

Content:\n${text.slice(0, 12000)}`;

  const response = await openai.chat.completions.create({
    model: "openai/gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
  });

  const content = response.choices[0].message.content || "";

  const note = await prisma.note.create({
    data: {
      userId,
      projectId,
      type: "QUESTIONS",
      title: "Question Bank",
      content,
    },
  });

  return {
    content,
    noteId: note.id,
    tokensUsed: response.usage?.total_tokens,
  };
}

/**
 * Generate exam-oriented notes
 */
export async function generateExamNotes(
  text: string,
  userId: string,
  projectId?: string,
): Promise<AIOperationResult> {
  const prompt = `Create exam-focused study notes from the following content. Emphasize:
- Key facts and definitions
- Important formulas or concepts
- Common exam questions
- Critical points to remember

Content:\n${text.slice(0, 12000)}`;

  const response = await openai.chat.completions.create({
    model: "openai/gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  const content = response.choices[0].message.content || "";

  const note = await prisma.note.create({
    data: {
      userId,
      projectId,
      type: "EXAM_NOTES",
      title: "Exam Notes",
      content,
    },
  });

  return {
    content,
    noteId: note.id,
    tokensUsed: response.usage?.total_tokens,
  };
}
