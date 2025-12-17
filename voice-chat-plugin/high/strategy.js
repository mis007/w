/**
 * 高配版策略 (High-Spec Strategy)
 * 基于智谱AI GLM-Realtime模型实现实时语音对话
 * 
 * 特点：
 * 1. 使用WebSocket实现低延迟实时通信
 * 2. 支持音频和视频两种交互模式
 * 3. 支持语音打断功能
 * 4. 提供高质量的语音输出
 */

(function () {
    window.strategies = window.strategies || {};

    /**
     * 🔴 3. 高配版 (High-Spec / Pro)
     * 场景：浏览器 -> WebSocket -> GLM-Realtime模型 -> WebSocket -> 浏览器
     * 特点：实时语音对话，支持音频和视频模式，体验最佳
     * 
     * 支持的模型：
     * - GLM-Realtime-Flash (推荐)
     * - GLM-Realtime-Air
     * 
     * 格式支持说明：
     * - 音频输入格式: audio/wav or audio/pcm (Base64编码)
     * - 视频输入格式: image/jpeg (Base64编码)
     * - 音频输出格式: audio/mp3 or audio/pcm (Base64编码)
     * - 文本输出格式: 纯文本
     */
    window.strategies.high = async ({ audio, config, history }) => {
        console.log('🚀 [High-Spec] 正在使用高配版 (GLM-Realtime) 策略...');

        try {
            // 高配版使用WebSocket进行实时通信，不直接处理audio参数
            // audio参数在实时通信中通过WebSocket流式传输
            // 这里仅作占位，实际实现在VoiceChat.js中通过WebSocket处理
            
            // 构建会话配置
            const sessionConfig = {
                modalities: config.modalities || ["text", "audio"],
                instructions: config.systemPrompt || "你是一个智能语音助手，请用简洁明了的语言回答用户问题。",
                voice: config.voice || "tongtong",
                output_audio_format: config.output_audio_format || "pcm",
                input_audio_format: config.input_audio_format || "wav",
                turn_detection: {
                    type: config.vad_type || "server_vad",
                    threshold: config.vad_threshold || 0.5,
                    prefix_padding_ms: config.prefix_padding_ms || 300,
                    silence_duration_ms: config.silence_duration_ms || 500
                },
                tools: config.tools || [],
                tool_choice: config.tool_choice || "auto",
                temperature: config.temperature || 0.8,
                max_response_output_tokens: config.max_tokens || "inf"
            };

            // 返回配置信息，由VoiceChat.js处理实际的WebSocket连接
            return {
                text: "已连接到GLM-Realtime模型，开始实时语音对话",
                config: sessionConfig,
                model: config.model || "glm-realtime-flash"
            };
        } catch (error) {
            console.error('高配版策略执行失败:', error);
            return {
                text: `连接失败: ${error.message}`,
                audio: null
            };
        }
    };
})();