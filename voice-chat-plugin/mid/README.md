# 中配版 (Mid-Spec) 语音对话插件说明

中配版实现了浏览器语音输入 -> STT文本转换 -> 阿里云Qwen TTS实时语音合成的完整流程，适用于需要高质量语音输出的应用场景。

## 技术架构

```
[浏览器语音输入] 
      ↓
[浏览器STT转换]
      ↓
[文本发送至阿里云Qwen TTS]
      ↓
[实时语音流返回]
      ↓
[浏览器播放语音]
```

## 音频格式支持

### 浏览器录音格式支持

| 浏览器 | WebM/Opus | MP4/AAC | WAV/PCM |
|--------|-----------|---------|---------|
| Chrome | ✅ 完全支持 | ✅ 支持 | ⚠️ 有限支持 |
| Firefox | ✅ 完全支持 | ⚠️ 有限支持 | ⚠️ 有限支持 |
| Safari | ❌ 不支持 | ✅ 支持 | ⚠️ 有限支持 |
| Edge | ✅ 完全支持 | ✅ 支持 | ⚠️ 有限支持 |
| 微信(安卓) | ✅ 支持(X5内核) | ✅ 支持 | ⚠️ 有限支持 |
| 微信(iOS) | ❌ 不支持 | ✅ 支持 | ⚠️ 有限支持 |

### 推荐格式优先级

1. `audio/webm;codecs=opus` - 最佳压缩率和兼容性
2. `audio/mp4` - iOS/微信兼容备选
3. `audio/wav` - 保底选项，文件较大

### 阿里云Qwen TTS支持的输出格式

| 格式 | 参数值 | 说明 |
|------|--------|------|
| PCM | pcm | 未压缩的PCM音频，采样率为16000Hz或24000Hz |
| WAV | wav | WAV封装格式，内部为PCM编码 |
| MP3 | mp3 | MP3压缩格式 |

## 音频编码参数

### 浏览器录音编码参数

```javascript
const constraints = {
    audio: {
        sampleRate: 16000,     // 16kHz采样率（阿里云Qwen TTS推荐）
        channelCount: 1,       // 单声道
        echoCancellation: true, // 回声消除
        noiseSuppression: true // 噪音抑制
    }
};
```

### 阿里云Qwen TTS编码参数

```javascript
const ttsParameters = {
    voice: 'Cherry',         // 发音人选择
    format: 'pcm',           // 音频格式
    sample_rate: 24000       // 采样率（支持16000Hz和24000Hz）
};
```

## Base64编码规范

### 浏览器端Base64编码

浏览器端使用`FileReader.readAsDataURL()`方法生成带MIME前缀的Base64编码：

```
data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC8...
```

格式组成：
- `data:` - Data URI协议标识
- `audio/webm` - MIME类型
- `;base64,` - 编码方式标识
- `GkXfo59...` - Base64编码的音频数据

### 阿里云Qwen TTS返回的Base64编码

阿里云Qwen TTS返回的音频数据也需要转换为带MIME前缀的Base64格式：

```
data:audio/pcm;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==
```

## API接口规范

### STT接口

**请求URL**: `/api/stt`
**请求方法**: POST
**请求头**:
```
Content-Type: application/json
```

**请求体**:
```json
{
  "audio": "data:audio/webm;base64,GkXfo59..."
}
```

**响应**: 纯文本格式的转录结果

### 阿里云Qwen TTS接口

**请求URL**: 阿里云DashScope API endpoint
**请求方法**: POST
**请求头**:
```
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
X-DashScope-Realtime-TTS: enable
```

**请求体**:
```json
{
  "model": "qwen-tts-realtime",
  "input": {
    "text": "你好，世界！"
  },
  "parameters": {
    "voice": "Cherry",
    "format": "pcm",
    "sample_rate": 24000
  }
}
```

**响应**: 音频流数据

## 避坑指南

### 1. 浏览器兼容性问题

#### 微信内置浏览器
- 必须使用HTTPS协议
- 域名需在微信公众平台配置白名单
- 微信版本需≥8.0
- iOS系统只支持MP4格式

#### Safari浏览器
- 不支持WebM格式，需降级为MP4
- 需要用户主动交互才能启用音频功能

#### 解决方案
```javascript
// 检测并适配浏览器支持的格式
let mimeType = 'audio/webm;codecs=opus';
if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
}
```

### 2. 音频质量问题

#### 录制参数优化
```javascript
const constraints = {
    audio: {
        sampleRate: 16000,     // 与阿里云Qwen TTS匹配
        channelCount: 1,       // 单声道
        echoCancellation: true, // 回声消除
        noiseSuppression: true // 噪音抑制
    }
};
```

### 3. STT转换注意事项

#### Base64编码格式
确保生成的音频Base64带有正确的MIME类型前缀：
```
data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC8...
```

#### 音频长度控制
- 单次语音输入建议控制在5-10秒
- 过长的音频可能导致STT准确率下降

### 4. 阿里云Qwen TTS调用

#### 请求头设置
必须包含特殊的实时TTS标识头：
```javascript
headers: {
    'X-DashScope-Realtime-TTS': 'enable'
}
```

#### 参数配置
```javascript
parameters: {
    voice: 'Cherry',        // 发音人
    format: 'pcm',          // 音频格式
    sample_rate: 24000      // 采样率
}
```

### 5. 音频播放问题

#### 格式兼容性
不同浏览器对音频格式的支持不同，需要确保Base64前缀与实际数据匹配：

```javascript
// PCM格式
data:audio/pcm;base64,...

// WAV格式
data:audio/wav;base64,...

// MP3格式
data:audio/mp3;base64,...
```

#### 自动播放策略
现代浏览器通常阻止自动播放音频，需要用户交互后才能播放：

```javascript
// 在用户交互后播放音频
document.getElementById('playButton').addEventListener('click', () => {
    audio.play(); // 这样可以正常播放
});
```

## 最佳实践

1. 始终通过用户交互触发音频功能（浏览器安全限制）
2. 优先使用WebM格式，自动降级到MP4
3. 控制音频输入长度，提高识别准确率
4. 合理设置阿里云Qwen TTS参数以获得自然语音效果
5. 提供明确的用户引导和状态反馈
6. 正确处理Base64编码和MIME类型前缀

## 调试技巧

1. 使用浏览器开发者工具查看网络请求
2. 检查控制台错误信息
3. 验证音频文件是否正确生成
4. 测试不同浏览器的兼容性表现
5. 验证阿里云Qwen TTS返回的音频数据格式