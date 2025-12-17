/**
 * 中配版语音对话系统配置示例
 * 
 * 该文件展示了如何配置中配版系统以使用阿里云Qwen TTS模型
 */

// 配置示例
const midSpecConfigExample = {
    // API配置
    apiEndpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    apiKey: 'sk-0ecae1777d2240ea862cdc1d73d5d645b3', // 阿里云预设密钥
    
    // 模型配置
    model: 'qwen-turbo',
    
    // 系统提示词
    systemPrompt: '你是一个智能语音助手，请用简洁明了的语言回答用户问题。回答要口语化，适合语音播报。',
    
    // TTS配置
    voice: 'Cherry',
    response_format: 'pcm',
    sample_rate: 24000,
    
    // STT配置（如果需要自定义）
    stt: {
        endpoint: '/api/stt', // 本地STT服务端点
        language: 'zh-CN'
    }
};

// 配置验证函数
function validateMidSpecConfig(config) {
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
    
    if (!config.voice) {
        errors.push('缺少语音配置');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// 配置应用函数
function applyMidSpecConfig(config) {
    // 验证配置
    const validation = validateMidSpecConfig(config);
    if (!validation.isValid) {
        throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
    }
    
    // 应用配置到系统
    console.log('应用中配版配置:', config);
    
    // 这里可以添加实际的配置应用逻辑
    // 例如：更新UI元素、保存到localStorage等
    
    return true;
}

// 默认配置
const defaultMidSpecConfig = {
    apiEndpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    apiKey: 'sk-0ecae1777d2240ea862cdc1d73d5d645b3',
    model: 'qwen-turbo',
    systemPrompt: '你是一个智能语音助手，请用简洁明了的语言回答用户问题。回答要口语化，适合语音播报。',
    voice: 'Cherry',
    response_format: 'pcm',
    sample_rate: 24000
};

// 导出配置示例和工具函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        midSpecConfigExample,
        defaultMidSpecConfig,
        validateMidSpecConfig,
        applyMidSpecConfig
    };
} else {
    window.MidSpecConfigExample = {
        midSpecConfigExample,
        defaultMidSpecConfig,
        validateMidSpecConfig,
        applyMidSpecConfig
    };
}