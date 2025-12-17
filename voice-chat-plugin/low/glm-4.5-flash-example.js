/**
 * GLM-4.5-Flash 模型调用示例
 * 
 * 该文件展示了如何在低配版语音对话系统中正确调用智谱AI的GLM-4.5-Flash模型
 * 模型特点：
 * - 完全免费
 * - 支持128K上下文
 * - 可切换深度思考模式
 * - API端点: https://open.bigmodel.cn/api/paas/v4/chat/completions
 */

class GLM45FlashExample {
    /**
     * 调用GLM-4.5-Flash模型处理文本
     * @param {string} userText - 用户输入的文本
     * @param {Object} config - 配置对象
     * @param {Array} history - 对话历史
     * @returns {Promise<string>} 模型回复
     */
    static async processText(userText, config, history = []) {
        try {
            // 构建请求参数
            const requestBody = {
                model: config.model || 'glm-4.5-flash',
                messages: [
                    { 
                        role: "system", 
                        content: config.systemPrompt || "你是一个智能语音助手，请用简洁明了的语言回答用户问题。" 
                    },
                    ...history,
                    { role: "user", content: userText }
                ],
                // GLM-4.5-Flash特有的深度思考模式
                thinking: {
                    type: config.thinkingMode || "enabled" // "enabled" 或 "disabled"
                },
                stream: false, // 是否流式输出
                temperature: config.temperature || 0.7, // 控制随机性
                max_tokens: config.maxTokens || 2048 // 最大输出token数
            };

            // 发送请求到智谱AI API
            const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // 检查响应格式
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('模型返回格式不正确');
            }

            return data.choices[0].message.content;
        } catch (error) {
            console.error('GLM-4.5-Flash调用失败:', error);
            throw new Error(`模型调用失败: ${error.message}`);
        }
    }

    /**
     * 流式调用GLM-4.5-Flash模型
     * @param {string} userText - 用户输入的文本
     * @param {Object} config - 配置对象
     * @param {Array} history - 对话历史
     * @param {Function} onChunkReceived - 接收数据块的回调函数
     */
    static async processTextStream(userText, config, history = [], onChunkReceived) {
        try {
            // 构建请求参数
            const requestBody = {
                model: config.model || 'glm-4.5-flash',
                messages: [
                    { 
                        role: "system", 
                        content: config.systemPrompt || "你是一个智能语音助手，请用简洁明了的语言回答用户问题。" 
                    },
                    ...history,
                    { role: "user", content: userText }
                ],
                thinking: {
                    type: config.thinkingMode || "enabled"
                },
                stream: true, // 启用流式输出
                temperature: config.temperature || 0.7,
                max_tokens: config.maxTokens || 2048
            };

            // 发送请求到智谱AI API
            const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }

            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                
                // 处理接收到的数据
                const lines = buffer.split('\n');
                buffer = lines.pop(); // 保留不完整的行
                
                for (const line of lines) {
                    if (line.startsWith('data:')) {
                        const data = line.slice(5).trim();
                        if (data === '[DONE]') {
                            return;
                        }
                        
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                                const content = parsed.choices[0].delta.content;
                                if (content) {
                                    onChunkReceived(content);
                                }
                            }
                        } catch (e) {
                            // 忽略解析错误
                        }
                    }
                }
            }
        } catch (error) {
            console.error('GLM-4.5-Flash流式调用失败:', error);
            throw new Error(`模型流式调用失败: ${error.message}`);
        }
    }

    /**
     * 验证API密钥有效性
     * @param {string} apiKey - API密钥
     * @returns {Promise<boolean>} 密钥是否有效
     */
    static async validateApiKey(apiKey) {
        try {
            const response = await fetch('https://open.bigmodel.cn/api/paas/v4/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            
            return response.ok;
        } catch (error) {
            console.error('API密钥验证失败:', error);
            return false;
        }
    }

    /**
     * 获取模型列表
     * @param {string} apiKey - API密钥
     * @returns {Promise<Array>} 可用模型列表
     */
    static async getAvailableModels(apiKey) {
        try {
            const response = await fetch('https://open.bigmodel.cn/api/paas/v4/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`获取模型列表失败: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('获取模型列表失败:', error);
            return [];
        }
    }
}

// 使用示例
/*
const config = {
    apiKey: 'your-api-key-here',
    model: 'glm-4.5-flash',
    systemPrompt: '你是一个智能语音助手，请用简洁明了的语言回答用户问题。',
    thinkingMode: 'enabled',
    temperature: 0.7
};

const userText = "你好，今天天气怎么样？";
const history = [];

// 普通调用
GLM45FlashExample.processText(userText, config, history)
    .then(response => {
        console.log('模型回复:', response);
    })
    .catch(error => {
        console.error('调用失败:', error);
    });

// 流式调用
GLM45FlashExample.processTextStream(userText, config, history, (chunk) => {
    console.log('接收到数据块:', chunk);
})
    .then(() => {
        console.log('流式调用完成');
    })
    .catch(error => {
        console.error('流式调用失败:', error);
    });
*/

// 导出类供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GLM45FlashExample;
} else {
    window.GLM45FlashExample = GLM45FlashExample;
}