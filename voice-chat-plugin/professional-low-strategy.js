/**
 * Professional Low-spec Strategy (STT + 文本模型 + 浏览器TTS)
 * Process: Voice input -> Browser-based STT -> Cheap text model -> Browser-native TTS output
 *
 * Supported Models:
 * - GLM-4.5-Flash (Zhipu AI free model)
 * - Qwen series text models
 * - ERNIE series text models
 *
 * Format Support Notes:
 * - Audio Input: audio/webm;codecs=opus (preferred) or audio/mp4 (iOS/WeChat compatible)
 * - Text Model Input: Plain text
 * - TTS Output: Browser SpeechSynthesis API
 */

class ProfessionalLowStrategy {
    /**
     * Process voice input through STT and then cheap text model with browser TTS output
     * @param {Object} params - The parameters
     * @param {string} params.audio - Base64 encoded audio with MIME prefix
     * @param {Object} params.config - Configuration object
     * @param {Array} params.history - Conversation history
     * @returns {string} Text response for browser TTS
     */
    static async process({ audio, config, history }) {
        console.log('🚀 [Professional Low-Spec] Processing with STT + 文本模型 + 浏览器TTS pipeline...');
        
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

            // Step 3: Build model request parameters
            // Build different request parameters based on model type
            let modelRequestParams = {};
            
            // Check if it's a GLM series model
            if (config.model && config.model.includes('glm')) {
                // GLM series models support deep thinking mode
                modelRequestParams = {
                    model: config.model || 'glm-4.5-flash',
                    messages: [
                        { role: "system", content: config.systemPrompt || "You are a helpful assistant." },
                        ...history,
                        { role: "user", content: cleanedText }
                    ],
                    thinking: {
                        type: "enabled" // Enable deep thinking mode
                    }
                };
            } else {
                // Other models use standard format
                modelRequestParams = {
                    model: config.model || 'text-model-default',
                    messages: [
                        { role: "system", content: config.systemPrompt || "You are a helpful assistant." },
                        ...history,
                        { role: "user", content: cleanedText }
                    ]
                };
            }

            // Step 4: Send transcribed text to cheap text model API
            const textModelResponse = await fetch(config.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify(modelRequestParams)
            });
            
            if (!textModelResponse.ok) {
                throw new Error(`Text model service error: ${textModelResponse.status} ${textModelResponse.statusText}`);
            }
            
            const data = await textModelResponse.json();
            
            // Validate response format
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid response format from text model');
            }
            
            const modelResponseText = data.choices[0].message.content;
            console.log('🤖 Model response:', modelResponseText);

            // Return text for browser-native TTS
            return modelResponseText;
            
        } catch (error) {
            console.error('Professional Low-spec strategy error:', error);
            
            // Provide specific error messages based on error type
            if (error.message.includes('STT')) {
                throw new Error('抱歉，我没有听清楚，请再试一次。');
            } else if (error.message.includes('text model')) {
                throw new Error('抱歉，我现在无法思考，请稍后再试。');
            } else {
                throw new Error(`语音处理失败: ${error.message}`);
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
            'audio/wav'
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
     * Check if the model is GLM series
     * @param {string} model - Model name
     * @returns {boolean} Whether the model is GLM series
     */
    static isGLMModel(model) {
        return model && model.includes('glm');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfessionalLowStrategy;
}