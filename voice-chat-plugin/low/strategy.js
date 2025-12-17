(function () {
    window.strategies = window.strategies || {};

    /**
     * 🟢 1. 低配版 (Low-Spec / Classic)
     * 场景：浏览器 -> 文本模型 -> 浏览器自带TTS
     * 特点：成本最低，使用浏览器原生TTS功能
     * 
     * 支持的模型：
     * - GLM-4.5-Flash (智谱AI免费模型)
     * - Qwen系列文本模型
     * - ERNIE系列文本模型
     * 
     * 格式支持说明：
     * - 音频输入格式: audio/webm;codecs=opus (首选) 或 audio/mp4 (iOS/微信兼容)
     * - 文本模型输入: 纯文本
     * - TTS输出: 浏览器SpeechSynthesis API
     */
    window.strategies.low = async ({ audio, config, history }) => {
        console.log('🚀 [Low-Spec] 正在使用低配版 (STT + 文本模型 + 浏览器TTS) 策略...');

        try {
            // --- 步骤 1: 调用本地 STT 接口将语音转为文本 ---
            // 注意：传入的audio参数已经是带MIME前缀的Base64字符串
            // 格式类似: data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC8...
            const sttResponse = await fetch('/api/stt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    audio: audio // Base64 encoded audio with MIME prefix
                })
            });

            if (!sttResponse.ok) {
                throw new Error(`STT API error: ${sttResponse.status} - ${sttResponse.statusText}`);
            }

            const userText = await sttResponse.text();
            console.log('📝 用户语音已转录:', userText);

            // --- 步骤 2: 文本预处理 ---
            // 清理常见的STT错误和语气词
            const cleanedText = userText
                .replace(/[呃嗯啊哦]/g, '') // 移除语气词
                .replace(/\s+/g, ' ') // 合并多余空格
                .trim();

            if (!cleanedText) {
                throw new Error('STT结果为空或无效');
            }

            // --- 步骤 3: 构建模型请求参数 ---
            // 根据模型类型构建不同的请求参数
            let modelRequestParams = {};
            
            // 检查是否为GLM系列模型
            if (config.model && config.model.includes('glm')) {
                // GLM系列模型支持深度思考模式
                modelRequestParams = {
                    model: config.model || 'glm-4.5-flash',
                    messages: [
                        { role: "system", content: config.systemPrompt || "You are a helpful assistant." },
                        ...history,
                        { role: "user", content: cleanedText }
                    ],
                    thinking: {
                        type: "enabled" // 启用深度思考模式
                    }
                };
            } else {
                // 其他模型使用标准格式
                modelRequestParams = {
                    model: config.model || 'text-model-default',
                    messages: [
                        { role: "system", content: config.systemPrompt || "You are a helpful assistant." },
                        ...history,
                        { role: "user", content: cleanedText }
                    ]
                };
            }

            // --- 步骤 4: 将转录文本发送给文本模型 API ---
            const textModelResponse = await fetch(config.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify(modelRequestParams)
            });

            if (!textModelResponse.ok) {
                throw new Error(`Text Model API error: ${textModelResponse.status} - ${textModelResponse.statusText}`);
            }

            const data = await textModelResponse.json();
            
            // 检查响应格式
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('文本模型返回格式不正确');
            }
            
            const modelResponseText = data.choices[0].message.content;
            console.log('🤖 模型回复:', modelResponseText);

            // 返回文本，由VoiceChat.js自动使用浏览器TTS播放
            return modelResponseText;

        } catch (error) {
            console.error('低配版策略执行失败:', error);
            
            // 根据错误类型返回不同的提示
            if (error.message.includes('STT')) {
                return "抱歉，我没有听清楚，请再试一次。";
            } else if (error.message.includes('文本模型')) {
                return "抱歉，我现在无法思考，请稍后再试。";
            } else {
                return `处理过程中出现错误: ${error.message}`;
            }
        }
    };
})();