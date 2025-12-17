/**
 * VoiceChat.js - 万能语音对话插件 (浏览器 + API大模型版)
 * 兼容性：Chrome, Edge, Firefox, Safari, 微信内置浏览器 (Android/iOS)
 */

class VoiceChat {
    constructor(config) {
        this.config = Object.assign({
            apiHandler: async (base64Audio) => {
                console.warn('请配置 apiHandler 来处理音频发送');
                return "这是模拟的大模型回复：我收到了你的语音。";
            },
            onStateChange: (state) => { }, // state: 'idle', 'recording', 'processing', 'playing'
            onError: (error) => console.error(error),
            onLog: (msg) => console.log(msg),
            autoSpeak: true, // 是否自动朗读回复
            lang: 'zh-CN'
        }, config);

        this.recorder = null;
        this.stream = null;
        this.audioChunks = [];
        this.state = 'idle';
        this.isWeChat = /MicroMessenger/i.test(navigator.userAgent);
        this.isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    }

    /**
     * 更新状态
     */
    setState(newState) {
        this.state = newState;
        this.config.onStateChange(newState);
    }

    /**
     * 开始录音
     */
    async startRecording() {
        try {
            // 1. 环境检查
            if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
                throw new Error('语音功能需要 HTTPS 环境');
            }

            // 2. 获取权限
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            // 3. 确定录制格式 (兼容 iOS/微信)
            let mimeType = 'audio/webm;codecs=opus';
            if (this.isIOS || !MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
            }

            // 4. 创建录音实例
            this.recorder = mimeType ? new MediaRecorder(this.stream, { mimeType }) : new MediaRecorder(this.stream);
            this.audioChunks = [];

            this.recorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.audioChunks.push(e.data);
            };

            this.recorder.onstop = async () => {
                await this._handleRecordingStop();
            };

            // 5. 开始录制 (分片防止内存溢出)
            this.recorder.start(1000);
            this.setState('recording');
            this.config.onLog('开始录音...');

        } catch (err) {
            this.config.onError(err);
            this.setState('idle');
        }
    }

    /**
     * 停止录音
     */
    stopRecording() {
        if (this.recorder && this.state === 'recording') {
            this.recorder.stop();
            // 停止流
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }
        }
    }

    /**
     * 内部处理：录音结束 -> 转Base64 -> 调用API -> 播放回复
     */
    async _handleRecordingStop() {
        this.setState('processing');
        this.config.onLog('录音结束，正在处理...');

        try {
            // 1. 生成 Blob
            const mimeType = this.recorder.mimeType || 'audio/mp4';
            const audioBlob = new Blob(this.audioChunks, { type: mimeType });

            // 2. 转 Base64
            const base64 = await this._blobToBase64(audioBlob);
            this.config.onLog(`生成 Base64 成功 (${Math.round(base64.length / 1024)}KB)`);

            // 3. 调用用户配置的 API
            const response = await this.config.apiHandler(base64);

            // 兼容旧版：如果返回的是字符串，封装成对象
            const result = typeof response === 'string' ? { text: response } : response;

            this.config.onLog(`收到回复: ${result.text ? result.text.substring(0, 20) + '...' : 'Audio Data'}`);

            // 4. 播放回复 (优先播放音频，其次TTS)
            if (this.config.autoSpeak) {
                if (result.audio) {
                    await this.playAudio(result.audio);
                } else if (result.text) {
                    this.speak(result.text);
                } else {
                    this.setState('idle');
                }
            } else {
                this.setState('idle');
            }

        } catch (err) {
            this.config.onError(err);
            this.setState('idle');
        }
    }

    /**
     * 播放 Base64 音频
     */
    playAudio(base64Audio) {
        return new Promise((resolve, reject) => {
            try {
                const audio = new Audio(base64Audio);

                audio.onplay = () => this.setState('playing');
                audio.onended = () => {
                    this.setState('idle');
                    resolve();
                };
                audio.onerror = (e) => {
                    console.error('Audio Playback Error:', e);
                    this.setState('idle');
                    reject(e);
                };

                audio.play().catch(e => {
                    // 处理自动播放策略限制
                    console.warn('自动播放被拦截，尝试恢复:', e);
                    this.setState('idle');
                    reject(e);
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * 文本转语音 (浏览器原生)
     */
    speak(text) {
        if (!window.speechSynthesis) {
            this.config.onError(new Error('当前浏览器不支持语音合成'));
            this.setState('idle');
            return;
        }

        // 取消之前的朗读
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.config.lang;

        // 尝试优化中文语音
        const voices = window.speechSynthesis.getVoices();
        const zhVoice = voices.find(v => v.lang.includes('zh') && v.localService);
        if (zhVoice) utterance.voice = zhVoice;

        utterance.onstart = () => this.setState('playing');
        utterance.onend = () => this.setState('idle');
        utterance.onerror = (e) => {
            console.error('TTS Error:', e);
            this.setState('idle');
        };

        window.speechSynthesis.speak(utterance);
    }

    /**
     * 辅助：Blob 转 Base64
     */
    _blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
        });
    }
}
