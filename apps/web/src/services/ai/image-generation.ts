/**
 * Image Generation Service
 * Handles DALL-E image generation and processing
 */

import { openai } from "./openai";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { notifyUser } from "@/services/realtime";

export interface GenerateImageOptions {
  prompt: string;
  size?: "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792";
  quality?: "standard" | "hd";
  style?: "natural" | "vivid";
  numImages?: number;
  seed?: number;
}

export interface GeneratedImage {
  url: string;
  b64Json?: string;
  revisedPrompt?: string;
}

/**
 * Generate images using DALL-E 3
 */
export async function generateImages(
  userId: string,
  options: GenerateImageOptions,
  requestId?: string,
): Promise<GeneratedImage[]> {
  try {
    const {
      prompt,
      size = "1024x1024",
      quality = "standard",
      style = "natural",
      numImages = 1,
    } = options;

    logger.worker("image-gen", "started", {
      userId,
      promptLength: prompt.length,
      size,
      quality,
      numImages,
      requestId,
    });

    // Validate prompt
    if (prompt.length < 1 || prompt.length > 4000) {
      throw new Error("Prompt must be between 1 and 4000 characters");
    }

    // Call DALL-E 3 API
    const response = await openai.images.generate({
      model: "glm-5",
      prompt: sanitizePrompt(prompt),
      n: Math.min(Math.max(numImages, 1), 10), // Clamp to 1-10
      size: size as any,
      quality: quality as any,
      style: style as any,
      response_format: "url",
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("Failed to generate images");
    }

    // Process generated images
    const images: GeneratedImage[] = response.data.map((img: any) => ({
      url: img.url,
      revisedPrompt: img.revised_prompt,
    }));

    // Save to database
    for (const image of images) {
      try {
        await saveGeneratedImage(userId, prompt, image);
      } catch (err) {
        logger.error("Failed to save image record", err as Error, { userId });
      }
    }

    logger.worker("image-gen", "completed", {
      userId,
      imagesGenerated: images.length,
      requestId,
    });

    return images;
  } catch (error) {
    logger.error("Image generation failed", error as Error, {
      userId,
      requestId,
    });
    throw error;
  }
}

/**
 * Generate image with streaming progress updates via WebSocket
 */
export async function generateImagesWithProgress(
  userId: string,
  options: GenerateImageOptions,
  onProgress?: (message: string) => void,
): Promise<GeneratedImage[]> {
  try {
    if (onProgress) onProgress("Validating prompt...");
    const sanitized = sanitizePrompt(options.prompt);

    if (onProgress) onProgress("Sending request to DALL-E...");
    const images = await generateImages(userId, {
      ...options,
      prompt: sanitized,
    });

    if (onProgress) onProgress(`Generated ${images.length} image(s)`);

    return images;
  } catch (error) {
    if (onProgress) onProgress(`Error: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Save generated image metadata
 */
export async function saveGeneratedImage(
  userId: string,
  originalPrompt: string,
  image: GeneratedImage,
) {
  try {
    const encryptedUrl = await encrypt(image.url);

    await prisma.generatedImage.create({
      data: {
        userId,
        prompt: originalPrompt,
        revisedPrompt: image.revisedPrompt || originalPrompt,
        imageUrl: encryptedUrl,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error("Failed to save generated image", error as Error, { userId });
    throw error;
  }
}

/**
 * Get user's generated images
 */
export async function getUserGeneratedImages(
  userId: string,
  limit: number = 50,
  offset: number = 0,
) {
  try {
    const images = await prisma.generatedImage.findMany({
      where: { userId },
      orderBy: { generatedAt: "desc" },
      take: limit,
      skip: offset,
    });

    return images;
  } catch (error) {
    logger.error("Failed to fetch generated images", error as Error, {
      userId,
    });
    return [];
  }
}

/**
 * Delete generated image
 */
export async function deleteGeneratedImage(imageId: string, userId: string) {
  try {
    const image = await prisma.generatedImage.findUnique({
      where: { id: imageId },
    });

    if (!image || image.userId !== userId) {
      throw new Error("Image not found or access denied");
    }

    await prisma.generatedImage.delete({
      where: { id: imageId },
    });

    logger.worker("image-gen", "image_deleted", { userId, imageId });
  } catch (error) {
    logger.error("Failed to delete image", error as Error, { userId, imageId });
    throw error;
  }
}

/**
 * Sanitize and enhance prompt for better results
 */
export function sanitizePrompt(prompt: string): string {
  // Remove harmful content
  const harmfulPatterns = [
    /violence/gi,
    /illegal/gi,
    /hate/gi,
    /graphic/gi,
    /explicit/gi,
  ];

  let sanitized = prompt;

  for (const pattern of harmfulPatterns) {
    if (pattern.test(sanitized)) {
      // Log attempt
      logger.security("Potentially harmful image prompt detected", {
        reason: `Pattern matched: ${pattern}`,
      });
      throw new Error("Prompt contains inappropriate content");
    }
  }

  // Enhance prompt with quality keywords
  const enhancements = [
    "high quality",
    "detailed",
    "professional",
    "vivid colors",
    "well-composed",
  ];

  // Don't over-enhance if prompt is already descriptive
  if (sanitized.length < 100) {
    sanitized = `${sanitized}, ${enhancements[Math.floor(Math.random() * enhancements.length)]}`;
  }

  // Ensure proper length
  return sanitized.substring(0, 4000);
}

/**
 * Detect if user message is requesting image generation
 */
export function detectImageRequest(message: string): {
  isImageRequest: boolean;
  prompt?: string;
  style?: string;
  quality?: string;
} {
  const imageKeywords = [
    "generate image",
    "create image",
    "draw",
    "paint",
    "design",
    "illustrate",
  ];
  const lowerMessage = message.toLowerCase();

  const isImageRequest = imageKeywords.some((keyword) =>
    lowerMessage.includes(keyword),
  );

  if (!isImageRequest) {
    return { isImageRequest: false };
  }

  // Extract style if mentioned
  let style = "natural";
  if (
    lowerMessage.includes("realistic") ||
    lowerMessage.includes("photorealistic")
  ) {
    style = "natural";
  } else if (
    lowerMessage.includes("artistic") ||
    lowerMessage.includes("vivid")
  ) {
    style = "vivid";
  }

  // Extract quality if mentioned
  let quality = "standard";
  if (
    lowerMessage.includes("high quality") ||
    lowerMessage.includes("hd") ||
    lowerMessage.includes("ultra")
  ) {
    quality = "hd";
  }

  // Extract prompt (remove image generation keywords)
  let prompt = message;
  for (const keyword of imageKeywords) {
    prompt = prompt.replace(new RegExp(keyword, "gi"), "").trim();
  }

  return {
    isImageRequest: true,
    prompt: prompt || "a professional artwork",
    style: style as any,
    quality: quality as any,
  };
}

/**
 * Batch image generation for multiple prompts
 */
export async function generateImageBatch(
  userId: string,
  prompts: string[],
  options?: Partial<GenerateImageOptions>,
) {
  const results = [];

  for (const prompt of prompts) {
    try {
      const images = await generateImages(userId, {
        ...options,
        prompt,
      });
      results.push({ prompt, images, success: true });
    } catch (error) {
      results.push({
        prompt,
        error: (error as Error).message,
        success: false,
      });
    }
  }

  return results;
}

