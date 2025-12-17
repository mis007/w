
// Unified Configuration File

// API Key Logic
// We accept keys from the environment or fall back to the provided hardcoded keys.
const envApiKey = process.env.API_KEY;

// The user provided two keys. We include them here as fallbacks.
// In a production environment, it is best practice to set these in the environment variables,
// but for this specific "fix my deployment" request, we include them to ensure it works immediately.
const FALLBACK_KEYS = [
    'AIzaSyDj_dBkgo-CHIh6_JEliYHN05ocpVCKcok',
    'AIzaSyDOwx49dtscB5l8kuseZPXKC5CTJsB3jks'
];

export const getNextApiKey = (): string => {
    let keys: string[] = [];

    // 1. Try to get key(s) from environment
    if (envApiKey && envApiKey !== 'undefined' && envApiKey !== '') {
        // Assume environment variable might be comma-separated if multiple are provided
        keys = envApiKey.split(',').map(k => k.trim()).filter(k => k !== '');
    }

    // 2. If no environment keys found, use fallbacks
    if (keys.length === 0) {
        keys = FALLBACK_KEYS;
    }

    if (keys.length === 0) {
        console.error("API_KEY is missing in environment variables and no fallbacks available.");
        return '';
    }

    // 3. Randomly select a key (Simple rotation strategy)
    const randomIndex = Math.floor(Math.random() * keys.length);
    return keys[randomIndex];
};

// Base URL Handling
// GLOBAL_BASE_URL: Standard Google Endpoint
// CN_BASE_URL: Dedicated Proxy/Relay for Mainland China
// User provided router: https://router.shengsuanyun.com/api
const envBaseUrl = process.env.API_BASE_URL;

// Default to the provided router URL if not overridden by env
const DEFAULT_ROUTER_URL = "https://router.shengsuanyun.com/api";

const cleanBaseUrl = (
    envBaseUrl && 
    typeof envBaseUrl === 'string' && 
    envBaseUrl !== "undefined" && 
    envBaseUrl !== "null" && 
    envBaseUrl.trim() !== ""
) ? envBaseUrl : DEFAULT_ROUTER_URL;

export const CONFIG = {
  getNextApiKey,
  API_BASE_URL: cleanBaseUrl,
  
  // Potential CN Proxy URL (In production, this would be your domestic relay server)
  // For this demo, it falls back to the standard URL, but the architecture allows separation.
  CN_API_BASE_URL: cleanBaseUrl, 

  // Model Versions
  MODELS: {
    // Updated to the model supported by the router
    LIVE: 'google/gemini-2.5-flash-live',
    // Fallback/Text models (might need standard names if router supports them, or keep defaults if using standard API for text)
    // Assuming the router proxies standard names too, or we use standard ones for text.
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
