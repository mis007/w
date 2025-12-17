
import { Blob } from '@google/genai';

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper: Convert generic Blob to Base64 string
export function blobToBase64(blob: globalThis.Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:audio/webm;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  // CRITICAL STABILITY FIX:
  // 1. Ensure even byte length for Int16 (drop last byte if odd)
  // 2. Copy to a new ArrayBuffer to guarantee byte alignment (avoids "start offset..." errors)
  
  let safeData = data;
  if (data.byteLength % 2 !== 0) {
      safeData = data.subarray(0, data.byteLength - 1);
  }

  // Create a new aligned buffer
  const buffer = new ArrayBuffer(safeData.byteLength);
  const view = new Uint8Array(buffer);
  view.set(safeData);
  
  const dataInt16 = new Int16Array(buffer);
  const frameCount = dataInt16.length / numChannels;
  const audioBuffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert PCM16 (-32768 to 32767) to Float32 (-1.0 to 1.0)
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return audioBuffer;
}

export function float32ToPCM16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array;
}

export function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (inputRate === outputRate) return buffer;
  if (inputRate < outputRate) return buffer; 
  
  const sampleRateRatio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    const nextOriginalIndex = i * sampleRateRatio;
    const index1 = Math.floor(nextOriginalIndex);
    const index2 = Math.ceil(nextOriginalIndex);
    const fraction = nextOriginalIndex - index1;
    
    const val1 = buffer[index1] || 0;
    const val2 = buffer[index2] || val1;
    
    result[i] = val1 + (val2 - val1) * fraction;
  }
  return result;
}

export function createBlobFromFloat32(data: Float32Array, sampleRate: number): Blob {
    const int16 = float32ToPCM16(data);
    const base64 = arrayBufferToBase64(int16.buffer);
    return {
        data: base64,
        mimeType: `audio/pcm;rate=${sampleRate}`,
    };
}
