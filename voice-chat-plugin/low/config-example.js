/**
 * 低配版语音对话系统配置示例
 * 
 * 该文件展示了如何配置低配版系统以使用GLM-4.5-Flash模型
 */

// 配置示例
const lowSpecConfigExample = {
    // API配置
    apiEndpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    apiKey: 'a049afdafb1b41a0862cdc1d73d5d6eb.YuGYXVGRQEUILpog', // 智谱AI预设密钥
    
    // 模型配置
    model: 'glm-4.5-flash',
    
    // 系统提示词
    systemPrompt: '你是一个智能语音助手，请用简洁明了的语言回答用户问题。回答要口语化，适合语音播报。',
    
    // GLM-4.5-Flash特有配置
    thinkingMode: 'enabled', // "enabled" 或 "disabled"
    
    // 通用模型参数
    temperature: 0.7,
    maxTokens: 2048,
    
    // 语音配置
    voiceLang: 'zh-CN',
    
    // STT配置（如果需要自定义）
    stt: {
        endpoint: '/api/stt', // 本地STT服务端点
        language: 'zh-CN'
    }
};

// 配置验证函数
function validateLowSpecConfig(config) {
    const errors = [];
    
    if (!config.apiEndpoint) {
        errors.push('缺少API端点配置');
    }
    
    if (!config.apiKey) {
        errors.push('缺少API密钥');
    }
    
    if (!config.model) {
        errors.push('缺少模型名称');
    }
    
    if (!config.systemPrompt) {
        errors.push('缺少系统提示词');
    }
    
    if (config.thinkingMode && !['enabled', 'disabled'].includes(config.thinkingMode)) {
        errors.push('思考模式必须是 "enabled" 或 "disabled"');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// 配置应用函数
function applyLowSpecConfig(config) {
    // 验证配置
    const validation = validateLowSpecConfig(config);
    if (!validation.isValid) {
        throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
    }
    
    // 应用配置到系统
    console.log('应用低配版配置:', config);
    
    // 这里可以添加实际的配置应用逻辑
    // 例如：更新UI元素、保存到localStorage等
    
    return true;
}

// 默认配置
const defaultLowSpecConfig = {
    apiEndpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    apiKey: 'a049afdafb1b41a0862cdc1d73d5d6eb.YuGYXVGRQEUILpog',
    model: 'glm-4.5-flash',
    systemPrompt: '你是一个智能语音助手，请用简洁明了的语言回答用户问题。回答要口语化，适合语音播报。',
    thinkingMode: 'enabled',
    temperature: 0.7,
    maxTokens: 2048,
    voiceLang: 'zh-CN'
};

// 导出配置示例和工具函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        lowSpecConfigExample,
        defaultLowSpecConfig,
        validateLowSpecConfig,
        applyLowSpecConfig
    };
} else {
    window.LowSpecConfigExample = {
        lowSpecConfigExample,
        defaultLowSpecConfig,
        validateLowSpecConfig,
        applyLowSpecConfig
    };
}