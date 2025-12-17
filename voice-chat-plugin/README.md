# AI Voice Chat Plugin (AI 语音助手插件)

这是一个轻量级、零后端依赖的 AI 语音对话插件解决方案。它集成了语音录制、本地记忆存储、模拟 API 调用以及语音合成（TTS）功能，支持 PC 和移动端（包括微信内置浏览器）。

## ✨ 核心特性

* **全端兼容**：支持 Chrome, Edge, Safari, Firefox 以及 **微信内置浏览器** (Android/iOS)。
* **零后端依赖**：录音、格式转换 (WebM/MP4)、Base64 编码全部在浏览器端完成。
* **本地记忆 (Memory)**：集成 **Dexie.js** (IndexedDB)，自动保存聊天记录，刷新页面不丢失。
* **智能上下文**：发送请求时自动提取最近的本地记忆，让 AI 拥有“上下文意识”。
* **自动清理**：内置数据过期清理机制（默认 7 天），防止本地存储膨胀。
* **语音合成 (TTS)**：自动朗读 AI 的回复内容。
* **模块化设计**：核心逻辑封装在 `VoiceChat.js` 和 `db.js` 中，易于集成到任何项目。

## 📂 文件结构

```text
voice-chat-plugin/
├── index.html      # 演示页面 (UI + 业务逻辑集成)
├── style.css       # 样式文件 (适配移动端)
├── VoiceChat.js    # 核心插件 (录音、TTS、状态管理)
├── db.js           # 数据库模块 (基于 Dexie.js 的本地存储)
└── README.md       # 说明文档
```

## 🚀 快速开始

1. **下载代码**：将所有文件保存在同一个目录中。
2. **启动服务**：
    * 由于浏览器安全限制（麦克风权限），**必须使用 HTTPS** 或 `localhost` / `127.0.0.1` 运行。
    * 推荐使用 VS Code 的 "Live Server" 插件，或者 `python -m http.server`。
3. **打开页面**：访问 `http://127.0.0.1:5500/index.html`。
4. **开始对话**：点击/按住麦克风按钮说话。

## 🛠️ 配置与集成

### 1. 初始化插件 (`index.html`)

```javascript
const voiceChat = new VoiceChat({
    // 核心：处理音频并返回 AI 回复
    apiHandler: async (base64Audio) => {
        // 1. 获取本地记忆 (上下文)
        const history = await db.getHistory(10);
        
        // 2. 构造 Payload
        const payload = {
            audio: base64Audio,
            messages: [
                { role: 'system', content: '你是一个AI助手...' },
                ...history.map(msg => ({ role: msg.role, content: msg.content }))
            ]
        };

        // 3. TODO: 发送给你的后端 API
        // const res = await fetch('/api/chat', ...);
        
        return "这是模拟的 AI 回复"; 
    },
    
    // 状态回调 (用于更新 UI)
    onStateChange: (state) => { /* idle, recording, processing, playing */ },
    
    // 自动朗读回复
    autoSpeak: true, 
    lang: 'zh-CN'
});
```

### 2. 数据库操作 (`db.js`)

插件使用 `VoiceChatDB` 类管理数据，你可以直接调用：

```javascript
// 获取最近 10 条记录
const history = await db.getHistory(10);

// 清空所有记录
await db.clearAll();

// 删除单条记录
await db.deleteRecord(id);
```

## 🔌 架构模式与接口说明 (Architecture & API)

本插件支持两种对接模式，你可以根据你的模型能力选择：

### 1. 低配版：极简多模态直连 (Low-Spec / Multimodal)

**"浏览器当作嘴巴，模型直接听懂 Base64"**

* **适用场景**：你使用的是支持语音输入的模型（如 **GPT-4o Audio**, **Gemini 1.5 Pro**）。
* **流程**：前端录音 (Base64) -> **直接发给模型** -> 模型返回文本 -> 前端朗读。
* **优势**：架构极致简单，后端仅需转发，无需 STT 服务。
* **请求示例**：

    ```json
    {
      "audio": "data:audio/webm;base64,GkXfo...", 
      "model": "gpt-4o-audio-preview",
      "messages": [...]
    }
    ```

### 2. 中配版：经典文本组合 (Mid-Spec / Classic)

**"浏览器只负责传声，中间层负责翻译"**

* **适用场景**：你使用的是普通的文本模型（如 **DeepSeek**, **Claude 3.5**, **GPT-4**, **Llama 3**）。
* **流程**：前端录音 (Base64) -> **后端调用 STT (如 Whisper)** -> 转为文本 -> **发给文本模型** -> 模型返回文本 -> 前端朗读。
* **优势**：兼容性最强，可以使用任何便宜/开源的文本大模型。
* **后端伪代码**：

    ```javascript
    // 1. 接收前端 Base64
    // 2. 调用 Whisper 转文字: const text = await stt(audio);
    // 3. 调用 LLM: const reply = await llm(text);
    // 4. 返回: { "text": reply }
    ```

### 3. 高配版：全能语音流 (High-Spec / Pro)

**"极致体验，媲美真人对话"**

* **适用场景**：对语音质量有极高要求，希望听到类似 GPT-4o Advanced Voice 或真人情感的语音。
* **流程**：前端录音 -> 后端处理 (STT+LLM) -> **后端 TTS (如 OpenAI TTS/ElevenLabs)** -> 返回音频 -> 前端播放。
* **优势**：摆脱浏览器僵硬的机械音，获得最自然的对话体验。
* **后端伪代码**：

    ```javascript
    // ... 获取 LLM 回复 text ...
    // 调用高质量 TTS 生成音频
    const audioBuffer = await tts.generate(text); 
    return { 
        "text": text,
        "audio": "data:audio/mp3;base64," + audioBuffer.toString('base64') 
    };
    ```

### 4. 期望返回格式 (Response)

插件支持返回文本或音频，**优先播放音频**：

**方案 A：返回文本 (默认)**
使用浏览器的 `SpeechSynthesis` 朗读，音质取决于用户设备。

```json
{
  "text": "你好！我是你的 AI 助手。" 
}
```

**方案 B：返回音频 (推荐)**
直接播放后端返回的高质量语音文件 (MP3/WAV/WebM)。

```json
{
  "text": "你好！我是...", // (可选) 用于界面展示
  "audio": "data:audio/mp3;base64,SUQzBAAAAA..." // (可选) 优先播放此音频
}
```

## �📱 兼容性说明

| 平台 | 录音格式 | 备注 |
| :--- | :--- | :--- |
| Chrome / Edge / Android | `audio/webm` | 原生支持，体积小 |
| iOS (Safari / 微信) | `audio/mp4` | 自动回退到 MP4/AAC |
| 微信内置浏览器 | ✅ 支持 | 需配置 HTTPS 域名 |

## ⚠️ 注意事项

1. **HTTPS 强制要求**：浏览器获取麦克风权限必须在 HTTPS 环境下（本地 localhost 除外）。
2. **API 对接**：`index.html` 中的 `apiHandler` 目前是模拟返回，请务必替换为你真实的后端 API 调用代码。
3. **iOS 自动播放**：iOS Safari 限制音频自动播放，TTS 可能需要用户产生交互（点击）后才能播放，插件已尽量优化此流程。

## 🤝 贡献

欢迎修改和优化代码，打造你自己的 AI 语音助手！
