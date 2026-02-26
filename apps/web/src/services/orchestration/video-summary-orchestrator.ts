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
  const edgeContext = await getEdgeContext();

  // 2. Ingest YouTube transcript
  const ingestionResult = await ingestYouTubeURL(youtubeUrl, {
    userId,
    projectId,
    enableRAG: false,
  });

  // 3. Fetch transcript and title directly
  // transcript is stored in file record, so fetch from DB or reconstruct
  // For now, fetch transcript and title using helper functions
  const videoId = ingestionResult.metadata?.videoId;
  let transcript = "";
  let title = "";
  if (videoId) {
    try {
      transcript = await await fetchYouTubeTranscript(videoId);
      title = await await fetchYouTubeTitle(videoId);
    } catch {
      transcript = "";
      title = "";
    }
  }

  // 4. Parse transcript into segments (stub: split by sentence)
  const transcriptSegments: Array<{ text: string; timestamp?: number }> =
    transcript
      ? transcript
          .split(/(?<=\.|!|\?)\s+/)
          .map((text) => ({ text, timestamp: undefined }))
      : [];

  // 5. Cluster scenes
  const scenes = await clusterScenes(transcriptSegments);

  // 6. Summarize scenes with timestamps
  const sceneSummaries = await summarizeScenesWithTimestamps(
    scenes,
    transcriptSegments,
  );

  return {
    url: youtubeUrl,
    title: title || edgeContext.title || "",
    sceneSummaries,
  };
}
