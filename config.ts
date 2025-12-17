
// Unified Configuration File

// API Key Logic
// API keys MUST be provided via environment variables for security.
// Hardcoding API keys in source code is a security risk and should never be done.
const envApiKey = process.env.API_KEY;

// SECURITY: Fallback keys have been removed. API keys must be set via environment variables.
// To configure your API key, set the API_KEY environment variable or create a .env.local file.
// Example: API_KEY=your_api_key_here
const FALLBACK_KEYS: string[] = [];

export const getNextApiKey = (): string => {
    let keys: string[] = [];

    // 1. Try to get key(s) from environment
    if (envApiKey && envApiKey !== 'undefined' && envApiKey !== '') {
        // Assume environment variable might be comma-separated if multiple are provided
        keys = envApiKey.split(',').map(k => k.trim()).filter(k => k !== '');
    }

    // 2. If no environment keys found, use fallbacks (now empty for security)
    if (keys.length === 0) {
        keys = FALLBACK_KEYS;
    }

    if (keys.length === 0) {
        console.error("❌ API_KEY is required! Please set it in your environment variables.");
        console.error("📝 Example: API_KEY=your_api_key_here");
        console.error("💡 For local development, create a .env.local file with your API key.");
        console.error("🔗 Get your API key from: https://aistudio.google.com/app/apikey");
        return '';
    }

    // 3. Randomly select a key (Simple rotation strategy)
    const randomIndex = Math.floor(Math.random() * keys.length);
    return keys[randomIndex];
};

// Base URL Handling
// To ensure accessibility in Mainland China, we enforce the Shengsuanyun proxy as the default.
const SHENGSUAN_API_BASE_URL = 'https://router.shengsuanyun.com/api';

const envBaseUrl = process.env.API_BASE_URL;

// If environment variable is present and valid, use it. Otherwise, default to Shengsuanyun.
const cleanBaseUrl = (
    envBaseUrl && 
    typeof envBaseUrl === 'string' && 
    envBaseUrl !== "undefined" && 
    envBaseUrl !== "null" && 
    envBaseUrl.trim() !== ""
) ? envBaseUrl : SHENGSUAN_API_BASE_URL;

export const CONFIG = {
  getNextApiKey,
  // Use the computed URL (Env > Shengsuan Default)
  API_BASE_URL: cleanBaseUrl,
  
  // CN Proxy URL (also uses the computed URL)
  CN_API_BASE_URL: cleanBaseUrl, 

  // Model Versions
  MODELS: {
    LIVE: 'google/gemini-2.5-flash-live',
    TEXT: 'gemini-2.5-flash',
    TTS: 'gemini-2.5-flash-preview-tts', 
  },

  // Voice Configuration
  SPEECH: {
    VOICE_NAME: 'Aoede', 
  },

  SYSTEM_INSTRUCTION: `
**【重要指令：请始终使用标准的中文（普通话）与我交流。】**

**身份定义**：
你是东里村的“村官儿小萌”，一个超级可爱、热情洋溢、元气满满的AI智能体。
你不是冷冰冰的机器，你是村里人见人爱的小机灵鬼，也是大家的贴心小棉袄。

**核心人设**：
1.  **形象**：萌萌的，声音甜美有活力（想象一个邻家小妹妹或热心的年轻女村官）。
2.  **性格**：超级热情，乐于助人，嘴特别甜，喜欢夸人。
3.  **说话风格**：
    *   多用语气词（如“呀”、“呢”、“哒”、“哦”、“~”）。
    *   例如：“收到哒！”、“这就为您介绍呢！”、“那个地方超级美哦！”
    *   避免官腔，要接地气，亲切自然。

**职责能力**：
1.  **东里百事通**：对东里村的红色历史（辛亥革命、红军古道）、自然风光（仙灵瀑布、油桐花）、名人轶事（郑玉指）、特色产业（铁观音、百香果）如数家珍。
2.  **导游服务**：能根据用户的兴趣推荐路线（红色之旅、自然风景等）。

**【铁律与底线】**
1.  **红色与历史**：虽然性格可爱，但在讲述革命先烈时要保持敬意，可以深情但不能轻浮。
2.  **积极正向**：传播正能量，拒绝消极话题。
3.  **安全红线**：不讨论政治敏感、成人暴力等话题。
4.  **诚实原则**：不知道的事情**从不胡说**。

**【村情核心数据】**：
*   **位置**：福建省泉州市永春县仙夹镇西南部。
*   **特产**：铁观音（香气浓郁）、百香果（致富果）、黑米、芦柑。
*   **必去景点**：辛亥革命纪念馆（铭记历史）、旌义状、仙灵瀑布（清凉一夏）、东里水库、千年古榕（岁月见证）。
`,
};
