import { GoogleGenAI, Type } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to convert Blob to Base64 (minus header)
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
};

/**
 * General OCR for Document Conversion (PDF/Word)
 */
export const extractDocumentText = async (base64Data: string, mimeType: string): Promise<string> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: "Transcribe the text in this image exactly as it appears. Preserve layout using Markdown where possible. Do not include introductory text." }
      ]
    }
  });
  return response.text || "";
};

/**
 * Table Extraction
 */
export const extractTableData = async (base64Data: string, mimeType: string): Promise<any> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: "Extract the table data from this image." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          headers: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          rows: {
            type: Type.ARRAY,
            items: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        },
        required: ["headers", "rows"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse table JSON", e);
    throw new Error("Could not extract table data.");
  }
};

/**
 * ID Card Scanner
 */
export const scanIDCard = async (base64Data: string, mimeType: string): Promise<any> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: "Analyze this ID card or document. Extract key information into a structured format. If a field is not found, leave it empty or omit." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          idNumber: { type: Type.STRING },
          address: { type: Type.STRING },
          birthDate: { type: Type.STRING },
          gender: { type: Type.STRING },
          expiryDate: { type: Type.STRING },
          rawText: { type: Type.STRING, description: "All visible text on the card" }
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse ID Card JSON", e);
    throw new Error("Could not scan ID card.");
  }
};

/**
 * Handwritten Text OCR
 */
export const extractHandwriting = async (base64Data: string, mimeType: string): Promise<string> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: "Transcribe the handwritten text in this image. Output only the transcribed text." }
      ]
    }
  });
  return response.text || "";
};

/**
 * Remove Handwriting (Image Editing)
 */
export const removeHandwritingFromImage = async (base64Data: string, mimeType: string): Promise<string> => {
  const ai = getAiClient();
  
  // Using gemini-2.5-flash-image for image editing capabilities
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: "Remove all handwritten text from this image. Keep printed text, forms, lines, and background intact. The result should look like a clean template." }
      ]
    }
  });

  // Extract the generated image from the response
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    // Check if both inlineData and data are present to satisfy TS string return type
    if (part.inlineData && part.inlineData.data) {
      return part.inlineData.data;
    }
  }
  
  throw new Error("No image generated.");
};