/**
 * db.js - 全局数据库管理器
 * 管理全局配置和协调各版本数据库
 * 
 * 注意：各版本现在使用独立的数据库文件：
 * - 低配版: low/db.js
 * - 中配版: mid/db.js
 * - 高配版: high/db.js
 */

class GlobalDB {
    constructor() {
        this.dbName = 'VoiceChatGlobalDB';
        this.version = 1;
        this.db = null;
    }

    /**
     * 初始化全局数据库
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => {
                reject(new Error('无法打开全局数据库'));
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 创建全局配置存储
                if (!db.objectStoreNames.contains('global_config')) {
                    const configStore = db.createObjectStore('global_config', { keyPath: 'id' });
                    configStore.createIndex('name', 'name', { unique: true });
                }
            };
        });
    }

    /**
     * 保存全局配置
     * @param {Object} config 配置对象
     * @param {string} name 配置名称
     */
    async saveGlobalConfig(config, name = 'default') {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['global_config'], 'readwrite');
            const store = transaction.objectStore('global_config');
            
            const configEntry = {
                id: name,
                name: name,
                data: config,
                timestamp: Date.now()
            };
            
            const request = store.put(configEntry);
            
            request.onsuccess = () => {
                resolve(config);
            };
            
            request.onerror = () => {
                reject(new Error('保存全局配置失败'));
            };
        });
    }

    /**
     * 获取全局配置
     * @param {string} name 配置名称
     * @returns {Object|null} 配置对象或null
     */
    async getGlobalConfig(name = 'default') {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['global_config'], 'readonly');
            const store = transaction.objectStore('global_config');
            
            const request = store.get(name);
            
            request.onsuccess = (event) => {
                const result = event.target.result;
                resolve(result ? result.data : null);
            };
            
            request.onerror = () => {
                reject(new Error('获取全局配置失败'));
            };
        });
    }
    
    /**
     * 获取当前激活的版本
     * @returns {string} 当前版本 ('low' | 'mid' | 'high')
     */
    async getCurrentVersion() {
        const globalConfig = await this.getGlobalConfig('global_settings');
        return (globalConfig && globalConfig.currentVersion) || 'low';
    }
    
    /**
     * 设置当前激活的版本
     * @param {string} version 版本名称
     */
    async setCurrentVersion(version) {
        if (!['low', 'mid', 'high'].includes(version)) {
            throw new Error(`无效的版本名称: ${version}`);
        }
        
        const globalConfig = await this.getGlobalConfig('global_settings');
        const newConfig = { ...globalConfig, currentVersion: version };
        await this.saveGlobalConfig(newConfig, 'global_settings');
    }
}

// 导出全局数据库实例
const globalDB = new GlobalDB();

// 同时保留原来的兼容接口
class VoiceChatDB extends GlobalDB {
    constructor() {
        super();
        console.warn('VoiceChatDB已被弃用，请使用GlobalDB');
    }
    
    /**
     * 保存配置 (向后兼容)
     * @param {Object} configObj 
     * @param {string} mode - 'low' | 'mid' | 'high' | 'global'
     */
    async saveConfig(configObj, mode = 'global') {
        if (mode === 'global') {
            return await this.saveGlobalConfig(configObj, 'global_settings');
        } else {
            console.warn(`请使用${mode}版本的专用数据库`);
            return await this.saveGlobalConfig(configObj, `legacy_${mode}`);
        }
    }

    /**
     * 获取配置 (向后兼容)
     * @param {string} mode - 'low' | 'mid' | 'high' | 'global'
     */
    async getConfig(mode = 'global') {
        if (mode === 'global') {
            return await this.getGlobalConfig('global_settings');
        } else {
            console.warn(`请使用${mode}版本的专用数据库`);
            return await this.getGlobalConfig(`legacy_${mode}`);
        }
    }
}

// 导出兼容实例
const db = new VoiceChatDB();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GlobalDB, globalDB, VoiceChatDB, db };
} else {
    window.GlobalDB = GlobalDB;
    window.globalDB = globalDB;
    window.VoiceChatDB = VoiceChatDB;
    window.db = db;
}