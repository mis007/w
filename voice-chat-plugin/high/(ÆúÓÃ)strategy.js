(function () {
    window.strategies = window.strategies || {};

    /**
     * 🔴 3. 高配版 (High-Spec / Pro)
     * 场景：浏览器 -> STT -> LLM -> TTS
     * 特点：返回高质量音频，体验最好
     */
    window.strategies.high = async ({ audio, config, history }) => {
        console.log('🚀 [High-Spec] 正在使用高配版策略...');

        // 1. 检查配置
        if (!config.apiEndpoint) {
            console.warn('⚠️ 未配置 API Endpoint，使用模拟模式');
            await new Promise(r => setTimeout(r, 2000));
            return {
                text: "【高配版模拟】这是高质量语音回复 (请在秘密面板配置 API)",
                // audio: "data:audio/mp3;base64,..." 
            };
        }

        // 2. 真实对接：发送给后端 (STT + LLM + TTS)
        // 假设后端接口接收 { audio, messages, config } 并返回 { text, audio }
        try {
            const payload = {
                audio: audio,
                messages: history,
                config: {
                    model: config.model,
                    systemPrompt: config.systemPrompt
                }
            };

            const response = await fetch(config.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey || ''}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`API Error ${response.status}: ${err}`);
            }

            const data = await response.json();
            // 期望返回格式: { text: "...", audio: "data:audio/..." }
            return data;

        } catch (e) {
            console.error('High-Spec API Call Failed:', e);
            return { text: `API 调用失败: ${e.message}` };
        }
    };
})();
