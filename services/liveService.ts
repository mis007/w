
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createBlobFromFloat32, base64ToUint8Array, downsampleBuffer } from '../utils/audioUtils';
import { CONFIG, getNextApiKey } from '../config';

interface LiveServiceCallbacks {
  onOpen: () => void;
  onClose: () => void;
  onAudioData: (data: Uint8Array) => void; 
  onTranscription: (role: 'user' | 'model', text: string) => void;
  onInterruption: () => void; // New callback
  onError: (error: Error) => void;
}

export class LiveService {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isConnected: boolean = false;
  
  constructor() {
    const apiKey = getNextApiKey();
    if (!apiKey) {
        throw new Error("No API_KEY available");
    }
    
    const options: any = { apiKey: apiKey };
    
    if (CONFIG.API_BASE_URL && typeof CONFIG.API_BASE_URL === 'string' && CONFIG.API_BASE_URL.startsWith('http')) {
      let url = CONFIG.API_BASE_URL;
      if (url.endsWith('/')) {
        url = url.slice(0, -1);
      }
      options.baseUrl = url;
    }
    
    this.ai = new GoogleGenAI(options);
  }

  async connect(callbacks: LiveServiceCallbacks) {
    this.isConnected = true;
    
    // 1. Initialize Audio Contexts
    try {
        this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        await this.inputAudioContext.resume();
    } catch (e) {
        this.cleanup();
        callbacks.onError(new Error("Audio subsystem initialization failed"));
        return;
    }

    // 2. Request Microphone Access
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      this.cleanup();
      console.error("Microphone access denied:", e);
      callbacks.onError(new Error("Microphone access denied"));
      return;
    }

    // 3. Configure Live Session
    const config = {
      model: CONFIG.MODELS.LIVE,
      callbacks: {
        onopen: () => {
            console.log(`[LiveService] Connected to ${CONFIG.MODELS.LIVE}`);
            callbacks.onOpen();
            this.startAudioStreaming();
        },
        onmessage: async (message: LiveServerMessage) => {
          if (!this.isConnected) return;

          // Process Audio
          const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            try {
                const audioData = base64ToUint8Array(base64Audio);
                callbacks.onAudioData(audioData);
            } catch (err) {
                console.warn("[LiveService] Audio processing error", err);
            }
          }

          // Handle Interruption
          if (message.serverContent?.interrupted) {
              console.log("[LiveService] Interruption signal received");
              callbacks.onInterruption();
          }

          // Process Transcription
          if (message.serverContent?.outputTranscription?.text) {
             callbacks.onTranscription('model', message.serverContent.outputTranscription.text);
          }
          if (message.serverContent?.inputTranscription?.text) {
             callbacks.onTranscription('user', message.serverContent.inputTranscription.text);
          }
        },
        onclose: () => {
            console.log("[LiveService] Session closed");
            if (this.isConnected) {
                this.disconnect();
                callbacks.onClose();
            }
        },
        onerror: (err: any) => {
            console.error("[LiveService] Protocol Error:", err);
            if (this.isConnected) {
                this.disconnect();
                callbacks.onError(new Error("Connection protocol error"));
            }
        }
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: CONFIG.SPEECH.VOICE_NAME } }, 
        },
        systemInstruction: CONFIG.SYSTEM_INSTRUCTION,
        inputAudioTranscription: {}, 
        outputAudioTranscription: {},
      },
    };

    // 4. Initiate Connection
    try {
        this.sessionPromise = this.ai.live.connect(config);
        
        this.sessionPromise.catch((err) => {
            console.error("[LiveService] Connection Handshake Failed:", err);
            if (this.isConnected) {
                this.disconnect();
                callbacks.onError(err instanceof Error ? err : new Error("Connection failed"));
            }
        });
    } catch (e) {
        this.disconnect();
        callbacks.onError(e instanceof Error ? e : new Error("Failed to initiate connection"));
    }
  }

  disconnect() {
    this.isConnected = false;
    if (this.sessionPromise) {
      this.sessionPromise.then((session) => {
        session.close();
      }).catch(() => { /* Ignore errors during close */ });
      this.sessionPromise = null;
    }
    this.cleanup();
  }

  private cleanup() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess = null;
      this.processor = null;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.inputAudioContext && this.inputAudioContext.state !== 'closed') {
      this.inputAudioContext.close();
    }
    this.inputAudioContext = null;
  }

  private startAudioStreaming() {
    if (!this.inputAudioContext || !this.mediaStream) return;

    try {
        this.source = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
        this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

        this.processor.onaudioprocess = (e) => {
            if (!this.isConnected) return; 

            const inputData = e.inputBuffer.getChannelData(0);
            
            const actualSampleRate = this.inputAudioContext?.sampleRate || 16000;
            let processingData = inputData;
            
            if (actualSampleRate !== 16000) {
                processingData = downsampleBuffer(inputData, actualSampleRate, 16000);
            }

            const pcmBlob = createBlobFromFloat32(processingData, 16000);
            
            if (this.sessionPromise) {
                this.sessionPromise.then((session) => {
                    try {
                        session.sendRealtimeInput({ media: pcmBlob });
                    } catch (err) {
                        // Suppress errors if session is closing
                    }
                }).catch(() => {});
            }
        };

        this.source.connect(this.processor);
        this.processor.connect(this.inputAudioContext.destination);
    } catch (e) {
        console.error("[LiveService] Error starting audio stream", e);
    }
  }
}
