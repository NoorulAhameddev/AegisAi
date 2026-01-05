import { Tool } from "./index";
import { openai } from "../lib/openai";

export const ImageGeneratorTool: Tool = {
    name: "generate_image",
    description: "Generates an image based on a text prompt using DALL-E 3. Use this when the user asks to 'draw', 'paint', or 'create an image'.",
    parameters: {
        type: "object",
        properties: {
            prompt: {
                type: "string",
                description: "A detailed description of the image to generate."
            },
            style: {
                type: "string",
                enum: ["vivid", "natural"],
                description: "The style of the generated image. vivid causes the model to generate a hyper-real and dramatic image. natural causes the model to produce more non-hyper-real images."
            }
        },
        required: ["prompt"]
    },
    execute: async ({ prompt, style }) => {
        try {
            const response = await openai.images.generate({
                model: "dall-e-3",
                prompt,
                n: 1,
                size: "1024x1024",
                quality: "standard",
                style: style || "vivid",
            });

            if (!response.data || !response.data[0]) throw new Error("No image generated.");
            return response.data[0].url;
        } catch (e: any) {
            console.error("Image generation failed:", e);
            return `Error generating image: ${e.message}`;
        }
    }
};
