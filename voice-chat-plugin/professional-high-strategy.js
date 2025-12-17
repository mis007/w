/**
 * Professional High-spec Strategy (GLM-Realtime)
 * 基于智谱AI GLM-Realtime模型的实时语音对话实现
 * 
 * 特点：
 * 1. 使用WebSocket实现低延迟实时通信
 * 2. 支持音频和视频两种交互模式
 * 3. 支持语音打断功能
 * 4. 提供高质量的语音输出
 */

class ProfessionalHighStrategy {
    /**
     * 初始化高配版策略
     * @param {Object} config - 配置对象
     */
    constructor(config = {}) {
        this.config = config;
        this.websocket = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.messageQueue = [];
        this.sessionId = null;
        this.responseId = null;
        this.requestId = null;
        this.resFinished = true;
        
        // 事件回调
        this.onConnectionOpen = null;
        this.onConnectionClose = null;
        this.onAudioData = null;
        this.onTextData = null;
        this.onError = null;
    }

    /**
     * 建立WebSocket连接
     * @param {string} apiKey - API密钥
     * @returns {Promise<void>}
     */
    async connect(apiKey) {
        if (this.isConnecting || this.isConnected) {
            console.warn('WebSocket连接已存在');
            return;
        }

        try {
            this.isConnecting = true;
            
            // 构建WebSocket连接URL
            const url = `wss://open.bigmodel.cn/api/paas/v4/realtime?Authorization=${apiKey}`;
            
            // 创建WebSocket连接
            this.websocket = new WebSocket(url);
            
            // 设置事件处理器
            this.websocket.onopen = () => {
                this.isConnecting = false;
                this.isConnected = true;
                console.log('✅ GLM-Realtime WebSocket连接已建立');
                
                if (this.onConnectionOpen) {
                    this.onConnectionOpen();
                }
            };
            
            this.websocket.onmessage = (event) => {
                this.handleWebSocketMessage(event.data);
            };
            
            this.websocket.onclose = () => {
                this.isConnecting = false;
                this.isConnected = false;
                console.log('⚠️ GLM-Realtime WebSocket连接已关闭');
                
                if (this.onConnectionClose) {
                    this.onConnectionClose();
                }
            };
            
            this.websocket.onerror = (error) => {
                this.isConnecting = false;
                this.isConnected = false;
                console.error('❌ GLM-Realtime WebSocket连接错误:', error);
                
                if (this.onError) {
                    this.onError(error);
                }
            };
        } catch (error) {
            this.isConnecting = false;
            console.error('❌ WebSocket连接失败:', error);
            throw new Error(`WebSocket连接失败: ${error.message}`);
        }
    }

    /**
     * 断开WebSocket连接
     */
    disconnect() {
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        this.isConnected = false;
        this.isConnecting = false;
    }

