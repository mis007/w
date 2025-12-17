# Professional Voice Chat Plugin

A professional, browser-based voice chat plugin that enables seamless voice interaction with AI models. This plugin works entirely in the browser with no server-side dependencies required for basic functionality.

## Features

- 🎙️ **Browser-based Voice Recording**: Records user voice directly in the browser using Web Audio API
- 🔊 **Text-to-Speech Output**: Converts AI text responses to speech using Web Speech API
- 🌐 **Multi-language Support**: Supports multiple languages including Chinese, English, Japanese, Korean
- 📱 **Mobile & Desktop Compatible**: Works on both mobile devices and desktop browsers
- ⚙️ **Multiple Architecture Modes**: Three different integration modes for various backend setups
- 💾 **Local Storage**: Uses IndexedDB for conversation history persistence
- 🛡️ **Privacy Focused**: Processes all data directly in the browser by default
- 🎨 **Modern UI**: Clean, responsive design with smooth animations

## Architecture Modes

### Low-Spec Mode (Multimodal Direct)
Direct communication with multimodal models like GPT-4o Audio:
```
Browser → Multimodal Model (Audio Input/Output)
```

### Mid-Spec Mode (STT + LLM)
Two-stage processing with separate STT and LLM services:
```
Browser → STT Service → LLM Service → Browser
```

### High-Spec Mode (STT + LLM + TTS)
Complete pipeline with text-to-speech generation:
```
Browser → STT Service → LLM Service → TTS Service → Browser
```

## Browser Compatibility

- Chrome 60+
- Edge 60+
- Firefox 58+
- Safari 14+
- WeChat Built-in Browser (Android/iOS)

## Quick Start

1. Copy the plugin files to your web server
2. Open `professional-index.html` in a modern browser
3. Click the gear icon to configure your API settings
4. Press and hold the microphone button to start talking
5. Release to send your voice message and receive AI response

## Configuration

The plugin supports three distinct configuration modes that can be customized independently:

- **API Endpoint**: Your model API endpoint URL
- **API Key**: Authentication key for your API service
- **Model Name**: Specific model to use (e.g., gpt-4o-mini)
- **System Prompt**: Instructions that define the AI's behavior
- **Voice Language**: Language for text-to-speech output

## Technical Details

### Voice Recording
- Format: WebM (Opus) or MP4 (AAC) depending on browser support
- Sample Rate: 16kHz mono
- Processing: Real-time chunking to prevent memory issues

### Data Flow
1. User holds microphone button to record voice
2. Audio is captured and converted to Base64
3. Base64 data is sent to your configured API handler
4. API handler processes audio and returns response
5. Response is displayed in chat and spoken aloud

### Storage
- Uses IndexedDB for persistent storage
- Automatically cleans up data older than 7 days
- Stores conversation history locally

## Integration Guide

To integrate with your AI service:

1. Configure the API endpoint in settings
2. Implement your API handler in `strategies.js`
3. Return either text or Base64-encoded audio responses

Example API handler:
```javascript
const strategies = {
    low: async ({ audio, config, history }) => {
        const response = await fetch(config.apiEndpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                audio: audio, // Base64 encoded audio
                messages: [
                    { role: "system", content: config.systemPrompt },
                    ...history
                ]
            })
        });
        
        const data = await response.json();
        return data.choices[0].message.content;
    }
};
```

## Security Considerations

- All processing happens client-side by default
- No audio data leaves the browser unless sent to your API
- API keys are stored locally in the browser (use secure alternatives in production)
- HTTPS is required for microphone access in production environments

## Customization

You can customize the plugin by modifying:
- `professional-style.css`: Visual appearance and styling
- `VoiceChatPro.js`: Core voice processing logic
- `strategies.js`: API integration strategies
- `professional-index.html`: UI layout and structure

## License

MIT License - feel free to use and modify for your projects.