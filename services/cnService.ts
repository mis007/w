
import { GoogleGenAI, Modality } from '@google/genai';
import { CONFIG, getNextApiKey } from '../config';
import { blobToBase64, base64ToUint8Array } from '../utils/audioUtils';

/**
 * CN Dedicated Service (CN专线服务)
 * 
 * Strategy: "WeChat Style" Interaction (Half-Duplex)
 * Technology: Pure HTTP/REST (No WebSockets)
 * Goal: Maximum stability in weak network / restricted environments.
 * 
 * Isolation: This service operates completely independently from LiveService.
 */
export class CNService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = getNextApiKey();
    const options: any = { apiKey: apiKey || '' };
    
    // Critical: Use the CN-specific Base URL if configured
    // This allows routing traffic through a domestic proxy/relay in the future without affecting the Global line.
    if (CONFIG.CN_API_BASE_URL) {
        options.baseUrl = CONFIG.CN_API_BASE_URL;
    } else if (CONFIG.API_BASE_URL) {
        options.baseUrl = CONFIG.API_BASE_URL;
    }
    
    this.ai = new GoogleGenAI(options);
  }

  /**
   * Process Audio Request (Atomic Operation)
   * Designed to be robust: Upload -> Wait -> Download. 
   * Less sensitive to jitter than streaming.
   */
  async processAudioInput(audioBlob: globalThis.Blob): Promise<{ text: string; audioData: Uint8Array | null }> {
    console.log("[CNService] Processing audio via CN Stable Line...");
    
    try {
      const base64Audio = await blobToBase64(audioBlob);

      // Step 1: ASR + Reasoning (Multimodal)
      // Using gemini-2.5-flash for speed and cost-effectiveness on the "Lite" line
      const modelResponse = await this.ai.models.generateContent({
        model: CONFIG.MODELS.TEXT,
        contents: {
          parts: [
            { 
                inlineData: { 
                    mimeType: audioBlob.type || 'audio/webm', 
                    data: base64Audio 
                } 
            },
            { text: "请简短回答用户（中文）。" } // Strict instruction for short, stable responses
          ]
        },
        config: {
          systemInstruction: CONFIG.SYSTEM_INSTRUCTION,
          // Lower temperature for more deterministic/stable answers in "Official" mode
          temperature: 0.7, 
        }
      });

      const responseText = modelResponse.text || "信号接收完毕，请讲...";

      // Step 2: TTS Generation
      // Separate try-catch block so text survives even if audio download fails (common in weak net)
      let audioData: Uint8Array | null = null;
      try {
        const ttsResponse = await this.ai.models.generateContent({
          model: CONFIG.MODELS.TTS,
          contents: { parts: [{ text: responseText }] },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: CONFIG.SPEECH.VOICE_NAME } }
            }
          }
        });

        const ttsBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (ttsBase64) {
            audioData = base64ToUint8Array(ttsBase64);
        }
      } catch (ttsError) {
        console.warn("[CNService] TTS fetch failed (Weak Network suspected):", ttsError);
      }

      return { text: responseText, audioData };

    } catch (error) {
      console.error("[CNService] Critical Failure:", error);
      throw error; // Let the UI handle the error toast
    }
  }
}
