/**
 * Abstractive Summarization with Timestamp Mapping
 * Generates condensed explanations for each scene and aligns highlights to transcript timestamps.
 */
import { openai } from "../ai/openai";
import { Scene } from "./scene-cluster";

export interface SceneSummary {
  sceneTitle: string;
  summary: string;
  startTimestamp?: number;
  endTimestamp?: number;
}

/**
 * Summarize each scene and map highlights to timestamps
 */
export async function summarizeScenesWithTimestamps(
  scenes: Scene[],
  transcriptSegments: Array<{ text: string; timestamp?: number }>,
): Promise<SceneSummary[]> {
  const summaries: SceneSummary[] = [];

  for (const scene of scenes) {
    const sceneText = scene.sentences.join(" ");
    const prompt = `Summarize the following scene in 2-3 sentences. Preserve meaning and narrative arc.\n\nScene Title: ${scene.title}\nScene Content: ${sceneText}`;
    const response = await openai.chat.completions.create({
      model: "glm-5",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });
    const summary = response.choices[0].message.content || "";

    // Map timestamps: find first/last segment in scene
    const firstSentence = scene.sentences[0];
    const lastSentence = scene.sentences[scene.sentences.length - 1];
    const startSegment = transcriptSegments.find((s) =>
      s.text.includes(firstSentence),
    );
    const endSegment = transcriptSegments
      .reverse()
      .find((s) => s.text.includes(lastSentence));

    summaries.push({
      sceneTitle: scene.title,
      summary,
      startTimestamp: startSegment?.timestamp,
      endTimestamp: endSegment?.timestamp,
    });
  }

  return summaries;
}

