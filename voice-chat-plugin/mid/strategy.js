(function () {
    window.strategies = window.strategies || {};

    /**
     * 🟡 2. 中配版 (Mid-Spec / Classic)
     * 场景：浏览器 -> STT (Whisper) -> 阿里云 Qwen TTS 实时语音合成
     * 特点：语音输入 -> 文本处理 -> 语音输出 (基于阿里云Qwen TTS模型)
     * 
     * 格式支持说明：
     * - 音频输入格式: audio/webm;codecs=opus (首选) 或 audio/mp4 (iOS/微信兼容)
     * - STT输出格式: 纯文本
     * - TTS输入格式: 纯文本
     * - TTS输出格式: audio/pcm, audio/wav, 或 audio/mp3 (取决于parameters.format)
     */
    window.strategies.mid = async ({ audio, config, history }) => {
        console.log('🚀 [Mid-Spec] 正在使用中配版 (STT + 阿里云Qwen TTS) 策略...');

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

            // --- 步骤 3: 将转录文本发送给阿里云 Qwen TTS 实时语音合成 ---
            // 参考阿里云百炼平台文档:
            // https://bailian.console.aliyun.com/?spm=a2ty02.30260223.d_mcp-market.1.4f5574a1pF4NoR&tab=doc#/doc/?type=model&url=2938790
            const ttsResponse = await fetch(config.apiEndpoint, {
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

            if (!ttsResponse.ok) {
                throw new Error(`阿里云 Qwen TTS API error: ${ttsResponse.status} - ${ttsResponse.statusText}`);
            }

            // --- 步骤 4: 将 TTS 返回的音频转为 Base64 ---
            const audioBlob = await ttsResponse.blob();
            
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

            // 返回文本和生成的语音
            return {
                text: cleanedText,
                audio: ttsAudioBase64
            };

        } catch (error) {
            console.error('中配版策略执行失败:', error);
            
            // 根据错误类型返回不同的提示
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
                    text: `处理过程中出现错误: ${error.message}`,
                    audio: null
                };
            }
        }
    };
})();