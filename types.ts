
export enum AgentState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
}

export enum ServiceMode {
  GLOBAL = 'GLOBAL', // Gemini Live (WebSocket) - High Bandwidth, Low Latency
  CN = 'CN',         // CN Dedicated Line (HTTP/Rest) - High Stability, Weak Net Optimized
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface AudioConfig {
  sampleRate: number;
}
