# 低配版 (Low-Spec) 语音对话插件说明

低配版实现了浏览器语音输入 -> 文本模型处理 -> 浏览器TTS输出的完整流程，适用于成本敏感的应用场景。

## 技术架构

```
[浏览器语音输入] 
      ↓
[浏览器STT转换]
      ↓
[文本发送至低成本模型]
      ↓
[模型返回文本结果]
      ↓
[浏览器TTS语音输出]
```

## 推荐模型

### GLM-4.5-Flash (推荐)
智谱AI免费提供的文本模型，具有以下特点：
- 完全免费使用
- 支持128K上下文窗口
- 强大的推理能力
- 支持深度思考模式
- 可通过`thinking.type`参数控制思考模式（enabled/disabled）

API接入点: `https://open.bigmodel.cn/api/paas/v4/chat/completions`

### 其他兼容模型
- 阿里云Qwen系列文本模型
- 百度文心一言ERNIE系列
- 讯飞星火认知大模型

## 浏览器支持的媒体格式

### 音频录制格式支持情况

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

## 文本模型支持的输入格式

大多数文本模型接受标准的Chat格式输入，示例：

```json
{
  "model": "glm-4.5-flash",
  "messages": [
    {"role": "system", "content": "你是一个智能语音助手"},
    {"role": "user", "content": "你好"}
  ]
}
```

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
        sampleRate: 16000,     // 16kHz采样率
        channelCount: 1,       // 单声道
        echoCancellation: true, // 回声消除
        noiseSuppression: true // 噪音抑制
    }
};
```

#### 避免的设置
- 采样率过高（导致文件过大）
- 立体声（增加数据量但对语音识别帮助不大）

### 3. STT转换注意事项

#### Base64编码格式
确保生成的音频Base64带有正确的MIME类型前缀：
```
data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC8...
```

#### 音频长度控制
- 单次语音输入建议控制在5-10秒
- 过长的音频可能导致STT准确率下降

### 4. 文本模型调用

#### GLM-4.5-Flash调用示例
```javascript
const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
        model: 'glm-4.5-flash',
        messages: [
            { role: "system", content: "你是一个智能语音助手" },
            { role: "user", content: "用户语音转换的文本" }
        ],
        thinking: {
            type: "enabled" // 启用深度思考模式
        }
    })
});
```

#### 内容预处理
- 清理STT产生的语气词（"呃"、"嗯"等）
- 处理标点符号规范化
- 数字和日期格式统一

### 5. 浏览器TTS输出

#### 语音合成参数
```javascript
const utterance = new SpeechSynthesisUtterance(text);
utterance.rate = 1.0;    // 语速 (0.1-10)
utterance.pitch = 1.0;   // 音调 (0-2)
utterance.volume = 1.0;  // 音量 (0-1)
```

#### 兼容性处理
- 中文语音在不同系统表现可能不同
- 某些浏览器可能没有合适的中文语音包
- 移动端可能会受到静音模式影响

### 6. 性能优化建议

#### 分块传输
```javascript
// 录制时分块处理，避免内存溢出
recorder.start(1000); // 每1秒生成一个数据块
```

#### 错误处理
```javascript
try {
    // API调用
} catch (error) {
    // 降级处理或友好的错误提示
    console.error('处理失败:', error);
}
```

## 最佳实践

1. 始终通过用户交互触发音频功能（浏览器安全限制）
2. 优先使用WebM格式，自动降级到MP4
3. 控制音频输入长度，提高识别准确率
4. 对STT结果进行简单的文本清洗
5. 合理设置TTS参数以获得自然语音效果
6. 提供明确的用户引导和状态反馈

## 调试技巧

1. 使用浏览器开发者工具查看网络请求
2. 检查控制台错误信息
3. 验证音频文件是否正确生成
4. 测试不同浏览器的兼容性表现