/**
 * Professional Mid-spec Strategy (STT + 阿里云 Qwen TTS)
 * Process: Voice input -> Browser-based STT -> Text to 阿里云 Qwen TTS model -> Voice output
 *
 * Format Support Notes:
 * - Audio Input: audio/webm;codecs=opus (preferred) or audio/mp4 (iOS/WeChat compatible)
 * - STT Output: Plain text
 * - TTS Input: Plain text
 * - TTS Output: audio/pcm, audio/wav, or audio/mp3 (depending on parameters.format)
 */

class ProfessionalMidStrategy {
    /**
     * Process voice input through STT and then 阿里云 Qwen TTS
     * @param {Object} params - The parameters
     * @param {string} params.audio - Base64 encoded audio with MIME prefix
     * @param {Object} params.config - Configuration object
     * @param {Array} params.history - Conversation history
     * @returns {Object} Result with both text and audio
     */
    static async process({ audio, config, history }) {
        console.log('🚀 [Professional Mid-Spec] Processing with STT + 阿里云 Qwen TTS pipeline...');
        
        try {
            // Validate input parameters
            if (!audio) {
                throw new Error('Missing audio input');
            }
            
            if (!config || !config.apiEndpoint) {
                throw new Error('Missing API configuration');
            }

            // Step 1: Send audio to STT endpoint to get transcription
            // The audio parameter is already Base64 encoded with MIME prefix
            // Format example: data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC8...
            const sttResponse = await fetch('/api/stt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    audio: audio
                })
            });
            
            if (!sttResponse.ok) {
                throw new Error(`STT service error: ${sttResponse.status} ${sttResponse.statusText}`);
            }
            
            const userText = await sttResponse.text();
            console.log('📝 Transcribed user text:', userText);

            // Step 2: Preprocess text
            // Clean common STT artifacts and filler words
            const cleanedText = userText
                .replace(/[呃嗯啊哦]/g, '') // Remove filler words
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();

            if (!cleanedText) {
                throw new Error('STT result is empty or invalid');
            }

            // Step 3: Send transcribed text to 阿里云 Qwen TTS model
            // Based on the documentation from:
            // https://bailian.console.aliyun.com/?spm=a2ty02.30260223.d_mcp-market.1.4f5574a1pF4NoR&tab=doc#/doc/?type=model&url=2938790
            const ttsResponse = await fetch(config.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                    'X-DashScope-Realtime-TTS': 'enable' // Required header for Qwen TTS
                },
                body: JSON.stringify({
                    model: config.model || 'qwen-tts-realtime',
                    input: {
                        text: cleanedText
                    },
                    parameters: {
                        voice: config.voice || 'Cherry',
                        format: config.response_format || 'pcm',
                        sample_rate: config.sample_rate || 24000
                    }
                })
            });
            
            if (!ttsResponse.ok) {
                throw new Error(`阿里云 Qwen TTS service error: ${ttsResponse.status} ${ttsResponse.statusText}`);
            }
            
            // Step 4: Convert TTS response to base64 audio with proper MIME type
            const audioBlob = await ttsResponse.blob();
            
            // Ensure correct MIME type prefix
            let mimeType = audioBlob.type || 'audio/pcm';
            if (!mimeType.startsWith('audio/')) {
                // If blob doesn't provide correct MIME type, set based on format parameter
                const format = config.response_format || 'pcm';
                mimeType = `audio/${format}`;
            }
            
            const ttsAudioBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    // Ensure Base64 string has correct MIME type prefix
                    let result = reader.result;
                    if (!result.startsWith('data:')) {
                        result = `data:${mimeType};base64,${result.split(',')[1] || result}`;
                    }
                    resolve(result);
                };
                reader.onerror = reject;
                reader.readAsDataURL(audioBlob);
            });
            
            // Return both the transcribed text and the TTS audio
            return {
                text: cleanedText,
                audio: ttsAudioBase64
            };
            
        } catch (error) {
            console.error('Professional Mid-spec strategy error:', error);
            
            // Provide specific error messages based on error type
            if (error.message.includes('STT')) {
                return {
                    text: "抱歉，我没有听清楚，请再试一次。",
                    audio: null
                };
            } else if (error.message.includes('阿里云 Qwen TTS')) {
                return {
                    text: "抱歉，我的声音系统出了点问题，请稍后再试。",
                    audio: null
                };
            } else {
                return {
                    text: `语音处理失败: ${error.message}`,
                    audio: null
                };
            }
        }
    }
    
    /**
     * Validate if the audio format is supported
     * @param {string} mimeType - MIME type of the audio
     * @returns {boolean} Whether the format is supported
     */
    static isAudioFormatSupported(mimeType) {
        const supportedFormats = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/mpeg',
            'audio/wav',
            'audio/pcm'
        ];
        
        return supportedFormats.includes(mimeType);
    }
    
    /**
     * Get recommended audio format based on browser capabilities
     * @returns {string} Recommended MIME type
     */
    static getRecommendedAudioFormat() {
        // Preferred formats in order
        const formats = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4'
        ];
        
        // Find first supported format
        for (const format of formats) {
            if (MediaRecorder.isTypeSupported(format)) {
                return format;
            }
        }
        
        // Fallback to empty string (let browser choose)
        return '';
    }
    
    /**
     * Get MIME type for TTS output based on format parameter
     * @param {string} format - TTS format parameter
     * @returns {string} Corresponding MIME type
     */
    static getMimeTypeForTTSFormat(format) {
        const mimeTypes = {
            'pcm': 'audio/pcm',
            'wav': 'audio/wav',
            'mp3': 'audio/mp3'
        };
        
        return mimeTypes[format] || 'audio/pcm';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfessionalMidStrategy;
}