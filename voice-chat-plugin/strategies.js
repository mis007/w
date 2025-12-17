/**
 * strategies.js - 核心逻辑分包
 * 这里定义了三种不同架构的独立处理逻辑
 * 
 * 各版本完全独立解耦：
 * - low:  浏览器STT -> 文本模型 -> 浏览器TTS
 * - mid:  浏览器STT -> 阿里云Qwen TTS
 * - high: 浏览器 -> WebSocket -> GLM-Realtime模型 -> WebSocket -> 浏览器
 * 
 * 切换版本不会丢失设定，各版本数据文件位于对应文件夹内
 */

const strategies = {
    /**
     * 🟢 1. 低配版 (Low-Spec / Classic)
     * 场景：浏览器 -> STT -> 文本模型 -> 浏览器自带TTS
     * 特点：成本最低，使用便宜的文本模型和浏览器原生TTS功能
     * 推荐模型：
     * - GLM-4.5-Flash (智谱AI免费模型)
     * - Qwen系列文本模型
     * - ERNIE系列文本模型
     * 文件位置：/low/strategy.js
     */
    low: async ({ audio, config, history }) => {
        console.log('🚀 [Low-Spec] 正在使用低配版策略 (STT + 文本模型 + 浏览器TTS)...');

        // --- 真实对接代码 ---
        try {
            // 步骤 A: 发送音频给后端 STT
            const sttRes = await fetch('/api/stt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    audio: audio // Base64 encoded audio with MIME type
                })
            });
            
            if (!sttRes.ok) {
                throw new Error(`STT API error: ${sttRes.status}`);
            }
            
            const userText = await sttRes.text();

            // 步骤 B: 文本预处理
            const cleanedText = userText
                .replace(/[呃嗯啊哦]/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            if (!cleanedText) {
                throw new Error('STT结果为空或无效');
            }

            // 步骤 C: 构建模型请求参数
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

            // 步骤 D: 发送文本给便宜的文本模型
            const textModelRes = await fetch(config.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify(modelRequestParams)
            });
            
            if (!textModelRes.ok) {
                throw new Error(`Text Model API error: ${textModelRes.status}`);
            }
            
            const data = await textModelRes.json();
            
            // 验证响应格式
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('文本模型返回格式不正确');
            }
            
            const modelResponseText = data.choices[0].message.content;
            
            // 返回文本，由VoiceChat.js自动使用浏览器TTS播放
            return modelResponseText;
        } catch (error) {
            console.error('Low-spec strategy error:', error);
            throw new Error(`文本处理失败: ${error.message}`);
        }

        // --- 模拟返回 ---
        /*
        await new Promise(r => setTimeout(r, 1000));
        return "【低配版】这是经过 STT 和 文本模型处理后的文本回复，将通过浏览器TTS播放 (模拟返回)";
        */
    },

    /**
     * 🟡 2. 中配版 (Mid-Spec / Classic)
     * 场景：浏览器 -> STT (Whisper) -> 阿里云 Qwen TTS 实时语音合成
     * 特点：语音输入 -> 文本处理 -> 语音输出 (基于阿里云Qwen TTS模型)
     * 文件位置：/mid/strategy.js
     */
    mid: async ({ audio, config, history }) => {
        console.log('🚀 [Mid-Spec] 正在使用中配版策略 (STT + 阿里云Qwen TTS)...');

        // --- 真实对接代码 ---
        try {
            // 步骤 A: 发送音频给后端 STT
            const sttRes = await fetch('/api/stt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    audio: audio // Base64 encoded audio with MIME type
                })
            });
            
            if (!sttRes.ok) {
                throw new Error(`STT API error: ${sttRes.status}`);
            }
            
            const userText = await sttRes.text();

            // 步骤 B: 文本预处理
            const cleanedText = userText
                .replace(/[呃嗯啊哦]/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            if (!cleanedText) {
                throw new Error('STT结果为空或无效');
            }

            // 步骤 C: 发送文本给阿里云 Qwen TTS 实时语音合成模型
            // 参考阿里云百炼平台文档:
            // https://bailian.console.aliyun.com/?spm=a2ty02.30260223.d_mcp-market.1.4f5574a1pF4NoR&tab=doc#/doc/?type=model&url=2938790
            const ttsRes = await fetch(config.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                    'X-DashScope-Realtime-TTS': 'enable' // 阿里云Qwen TTS必需的特殊头部
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
            
            if (!ttsRes.ok) {
                throw new Error(`阿里云 Qwen TTS API error: ${ttsRes.status}`);
            }
            
            // 步骤 D: 将 TTS 响应转换为 Base64 音频
            const audioBlob = await ttsRes.blob();
            
            // 确保正确设置MIME类型前缀
            let mimeType = audioBlob.type || 'audio/pcm';
            if (!mimeType.startsWith('audio/')) {
                // 如果blob没有提供正确的MIME类型，则根据format参数设置
                const format = config.response_format || 'pcm';
                mimeType = `audio/${format}`;
            }
            
            const ttsAudioBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    // 确保Base64字符串有正确的MIME类型前缀
                    let result = reader.result;
                    if (!result.startsWith('data:')) {
                        result = `data:${mimeType};base64,${result.split(',')[1] || result}`;
                    }
                    resolve(result);
                };
                reader.onerror = reject;
                reader.readAsDataURL(audioBlob);
            });
            
            // 返回文本和音频
            return {
                text: cleanedText,
                audio: ttsAudioBase64
            };
        } catch (error) {
            console.error('Mid-spec strategy error:', error);
            throw new Error(`语音处理失败: ${error.message}`);
        }

        // --- 模拟返回 ---
        /*
        await new Promise(r => setTimeout(r, 1500));
        return {
            text: "【中配版】这是经过 STT 和 阿里云 Qwen TTS 处理后的语音回复 (模拟返回)",
            audio: "" // 实际情况下应该返回 Base64 编码的音频
        };
        */
    },

    /**
     * 🔴 3. 高配版 (High-Spec / Pro)
     * 场景：浏览器 -> WebSocket -> GLM-Realtime模型 -> WebSocket -> 浏览器
     * 特点：实时语音对话，支持音频和视频模式，体验最佳
     * 支持的模型：
     * - GLM-Realtime-Flash (推荐)
     * - GLM-Realtime-Air
     * 文件位置：/high/strategy.js
     */
    high: async ({ audio, config, history }) => {
        console.log('🚀 [High-Spec] 正在使用高配版策略 (GLM-Realtime)...');

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
    }
};