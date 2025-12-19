
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
  
  // Retry Logic State
  private retryCount: number = 0;
  private maxRetries: number = 3;
  private retryDelayMs: number = 1000;

  // Configuration State
  private currentBaseUrl: string | undefined;
  private currentModel: string;

  constructor(baseUrl?: string, model?: string) {
    const apiKey = getNextApiKey();
    if (!apiKey) {
        throw new Error("No API_KEY available");
    }
    
    // Store configuration
    this.currentBaseUrl = baseUrl || CONFIG.API_BASE_URL;
    this.currentModel = model || CONFIG.MODELS.LIVE;

    const options: any = { apiKey: apiKey };
    
    if (this.currentBaseUrl && typeof this.currentBaseUrl === 'string' && this.currentBaseUrl.trim() !== '') {
      let url = this.currentBaseUrl;
      // Remove trailing slash if present
      if (url.endsWith('/')) {
        url = url.slice(0, -1);
      }
      options.baseUrl = url;
    }
    
    this.ai = new GoogleGenAI(options);
  }

  async connect(callbacks: LiveServiceCallbacks) {
    this.isConnected = true;
    this.retryCount = 0; // Reset retries on new manual connection attempt
    await this.attemptConnection(callbacks);
  }

  private async attemptConnection(callbacks: LiveServiceCallbacks) {
    // 1. Initialize Audio Contexts
    try {
        if (!this.inputAudioContext || this.inputAudioContext.state === 'closed') {
             this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        }
        await this.inputAudioContext.resume();
    } catch (e) {
        this.cleanup();
        this.handleConnectionError(new Error("Audio subsystem initialization failed"), callbacks);
        return;
    }

    // 2. Request Microphone Access
    try {
      if (!this.mediaStream) {
          this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (e) {
      this.cleanup();
      console.error("Microphone access denied:", e);
      callbacks.onError(new Error("Microphone access denied")); // No retry for permission denied
      return;
    }

    // 3. Configure Live Session
    const config = {
      model: this.currentModel, // Use the configured model
      callbacks: {
        onopen: () => {
            console.log(`[LiveService] Connected to ${this.currentModel} via ${this.currentBaseUrl || 'default'}`);
            this.retryCount = 0; // Reset retries on successful connection
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
            console.log("[LiveService] Session closed unexpectedly");
            // If onclose is triggered but isConnected is true, it means the user didn't initiate it.
            // We treat this as an error to trigger the retry logic.
            if (this.isConnected) {
                this.handleConnectionError(new Error("Session closed unexpectedly"), callbacks);
            }
        },
        onerror: (err: any) => {
            console.error("[LiveService] Protocol Error:", err);
            if (this.isConnected) {
                this.handleConnectionError(new Error("Connection protocol error"), callbacks);
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
                this.handleConnectionError(err instanceof Error ? err : new Error("Connection failed"), callbacks);
            }
        });
    } catch (e) {
        this.handleConnectionError(e instanceof Error ? e : new Error("Failed to initiate connection"), callbacks);
    }
  }

  private handleConnectionError(error: Error, callbacks: LiveServiceCallbacks) {
      if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          const delay = this.retryDelayMs * this.retryCount;
          console.log(`[LiveService] Connection failed, retrying in ${delay}ms... (Attempt ${this.retryCount}/${this.maxRetries})`);

          if (this.sessionPromise) {
              this.sessionPromise = null;
          }
          if (this.processor) {
              this.processor.disconnect();
              this.processor = null;
          }

          setTimeout(() => {
              if (this.isConnected) { // Only retry if user hasn't cancelled
                  this.attemptConnection(callbacks);
              }
          }, delay);
      } else {
          console.error("[LiveService] Max retries reached. Failing.");
          this.disconnect();
          callbacks.onError(error);
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
