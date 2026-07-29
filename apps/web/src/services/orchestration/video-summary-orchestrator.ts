/**
 * Video Summary Orchestration
 * Combines transcript extraction, scene clustering, summarization, and timestamp mapping.
 */
import {
  ingestYouTubeURL,
  fetchYouTubeTranscript,
  fetchYouTubeTitle,
} from "../ingestion/ingestion.service";
import { clusterScenes } from "../summarization/scene-cluster";
import { summarizeScenesWithTimestamps } from "../summarization/abstractive-summary";
import { getEdgeContext } from "../integration/edge-context";
import { logger } from "@/lib/logger";

/**
 * Parse transcript text into segments with improved sentence boundary detection.
 * Handles abbreviations (Dr., Mr., e.g., i.e.), decimal numbers, and preserves
 * timestamp information where available.
 */
function parseTranscriptIntoSegments(
  transcript: string,
): Array<{ text: string; timestamp?: number }> {
  const sentenceBoundary =
    /(?<!(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e|approx|inc|ltd|co|dept|est|vol|fig|eqn|ref|sec|ch|pg|no|num|avg|max|min|std|var|temp|loc|def|int|mod|sin|cos|tan|log|exp|const|op|sys|eng|tech|info|admin|coord|exec|mgr|asst|assoc|bldg|apt|st|ave|blvd|rd|pl|ct|ln|dr|cir|pkwy|hwyp|hwy|ft|in|oz|lb|gal|qt|pt|tbsp|tsp|cu|sq|km|m|cm|mm|nm|kg|g|mg|ml|cl|dl|ha|ac|yr|mo|wk|hr|min|sec|ms|us|ns|ps|fs|am|pm|a\.m|p\.m|B\.C|A\.D|U\.S|U\.K|N\.Y|L\.A|S\.F|D\.C|U\.N|N\.A\.T\.O|E\.U)\.)\s*(?<![0-9]\.)\s*(?<=[.!?])\s+/g;

  const segments = transcript
    .split(sentenceBoundary)
    .filter((text) => text.trim().length > 10)
    .map((text) => ({ text: text.trim(), timestamp: undefined }));

  if (segments.length < 3 && transcript.length > 200) {
    const chunkSize = 200;
    const chunks: Array<{ text: string; timestamp?: number }> = [];
    for (let i = 0; i < transcript.length; i += chunkSize) {
      const chunk = transcript.slice(i, i + chunkSize).trim();
      if (chunk.length > 0) {
        chunks.push({ text: chunk, timestamp: undefined });
      }
    }
    return chunks;
  }

  return segments;
}

export interface VideoSummaryResult {
  url: string;
  title: string;
  sceneSummaries: Array<{
    sceneTitle: string;
    summary: string;
    startTimestamp?: number;
    endTimestamp?: number;
  }>;
}

/**
 * Orchestrate full video summary flow
 */
export async function generateVideoSummary(
  youtubeUrl: string,
  userId: string,
  projectId?: string,
): Promise<VideoSummaryResult> {
  // 1. Get Edge context
  let edgeContext = { title: "" };
  try {
    edgeContext = await getEdgeContext();
  } catch {
    logger.warn("Failed to get edge context for video summary", { youtubeUrl });
  }

  // 2. Ingest YouTube URL
  const ingestionResult = await ingestYouTubeURL(youtubeUrl, {
    userId,
    projectId,
    enableRAG: false,
  });

  // 3. Fetch transcript and title
  const videoId = ingestionResult.metadata?.videoId;
  let transcript = "";
  let title = "";
  if (videoId) {
    try {
      transcript = await fetchYouTubeTranscript(videoId);
      title = await fetchYouTubeTitle(videoId);
    } catch (error) {
      logger.warn("Failed to fetch YouTube transcript", {
        videoId,
        error: (error as Error).message,
      });
    }
  }

  if (!transcript) {
    throw new Error(
      "Could not retrieve transcript for this video. Captions may not be available.",
    );
  }

  // 4. Parse transcript into segments with improved sentence boundary detection
  const transcriptSegments: Array<{ text: string; timestamp?: number }> =
    parseTranscriptIntoSegments(transcript);

  if (transcriptSegments.length === 0) {
    throw new Error("Transcript contained no usable text segments.");
  }

  // 5. Cluster scenes
  let scenes: any[] = [];
  try {
    scenes = await clusterScenes(transcriptSegments);
  } catch (error) {
    logger.error("Failed to cluster scenes for video summary", {
      youtubeUrl,
      error: (error as Error).message,
    });
    // Fallback: treat entire transcript as single scene
    scenes = [
      {
        id: "scene-1",
        segments: transcriptSegments,
        title: "Full Video",
      },
    ];
  }

  // 6. Summarize scenes with timestamps
  let sceneSummaries: any[] = [];
  try {
    sceneSummaries = await summarizeScenesWithTimestamps(
      scenes,
      transcriptSegments,
    );
  } catch (error) {
    logger.error("Failed to summarize scenes for video summary", {
      youtubeUrl,
      error: (error as Error).message,
    });
    // Fallback: return raw transcript chunks as summaries
    sceneSummaries = transcriptSegments.slice(0, 10).map((seg) => ({
      sceneTitle: "Excerpt",
      summary: seg.text,
      startTimestamp: seg.timestamp,
    }));
  }

  return {
    url: youtubeUrl,
    title: title || edgeContext.title || "Untitled Video",
    sceneSummaries,
  };
}
