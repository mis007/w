
import { GoogleGenAI, Modality } from '@google/genai';
import { CONFIG, getNextApiKey } from '../config';
import { blobToBase64, base64ToUint8Array } from '../utils/audioUtils';

// This service handles the "Elegant Degradation" strategy
// Flow: User Audio Blob -> Gemini Flash (ASR + Reasoning) -> Text -> Gemini TTS -> Audio Data (Uint8Array)
// Note: This service is stateless regarding AudioContext. It returns raw data for the main App to play.
export class TurnBasedService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = getNextApiKey();
    const options: any = { apiKey: apiKey || '' };
    if (CONFIG.API_BASE_URL) options.baseUrl = CONFIG.API_BASE_URL;
    this.ai = new GoogleGenAI(options);
  }

  async processAudioInput(audioBlob: globalThis.Blob): Promise<{ text: string; audioData: Uint8Array | null }> {
    try {
      const base64Audio = await blobToBase64(audioBlob);

      // Step 1: Send Audio to Gemini Flash to get a text response
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
            { text: "请听这段录音，并作为'村官小萌'回答用户。回答要简短热情。" }
          ]
        },
        config: {
          systemInstruction: CONFIG.SYSTEM_INSTRUCTION,
        }
      });

      const responseText = modelResponse.text || "抱歉，我没听清...";

      // Step 2: Convert the Text Response to Speech (TTS)
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
        console.error("TTS Generation failed:", ttsError);
      }

      return { text: responseText, audioData };

    } catch (error) {
      console.error("TurnBasedService processing failed:", error);
      throw error;
    }
  }
}
