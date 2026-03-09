import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
let aiInitializationError: string | null = null;

if (API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  } catch (e) {
    console.error("Failed to initialize GoogleGenAI:", e);
    aiInitializationError = e instanceof Error ? e.message : "Unknown error during AI SDK initialization.";
  }
} else {
  aiInitializationError = "API_KEY environment variable is not set.";
}

const checkAiInitialized = () => {
  if (!ai) {
    console.error("Gemini AI SDK not initialized.", aiInitializationError);
    throw new Error(
      `Image generation service is not configured. ${aiInitializationError || "Please ensure the API key is set."}`
    );
  }
};


export const generateImageWithGemini = async (prompt: string): Promise<string> => {
  checkAiInitialized();
  if (!ai) throw new Error("AI SDK not available after check."); // Should not happen

  try {
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: prompt,
      config: { 
        numberOfImages: 1, 
        outputMimeType: 'image/png'
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image?.imageBytes) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/png;base64,${base64ImageBytes}`;
    } else {
      console.error("No image data found in API response:", response);
      throw new Error("Failed to generate image: No image data received from the API.");
    }
  } catch (error) {
    console.error("Error generating image with Gemini (Imagen):", error);
    if (error instanceof Error) {
      throw new Error(`Imagen API Error: ${error.message || "An unknown error occurred"}`);
    }
    throw new Error("An unexpected error occurred while generating the image via Imagen.");
  }
};

export const describeImageWithGemini = async (base64ImageDataUrl: string): Promise<string> => {
  checkAiInitialized();
  if (!ai) throw new Error("AI SDK not available after check."); // Should not happen

  try {
    const [header, base64Data] = base64ImageDataUrl.split(',');
    if (!header || !base64Data) throw new Error("Invalid image data URL format for description.");
    
    const mimeTypeMatch = header.match(/data:(.*);base64/);
    if (!mimeTypeMatch || !mimeTypeMatch[1]) throw new Error("Could not extract MIME type from image data URL for description.");
    const mimeType = mimeTypeMatch[1];

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    };
    const textPart = {
      text: "Describe this image in detail for use as a scene background. Focus on key visual elements, objects, atmosphere, artistic style, and overall composition. This description will be used to help generate a new art piece."
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17', // Multimodal model for understanding images
      contents: { parts: [imagePart, textPart] },
    });

    if (response.text) {
      return response.text;
    } else {
      console.error("No text description found in API response for image:", response);
      throw new Error("Failed to describe image: No text description received from the API.");
    }

  } catch (error) {
    console.error("Error describing image with Gemini (Multimodal):", error);
    if (error instanceof Error) {
      throw new Error(`Gemini API Error (Describe Image): ${error.message || "An unknown error occurred"}`);
    }
    throw new Error("An unexpected error occurred while describing the image via Gemini.");
  }
};