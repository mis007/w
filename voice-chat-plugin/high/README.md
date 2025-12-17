# 高配版 (High-Spec) 语音对话插件说明

高配版实现了基于智谱AI GLM-Realtime模型的实时语音对话功能，支持音频和视频两种交互模式，提供最佳的语音交互体验。

## 技术架构

```
[浏览器音频/视频输入] 
        ↓
[WebSocket实时传输]
        ↓
[智谱AI GLM-Realtime模型]
        ↓
[实时音频输出]
        ↓
[浏览器播放]
```

## 功能特性

### 实时语音对话
- 支持低延迟的实时语音交互
- 双向语音通信
- 支持语音打断功能
- 自动语音识别(ASR)和文本转语音(TTS)

### 视频通话模式
- 支持视频流实时传输
- 支持屏幕共享功能
- 视频与语音同步处理
- 多模态交互体验

### 智能功能
- 支持Function Call功能调用
- 可集成外部工具和知识库
- 支持清唱功能
- 多语言实时翻译

## 支持的模型

### GLM-Realtime-Flash (推荐)
- 音频：0.18元/分钟
- 视频：1.2元/分钟
- 适合一般应用场景

### GLM-Realtime-Air
- 音频：0.3元/分钟
- 视频：2.1元/分钟
- 更高质量的语音和视频体验

## WebSocket通信协议

### 连接地址
```
wss://open.bigmodel.cn/api/paas/v4/realtime
```

### 认证方式
在WebSocket连接URL中添加Authorization参数：
```
wss://open.bigmodel.cn/api/paas/v4/realtime?Authorization=YOUR_API_KEY
```

### 主要事件类型

#### 客户端事件
1. `session.update` - 更新会话配置
2. `input_audio_buffer.append` - 上传音频数据
3. `input_audio_buffer.append_video_frame` - 上传视频帧
4. `input_audio_buffer.commit` - 提交音频数据
5. `response.create` - 触发模型回复
6. `response.cancel` - 取消模型回复

#### 服务端事件
1. `session.created` - 会话创建完成
2. `session.updated` - 会话更新完成
3. `input_audio_buffer.committed` - 音频提交确认
4. `conversation.item.created` - 对话项创建
5. `response.created` - 回复开始生成
6. `response.audio.delta` - 音频流式输出
7. `response.text.delta` - 文本流式输出
8. `response.audio_transcript.delta` - 音频转录文本
9. `response.done` - 回复生成完成
10. `error` - 错误信息

## 音视频格式支持

### 音频格式
- 输入格式：WAV or PCM (Base64编码)
- 输出格式：MP3 or PCM (Base64编码)

### 视频格式
- 输入格式：JPG图片 (Base64编码)
- 推荐帧率：根据网络情况调整

## VAD检测模式

### Server VAD模式
- 由模型智能检测语音活动
- 自动决定何时开始和结束语音识别
- 客户端实现简单，只需持续上传音频

### Client VAD模式
- 客户端自行检测语音活动
- 需要手动控制音频提交时机
- 更精确的控制，但实现复杂度较高

## 会话配置参数

```javascript
{
  "modalities": ["text", "audio"], // 支持的输出模态
  "instructions": "系统提示词", // 类似于system prompt
  "voice": "tongtong", // 发音人选择
  "output_audio_format": "pcm", // 音频输出格式
  "input_audio_format": "wav", // 音频输入格式
  "turn_detection": {
    "type": "server_vad", // VAD类型
    "threshold": 0.5, // 检测阈值
    "prefix_padding_ms": 300, // 前缀填充毫秒
    "silence_duration_ms": 500 // 静默检测毫秒
  },
  "tools": [], // 工具列表
  "tool_choice": "auto", // 工具选择策略
  "temperature": 0.8, // 采样温度
  "max_response_output_tokens": "inf" // 最大输出token数
}
```

## 避坑指南

### 1. 连接问题
- 确保使用HTTPS协议部署应用
- 检查API Key是否正确配置
- 验证网络连接是否允许WebSocket通信

### 2. 音频质量问题
- 使用16kHz采样率的音频输入
- 确保音频数据连续且无中断
- 避免在网络较差的环境下使用

### 3. 视频传输问题
- 控制视频帧率以避免网络拥塞
- 确保视频分辨率适中
- 处理视频流时注意内存泄漏问题

### 4. 性能优化
- 合理控制音频数据发送频率(推荐100ms一帧)
- 及时释放ObjectURL避免内存泄漏
- 实现合理的错误重连机制

### 5. 浏览器兼容性
- 现代浏览器基本都支持所需API
- 移动端需要处理权限请求
- iOS Safari可能需要特殊处理

## 最佳实践

1. 实现连接状态监控和自动重连机制
2. 合理处理音频和视频数据的缓冲
3. 提供清晰的用户界面反馈
4. 实现优雅的错误处理和用户提示
5. 注意保护用户隐私和数据安全
6. 根据网络状况动态调整视频质量

## 调试技巧

1. 使用浏览器开发者工具监控WebSocket通信
2. 记录关键事件的时间戳以分析延迟
3. 检查音频数据的连续性和完整性
4. 监控内存使用情况避免泄漏
5. 测试不同网络环境下的表现