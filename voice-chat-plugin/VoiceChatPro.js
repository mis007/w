/**
 * VoiceChatPro.js - Professional Voice Chat Plugin (Browser + API Model Version)
 * Compatibility: Chrome, Edge, Firefox, Safari, WeChat Built-in Browser (Android/iOS)
 */

class VoiceChatPro {
    constructor(config) {
        this.config = Object.assign({
            apiHandler: async (base64Audio) => {
                console.warn('Please configure apiHandler to process audio transmission');
                return "This is a simulated model response: I received your voice message.";
            },
            onStateChange: (state) => { }, // state: 'idle', 'recording', 'processing', 'playing'
            onError: (error) => console.error(error),
            onLog: (msg) => console.log(msg),
            autoSpeak: true, // Whether to automatically speak the response
            lang: 'zh-CN'
        }, config);

        this.recorder = null;
        this.stream = null;
        this.audioChunks = [];
        this.state = 'idle';
        this.isWeChat = /MicroMessenger/i.test(navigator.userAgent);
        this.isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
        this.isAndroid = /Android/i.test(navigator.userAgent);
    }

    /**
     * Update state
     */
    setState(newState) {
        this.state = newState;
        this.config.onStateChange(newState);
    }

    /**
     * Start recording
     */
    async startRecording() {
        try {
            // 1. Environment check
            if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
                throw new Error('Voice functionality requires HTTPS environment');
            }

            // 2. Request permissions
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // 3. Determine recording format (compatible with iOS/WeChat)
            let mimeType = 'audio/webm;codecs=opus';
            if (this.isIOS || this.isWeChat || !MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
            }

            // 4. Create recorder instance
            this.recorder = mimeType ? 
                new MediaRecorder(this.stream, { mimeType }) : 
                new MediaRecorder(this.stream);
            this.audioChunks = [];

            this.recorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.audioChunks.push(e.data);
            };

            this.recorder.onstop = async () => {
                await this._handleRecordingStop();
            };

            // 5. Start recording (chunking to prevent memory overflow)
            this.recorder.start(1000);
            this.setState('recording');
            this.config.onLog('Recording started...');

        } catch (err) {
            this.config.onError(new Error(`Recording failed: ${err.message}`));
            this.setState('idle');
        }
    }

    /**
     * Stop recording
     */
    stopRecording() {
        if (this.recorder && this.state === 'recording') {
            this.recorder.stop();
            // Stop stream
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }
        }
    }

    /**
     * Internal processing: recording end -> to Base64 -> call API -> play response
     */
    async _handleRecordingStop() {
        this.setState('processing');
        this.config.onLog('Recording ended, processing...');

        try {
            // 1. Generate Blob
            const mimeType = this.recorder.mimeType || (this.isIOS || this.isWeChat ? 'audio/mp4' : 'audio/webm');
            const audioBlob = new Blob(this.audioChunks, { type: mimeType });

            // 2. Convert to Base64
            const base64 = await this._blobToBase64(audioBlob);
            this.config.onLog(`Base64 generated successfully (${Math.round(base64.length / 1024)}KB)`);

            // 3. Call user-configured API
            const response = await this.config.apiHandler(base64);

            // Compatible with legacy: if returning string, encapsulate in object
            const result = typeof response === 'string' ? { text: response } : response;

            this.config.onLog(`Response received: ${result.text ? result.text.substring(0, 30) + '...' : 'Audio Data'}`);

            // 4. Play response (priority: audio, then TTS)
            if (this.config.autoSpeak) {
                if (result.audio) {
                    await this.playAudio(result.audio);
                } else if (result.text) {
                    await this.speak(result.text);
                } else {
                    this.setState('idle');
                }
            } else {
                this.setState('idle');
            }

        } catch (err) {
            this.config.onError(new Error(`Processing failed: ${err.message}`));
            this.setState('idle');
        }
    }

    /**
     * Play Base64 audio
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
                    reject(new Error('Failed to play audio response'));
                };

                audio.play().catch(e => {
                    // Handle autoplay policy restrictions
                    console.warn('Autoplay blocked, attempting recovery:', e);
                    this.setState('idle');
                    reject(new Error('Autoplay blocked by browser policies'));
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Text-to-speech (browser native)
     */
    speak(text) {
        return new Promise((resolve, reject) => {
            if (!window.speechSynthesis) {
                const error = new Error('Current browser does not support speech synthesis');
                this.config.onError(error);
                this.setState('idle');
                reject(error);
                return;
            }

            // Cancel previous speech
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = this.config.lang;

            // Try to optimize voice for language
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v => 
                v.lang.includes(this.config.lang.split('-')[0]) && 
                (v.localService || !this.isAndroid) // Android has issues with remote voices
            );
            
            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }

            utterance.rate = 1.0;     // Speed (0.1 to 10)
            utterance.pitch = 1.0;    // Pitch (0 to 2)
            utterance.volume = 1.0;   // Volume (0 to 1)

            utterance.onstart = () => this.setState('playing');
            utterance.onend = () => {
                this.setState('idle');
                resolve();
            };
            utterance.onerror = (e) => {
                console.error('TTS Error:', e);
                this.setState('idle');
                reject(new Error(`Text-to-speech failed: ${e.error}`));
            };

            window.speechSynthesis.speak(utterance);
        });
    }

    /**
     * Helper: Blob to Base64
     */
    _blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    }
    
    /**
     * Check browser support
     */
    static isSupported() {
        return !!(
            navigator.mediaDevices && 
            navigator.mediaDevices.getUserMedia && 
            window.MediaRecorder
        );
    }
    
    /**
     * Get supported MIME types
     */
    static getSupportedMimeTypes() {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/mpeg'
        ];
        return types.filter(type => MediaRecorder.isTypeSupported(type));
    }
}