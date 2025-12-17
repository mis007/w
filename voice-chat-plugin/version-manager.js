/**
 * VersionManager.js - 语音对话插件版本管理器
 * 
 * 确保各版本完全独立解耦，支持无缝切换且不丢失配置
 * 
 * 版本结构：
 * - low:  浏览器STT -> 文本模型 -> 浏览器TTS
 * - mid:  浏览器STT -> 阿里云Qwen TTS
 * - high: 预留高级版本
 */

class VersionManager {
    constructor() {
        this.currentVersion = 'low';
        this.versions = {
            low: null,
            mid: null,
            high: null
        };
        
        // 版本数据库实例
        this.versionDBs = {
            low: null,
            mid: null,
            high: null
        };
        
        // 预设参数
        this.presetParams = {
            dashscope: {
                apiKey: 'sk-0ecae1777d2240ea862cdc1d73d5d645b3',
                apiEndpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
            },
            zhipu: {
                apiKey: 'a049afdafb1b41a0862cdc1d73d5d6eb.YuGYXVGRQEUILpog',
                apiEndpoint: 'https://open.bigmodel.cn/api/paas/v4/'
            }
        };
    }
    
    /**
     * 初始化所有版本策略和数据库
     */
    async initialize() {
        // 动态加载各版本策略文件
        try {
            // 低配版策略和数据库
            if (!this.versions.low) {
                await this.loadStrategy('low');
                await this.initVersionDB('low');
            }
            
            // 中配版策略和数据库
            if (!this.versions.mid) {
                await this.loadStrategy('mid');
                await this.initVersionDB('mid');
            }
            
            // 高配版策略和数据库
            if (!this.versions.high) {
                await this.loadStrategy('high');
                await this.initVersionDB('high');
            }
            
            console.log('✅ 所有版本策略和数据库加载完成');
        } catch (error) {
            console.error('❌ 版本策略或数据库加载失败:', error);
        }
    }
    
    /**
     * 动态加载指定版本策略
     * @param {string} version - 版本名称 ('low' | 'mid' | 'high')
     */
    async loadStrategy(version) {
        try {
            // 根据版本加载对应的策略文件
            const scriptPath = `${version}/strategy.js`;
            const script = document.createElement('script');
            script.src = scriptPath;
            script.async = false; // 同步加载确保顺序
            
            // 创建加载Promise
            const loadPromise = new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
            });
            
            // 添加到文档中开始加载
            document.head.appendChild(script);
            
            // 等待加载完成
            await loadPromise;
            
