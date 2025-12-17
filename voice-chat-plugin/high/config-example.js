/**
 * 高配版语音对话系统配置示例
 * 
 * 该文件展示了如何配置高配版系统以使用智谱AI GLM-Realtime模型
 */

// 配置示例
const highSpecConfigExample = {
    // API配置
    apiEndpoint: 'wss://open.bigmodel.cn/api/paas/v4/realtime',
    apiKey: 'a049afdafb1b41a0862cdc1d73d5d6eb.YuGYXVGRQEUILpog', // 智谱AI预设密钥
    
    // 模型配置
    model: 'glm-realtime-flash',
    
    // 系统提示词
    systemPrompt: '你是一个智能语音助手，请用简洁明了的语言回答用户问题。回答要口语化，适合语音播报。',
    
    // 语音配置
    voice: 'tongtong',
    output_audio_format: 'pcm',
    input_audio_format: 'wav',
    
    // VAD配置
    vad_type: 'server_vad',
    vad_threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 500,
    
    // 其他配置
    temperature: 0.8,
    max_tokens: 'inf',
    
    // 工具配置
    tools: [],
    tool_choice: 'auto'
};

// 配置验证函数
function validateHighSpecConfig(config) {
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
function applyHighSpecConfig(config) {
    // 验证配置
    const validation = validateHighSpecConfig(config);
    if (!validation.isValid) {
        throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
    }
    
    // 应用配置到系统
    console.log('应用高配版配置:', config);
    
    // 这里可以添加实际的配置应用逻辑
    // 例如：更新UI元素、保存到localStorage等
    
    return true;
}

// 默认配置
const defaultHighSpecConfig = {
    apiEndpoint: 'wss://open.bigmodel.cn/api/paas/v4/realtime',
    apiKey: 'a049afdafb1b41a0862cdc1d73d5d6eb.YuGYXVGRQEUILpog',
    model: 'glm-realtime-flash',
    systemPrompt: '你是一个智能语音助手，请用简洁明了的语言回答用户问题。回答要口语化，适合语音播报。',
    voice: 'tongtong',
    output_audio_format: 'pcm',
    input_audio_format: 'wav',
    vad_type: 'server_vad',
    vad_threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 500,
    temperature: 0.8,
    max_tokens: 'inf',
    tools: [],
    tool_choice: 'auto'
};

// 导出配置示例和工具函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        highSpecConfigExample,
        defaultHighSpecConfig,
        validateHighSpecConfig,
        applyHighSpecConfig
    };
} else {
    window.HighSpecConfigExample = {
        highSpecConfigExample,
        defaultHighSpecConfig,
        validateHighSpecConfig,
        applyHighSpecConfig
    };
}