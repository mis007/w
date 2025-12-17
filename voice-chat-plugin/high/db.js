/**
 * high/db.js - 高配版专用数据库管理
 * 管理高配版的配置和历史记录
 */

class HighSpecDB {
    constructor() {
        this.dbName = 'VoiceChatHighSpecDB';
        this.version = 1;
        this.db = null;
    }

    /**
     * 初始化数据库
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => {
                reject(new Error('无法打开高配版数据库'));
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 创建配置存储
                if (!db.objectStoreNames.contains('config')) {
                    const configStore = db.createObjectStore('config', { keyPath: 'id' });
                    configStore.createIndex('name', 'name', { unique: true });
                }
                
                // 创建历史记录存储
                if (!db.objectStoreNames.contains('history')) {
                    const historyStore = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
                    historyStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    /**
     * 保存配置
     * @param {Object} config 配置对象
     */
    async saveConfig(config) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['config'], 'readwrite');
            const store = transaction.objectStore('config');
            
            const configEntry = {
                id: 'high_spec_config',
                name: 'high_spec_config',
                data: config,
                timestamp: Date.now()
            };
            
            const request = store.put(configEntry);
            
            request.onsuccess = () => {
                resolve(config);
            };
            
            request.onerror = () => {
                reject(new Error('保存配置失败'));
            };
        });
    }

    /**
     * 获取配置
     * @returns {Object|null} 配置对象或null
     */
    async getConfig() {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['config'], 'readonly');
            const store = transaction.objectStore('config');
            
            const request = store.get('high_spec_config');
            
            request.onsuccess = (event) => {
                const result = event.target.result;
                resolve(result ? result.data : null);
            };
            
            request.onerror = () => {
                reject(new Error('获取配置失败'));
            };
        });
    }

    /**
     * 添加历史记录
     * @param {Object} record 记录对象
     */
    async addHistoryRecord(record) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['history'], 'readwrite');
            const store = transaction.objectStore('history');
            
            const historyEntry = {
                ...record,
                timestamp: Date.now()
            };
            
            const request = store.add(historyEntry);
            
            request.onsuccess = (event) => {
                resolve(event.target.result); // 返回新记录的ID
            };
            
            request.onerror = () => {
                reject(new Error('添加历史记录失败'));
            };
        });
    }

    /**
     * 获取历史记录
     * @param {number} limit 限制数量
     * @returns {Array} 历史记录数组
     */
    async getHistoryRecords(limit = 50) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['history'], 'readonly');
            const store = transaction.objectStore('history');
            
            const request = store.index('timestamp').openCursor(null, 'prev');
            const records = [];
            let count = 0;
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                
                if (cursor && count < limit) {
                    records.push(cursor.value);
                    count++;
                    cursor.continue();
                } else {
                    // 反转数组以按时间正序排列
                    resolve(records.reverse());
                }
            };
            
            request.onerror = () => {
                reject(new Error('获取历史记录失败'));
            };
        });
    }

    /**
     * 删除历史记录
     * @param {number} id 记录ID
     */
    async deleteHistoryRecord(id) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['history'], 'readwrite');
            const store = transaction.objectStore('history');
            
            const request = store.delete(id);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = () => {
                reject(new Error('删除历史记录失败'));
            };
        });
    }

    /**
     * 清空历史记录
     */
    async clearHistoryRecords() {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['history'], 'readwrite');
            const store = transaction.objectStore('history');
            
            const request = store.clear();
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = () => {
                reject(new Error('清空历史记录失败'));
            };
        });
    }

    /**
     * 清理过期记录
     * @param {number} days 保留天数
     */
    async clearExpiredRecords(days = 7) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['history'], 'readwrite');
            const store = transaction.objectStore('history');
            
            const expireTime = Date.now() - (days * 24 * 60 * 60 * 1000);
            
            // 打开游标遍历过期记录
            const request = store.index('timestamp').openCursor(IDBKeyRange.upperBound(expireTime));
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            
            request.onerror = () => {
                reject(new Error('清理过期记录失败'));
            };
        });
    }
}

// 导出高配版数据库实例
const highSpecDB = new HighSpecDB();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HighSpecDB, highSpecDB };
} else {
    window.HighSpecDB = HighSpecDB;
    window.highSpecDB = highSpecDB;
}