    /**
     * 处理WebSocket消息
     * @param {string} message - 接收到的消息
     */
    handleWebSocketMessage(message) {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'session.created':
                    this.sessionId = data.session.id;
                    this.updateSession();
                    break;
                    
                case 'session.updated':
                    console.log('会话配置已更新');
                    break;
                    
                case 'input_audio_buffer.committed':
                    this.requestId = data.item_id;
                    // 音频已提交，等待模型回复
                    break;
                    
                case 'response.created':
                    this.responseId = data.response.id;
                    this.resFinished = false;
                    break;
                    
                case 'response.audio.delta':
                    if (this.onAudioData) {
                        this.onAudioData(data.delta);
                    }
                    break;
                    
                case 'response.text.delta':
                    if (this.onTextData) {
                        this.onTextData(data.delta);
                    }
                    break;
                    
                case 'response.audio_transcript.delta':
                    // 音频转录文本
                    break;
                    
                case 'response.done':
                    this.resFinished = true;
                    break;
                    
                case 'error':
                    console.error('GLM-Realtime错误:', data.error);
                    if (this.onError) {
                        this.onError(new Error(data.error.message));
                    }
                    break;
                    
                default:
                    console.log('未处理的事件类型:', data.type);
            }
        } catch (error) {
            console.error('处理WebSocket消息失败:', error);
        }
    }

    /**
     * 更新会话配置
     */
    updateSession() {
        const sessionConfig = {
            event_id: this.generateEventId(),
            type: 'session.update',
            session: {
                modalities: this.config.modalities || ["text", "audio"],
                instructions: this.config.systemPrompt || "你是一个智能语音助手，请用简洁明了的语言回答用户问题。",
                voice: this.config.voice || "tongtong",
                output_audio_format: this.config.output_audio_format || "pcm",
                input_audio_format: this.config.input_audio_format || "wav",
                turn_detection: {
                    type: this.config.vad_type || "server_vad",
                    threshold: this.config.vad_threshold || 0.5,
                    prefix_padding_ms: this.config.prefix_padding_ms || 300,
                    silence_duration_ms: this.config.silence_duration_ms || 500
                },
                tools: this.config.tools || [],
                tool_choice: this.config.tool_choice || "auto",
                temperature: this.config.temperature || 0.8,
                max_response_output_tokens: this.config.max_tokens || "inf"
            }
        };
        
        this.sendMessage(sessionConfig);
    }

    /**
     * 发送音频数据
     * @param {string} audioBase64 - Base64编码的音频数据
     */
    sendAudioData(audioBase64) {
        if (!this.isConnected) {
            console.warn('WebSocket未连接，无法发送音频数据');
            return;
        }
        
        const message = {
            event_id: this.generateEventId(),
            type: 'input_audio_buffer.append',
            client_timestamp: Date.now(),
            audio: audioBase64
        };
        
        this.sendMessage(message);
    }

    /**
     * 发送视频帧数据
     * @param {string} videoFrameBase64 - Base64编码的视频帧数据
     */
    sendVideoFrame(videoFrameBase64) {
        if (!this.isConnected) {
            console.warn('WebSocket未连接，无法发送视频帧数据');
            return;
        }
        
        const message = {
            event_id: this.generateEventId(),
            type: 'input_audio_buffer.append_video_frame',
            client_timestamp: Date.now(),
            video_frame: videoFrameBase64
        };
        
        this.sendMessage(message);
    }

    /**
     * 提交音频数据
     */
    commitAudio() {
        if (!this.isConnected) {
            console.warn('WebSocket未连接，无法提交音频数据');
            return;
        }
        
        const message = {
            event_id: this.generateEventId(),
            type: 'input_audio_buffer.commit',
            client_timestamp: Date.now()
        };
        
        this.sendMessage(message);
    }

    /**
     * 创建模型回复
     */
    createResponse() {
        if (!this.isConnected) {
            console.warn('WebSocket未连接，无法创建模型回复');
            return;
        }
        
        const message = {
            event_id: this.generateEventId(),
            type: 'response.create',
            client_timestamp: Date.now()
        };
        
        this.sendMessage(message);
    }

    /**
     * 取消模型回复
     */
    cancelResponse() {
        if (!this.isConnected) {
            console.warn('WebSocket未连接，无法取消模型回复');
            return;
        }
        
        const message = {
            event_id: this.generateEventId(),
            type: 'response.cancel',
            client_timestamp: Date.now()
        };
        
        this.sendMessage(message);
    }

    /**
     * 发送消息
     * @param {Object} message - 要发送的消息对象
     */
    sendMessage(message) {
        if (this.isConnected && this.websocket) {
            this.websocket.send(JSON.stringify(message));
        } else {
            // 如果未连接，将消息加入队列
            this.messageQueue.push(message);
            console.warn('WebSocket未连接，消息已加入队列');
        }
    }

    /**
     * 生成事件ID
     * @returns {string} UUID格式的事件ID
     */
    generateEventId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * 检查连接状态
     * @returns {boolean} 是否已连接
     */
    isReady() {
        return this.isConnected;
    }

    /**
     * 设置连接打开回调
     * @param {Function} callback - 回调函数
     */
    setOnConnectionOpen(callback) {
        this.onConnectionOpen = callback;
    }

    /**
     * 设置连接关闭回调
     * @param {Function} callback - 回调函数
     */
    setOnConnectionClose(callback) {
        this.onConnectionClose = callback;
    }

    /**
     * 设置音频数据接收回调
     * @param {Function} callback - 回调函数
     */
    setOnAudioData(callback) {
        this.onAudioData = callback;
    }

    /**
     * 设置文本数据接收回调
     * @param {Function} callback - 回调函数
     */
    setOnTextData(callback) {
        this.onTextData = callback;
    }

    /**
     * 设置错误回调
     * @param {Function} callback - 回调函数
     */
    setOnError(callback) {
        this.onError = callback;
    }
}

// 导出类供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfessionalHighStrategy;
} else {
    window.ProfessionalHighStrategy = ProfessionalHighStrategy;
}