            console.log(`✅ ${version}版本策略加载成功`);
            return true;
        } catch (error) {
            console.error(`❌ ${version}版本策略加载失败:`, error);
            return false;
        }
    }
    
    /**
     * 初始化指定版本的数据库
     * @param {string} version - 版本名称 ('low' | 'mid' | 'high')
     */
    async initVersionDB(version) {
        try {
            // 根据版本加载对应的数据库文件
            const scriptPath = `${version}/db.js`;
            const script = document.createElement('script');
            script.src = scriptPath;
            script.async = false;
            
            // 创建加载Promise
            const loadPromise = new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
            });
            
            // 添加到文档中开始加载
            document.head.appendChild(script);
            
            // 等待加载完成
            await loadPromise;
            
            // 初始化数据库
            let dbInstance;
            switch(version) {
                case 'low':
                    dbInstance = new LowSpecDB();
                    await dbInstance.init();
                    this.versionDBs.low = dbInstance;
                    break;
                case 'mid':
                    dbInstance = new MidSpecDB();
                    await dbInstance.init();
                    this.versionDBs.mid = dbInstance;
                    break;
                case 'high':
                    dbInstance = new HighSpecDB();
                    await dbInstance.init();
                    this.versionDBs.high = dbInstance;
                    break;
            }
            
            console.log(`✅ ${version}版本数据库初始化成功`);
            return true;
        } catch (error) {
            console.error(`❌ ${version}版本数据库初始化失败:`, error);
            return false;
        }
    }
    
    /**
     * 切换到指定版本
     * @param {string} version - 目标版本 ('low' | 'mid' | 'high')
     */
    switchVersion(version) {
        if (!['low', 'mid', 'high'].includes(version)) {
            throw new Error(`不支持的版本: ${version}`);
        }
        
        this.currentVersion = version;
        console.log(`🔄 切换到${version}版本`);
        
        // 触发版本切换事件
        this.dispatchVersionChangeEvent(version);
    }
    
    /**
     * 获取当前版本策略处理器
     * @returns {Function|null} 当前版本的策略处理函数
     */
    getCurrentStrategy() {
        // 从全局strategies对象获取当前版本策略
        if (typeof strategies !== 'undefined' && strategies[this.currentVersion]) {
            return strategies[this.currentVersion];
        }
        
        console.warn(`未找到${this.currentVersion}版本策略`);
        return null;
    }
    
    /**
     * 获取指定版本策略处理器
     * @param {string} version - 版本名称
     * @returns {Function|null} 指定版本的策略处理函数
     */
    getStrategy(version) {
        if (!version || !['low', 'mid', 'high'].includes(version)) {
            throw new Error(`无效的版本名称: ${version}`);
        }
        
        // 从全局strategies对象获取指定版本策略
        if (typeof strategies !== 'undefined' && strategies[version]) {
            return strategies[version];
        }
        
        console.warn(`未找到${version}版本策略`);
        return null;
    }
    
    /**
     * 获取当前版本配置
     * @returns {Object} 当前版本配置
     */
    async getCurrentConfig() {
        return await this.getVersionConfig(this.currentVersion);
    }
    
    /**
     * 获取指定版本配置
     * @param {string} version - 版本名称
     * @returns {Object} 指定版本配置
     */
    async getVersionConfig(version) {
        if (!version || !['low', 'mid', 'high'].includes(version)) {
            throw new Error(`无效的版本名称: ${version}`);
        }
        
        try {
            // 从版本专用数据库获取配置
            const db = this.versionDBs[version];
            if (!db) {
                throw new Error(`${version}版本数据库未初始化`);
            }
            
            const config = await db.getConfig();
            return config || this.getDefaultConfig(version);
        } catch (error) {
            console.error(`${version}版本配置获取失败:`, error);
            return this.getDefaultConfig(version);
        }
    }
    
    /**
     * 保存当前版本配置
     * @param {Object} config - 配置对象
     */
    async saveCurrentConfig(config) {
        await this.saveVersionConfig(this.currentVersion, config);
    }
    
    /**
     * 保存指定版本配置
     * @param {string} version - 版本名称
     * @param {Object} config - 配置对象
     */
    async saveVersionConfig(version, config) {
        if (!version || !['low', 'mid', 'high'].includes(version)) {
            throw new Error(`无效的版本名称: ${version}`);
        }
        
        try {
            const db = this.versionDBs[version];
            if (!db) {
                throw new Error(`${version}版本数据库未初始化`);
            }
            
            await db.saveConfig(config);
            console.log(`${version}版本配置保存成功`);
        } catch (error) {
            console.error(`${version}版本配置保存失败:`, error);
            throw error;
        }
    }
    
    /**
     * 获取指定版本默认配置
     * @param {string} version - 版本名称
     * @returns {Object} 默认配置
     */
    getDefaultConfig(version) {
        const defaults = {
            low: {
                apiEndpoint: this.presetParams.zhipu.apiEndpoint + 'chat/completions',
                apiKey: this.presetParams.zhipu.apiKey,
                model: 'glm-4.5-flash',
                systemPrompt: '你是一个智能语音助手，请用简洁明了的语言回答用户问题。回答要口语化，适合语音播报。',
                thinkingMode: 'enabled',
                voiceLang: 'zh-CN',
                temperature: 0.7,
                maxTokens: 2048
            },
            mid: {
                apiEndpoint: this.presetParams.dashscope.apiEndpoint,
                apiKey: this.presetParams.dashscope.apiKey,
                model: 'qwen-turbo',
                voice: 'Cherry',
                response_format: 'pcm',
                sample_rate: 24000
            },
            high: {
                apiEndpoint: this.presetParams.zhipu.apiEndpoint + 'realtime',
                apiKey: this.presetParams.zhipu.apiKey,
                model: 'glm-realtime-flash',
                systemPrompt: 'You are a professional AI assistant.',
                voice: 'tongtong',
                output_audio_format: 'pcm',
                input_audio_format: 'wav'
            }
        };
        
        return defaults[version] || {};
    }
    
    /**
     * 触发版本切换事件
     * @param {string} version - 新版本名称
     */
    dispatchVersionChangeEvent(version) {
        const event = new CustomEvent('versionchange', {
            detail: { version }
        });
        window.dispatchEvent(event);
    }
    
    /**
     * 监听版本切换事件
     * @param {Function} callback - 回调函数
     */
    onVersionChange(callback) {
        window.addEventListener('versionchange', callback);
    }
    
    /**
     * 获取所有版本状态
     * @returns {Object} 各版本状态信息
     */
    getVersionStatus() {
        return {
            current: this.currentVersion,
            available: Object.keys(this.versions).filter(v => this.versions[v] !== null),
            loaded: {
                low: this.versions.low !== null,
                mid: this.versions.mid !== null,
                high: this.versions.high !== null
            }
        };
    }
    
    /**
     * 获取推荐的低配版模型列表
     * @returns {Array} 推荐模型列表
     */
    getLowSpecRecommendedModels() {
        return [
            {
                name: 'GLM-4.5-Flash',
                provider: '智谱AI',
                description: '完全免费，支持128K上下文，提供深度思考模式',
                apiEndpoint: this.presetParams.zhipu.apiEndpoint + 'chat/completions',
                modelName: 'glm-4.5-flash',
                isFree: true
            },
            {
                name: 'Qwen-Turbo',
                provider: '阿里云',
                description: '高性价比文本模型',
                apiEndpoint: this.presetParams.dashscope.apiEndpoint,
                modelName: 'qwen-turbo',
                isFree: false
            },
            {
                name: 'ERNIE-Speed',
                provider: '百度千帆',
                description: '百度出品的高性能文本模型',
                apiEndpoint: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/ernie-speed',
                modelName: 'ernie_speed',
                isFree: true
            }
        ];
    }
}

// 创建全局版本管理器实例
const versionManager = new VersionManager();

// 导出版本管理器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VersionManager, versionManager };
} else {
    window.VersionManager = VersionManager;
    window.versionManager = versionManager;
}