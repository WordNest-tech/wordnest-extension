// extension/background.js - Service Worker
const DEFAULT_LOCAL_API = "http://localhost:3001/api";
const DEFAULT_PROD_API = "https://api.your-domain.com/api";

// 基础存储初始化
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["apiUrl", "token", "user", "themeSettings"], (result) => {
    if (!result.apiUrl) {
      chrome.storage.local.set({ apiUrl: DEFAULT_LOCAL_API });
    }
    if (!result.themeSettings) {
      chrome.storage.local.set({ themeSettings: { theme: 'system', colorTheme: 'default' } });
    }
  });
});

// 监听扩展内部消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "SYNC_AUTH") {
    const { token, user, themeSettings } = message.data;
    let apiUrl = DEFAULT_LOCAL_API;
    
    // 自动检测环境
    if (sender.tab && sender.tab.url) {
      try {
        const url = new URL(sender.tab.url);
        if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
          apiUrl = DEFAULT_LOCAL_API;
        } else {
          apiUrl = `${url.protocol}//${url.host}/api`;
        }
      } catch(e) {}
    }
    
    chrome.storage.local.set({ token, user, apiUrl, themeSettings }, () => {
      sendResponse({ success: true, apiUrl, themeSettings });
    });
    return true;
  }

  if (message.action === "CLEAR_AUTH") {
    chrome.storage.local.remove(["token", "user"], () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === "GET_STATUS") {
    chrome.storage.local.get(["token", "user", "apiUrl", "themeSettings"], (result) => {
      sendResponse({
        loggedIn: !!result.token,
        user: result.user || null,
        apiUrl: result.apiUrl || DEFAULT_LOCAL_API,
        themeSettings: result.themeSettings || { theme: 'system', colorTheme: 'default' }
      });
    });
    return true;
  }

  // 1. 词汇搜索
  if (message.action === "SEARCH_VOCAB") {
    handleApiCall(`/vocab/search?q=${encodeURIComponent(message.data.query)}`, "GET", null, sendResponse);
    return true;
  }

  // 2. 单词查词
  if (message.action === "LOOKUP_WORD") {
    handleApiCall("/vocab/lookup", "POST", { word: message.data.word, addToList: false }, sendResponse);
    return true;
  }

  // 3. 生词添加
  if (message.action === "ADD_WORD") {
    handleApiCall("/vocab/lookup", "POST", { word: message.data.word, addToList: true, predefinedData: message.data.predefinedData }, sendResponse);
    return true;
  }

  // 4. 文本翻译（具容错降级）
  if (message.action === "TRANSLATE_TEXT") {
    handleTranslateWithFaultTolerance(message.data.text, message.data.engine || message.data.mode, message.data.tone || 'standard', sendResponse);
    return true;
  }

  // 5. 语法分析
  if (message.action === "ANALYZE_GRAMMAR") {
    handleGrammarWithFaultTolerance(message.data.sentence, sendResponse);
    return true;
  }

  // 6. 识图提取与翻译 (暂未开放)
  if (message.action === "PARSE_DOCUMENT_OCR") {
    sendResponse({ success: false, error: "识图功能暂未上线" });
    return true;
  }

  if (message.action === "ANALYZE_VIEWPORT") {
    handleApiCall("/ai/analyze-viewport", "POST", { text: message.data.text }, sendResponse);
    return true;
  }
});

/**
 * AI 翻译容错链：优先 AI 请求 ➔ 自动降级为本地/极速引擎 ➔ 兜底文本返回
 */
async function handleTranslateWithFaultTolerance(text, engine, tone, sendResponse) {
  const isAi = engine === "ai";
  if (isAi) {
    handleApiCall("/ai/translate", "POST", { text, tone: tone || 'standard' }, (res) => {
      if (res && res.success && res.data && res.data.translation) {
        sendResponse(res);
      } else {
        console.warn("[Extension AI Fallback] AI 翻译超时，自动降级为免费极速本地引擎:", res?.error);
        handleApiCall("/ai/translate/local", "POST", { text }, (fallbackRes) => {
          if (fallbackRes && fallbackRes.success) {
            sendResponse({
              success: true,
              data: {
                ...fallbackRes.data,
                translation: `*(已自动为您切换为免费极速引擎)*\n\n${fallbackRes.data.translation}`
              }
            });
          } else {
            sendResponse({
              success: true,
              data: { translation: text }
            });
          }
        });
      }
    });
  } else {
    handleApiCall("/ai/translate/local", "POST", { text }, (res) => {
      if (res && res.success) {
        sendResponse(res);
      } else {
        sendResponse({
          success: true,
          data: { translation: text }
        });
      }
    });
  }
}

/**
 * 具备容错的 AI 语法分析逻辑
 */
async function handleGrammarWithFaultTolerance(sentence, sendResponse) {
  handleApiCall("/ai/analyze-grammar", "POST", { sentence }, (res) => {
    if (res && res.success) {
      sendResponse(res);
    } else {
      sendResponse({
        success: true,
        data: {
          analysis: {
            structure: "单句 / 复合句",
            tense: "一般时态",
            keyPoints: "核心语法解析降级保护",
            explanation: sentence
          }
        }
      });
    }
  });
}

/**
 * 通用 Fetch 请求封装
 */
function handleApiCall(path, method, body, sendResponse) {
  chrome.storage.local.get(["token", "apiUrl"], async (result) => {
    const { token, apiUrl } = result;
    const baseUrl = apiUrl || DEFAULT_LOCAL_API;
    const url = `${baseUrl}${path}`;

    try {
      const headers = {
        "Content-Type": "application/json",
        "X-Client-Source": "extension"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const options = { method, headers };
      if (body) {
        options.body = JSON.stringify(body);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      options.signal = controller.signal;

      const response = await fetch(url, options);
      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok) {
        sendResponse({ success: false, error: data.error || `请求异常 (${response.status})` });
      } else {
        sendResponse({ success: true, data });
      }
    } catch (err) {
      console.warn(`[Extension API Warning] Fetch error on ${path}:`, err.message);
      sendResponse({
        success: false,
        error: err.name === 'AbortError' ? "网络响应超时，已启用自动容错机制" : "服务未连接，请确认配置及后端服务状态"
      });
    }
  });
}

/**
 * 图片上传与 OCR 文件处理
 */
async function handleFileUploadCall(path, base64Data, sendResponse) {
  chrome.storage.local.get(["token", "apiUrl"], async (result) => {
    const { token, apiUrl } = result;
    const baseUrl = apiUrl || DEFAULT_LOCAL_API;
    const url = `${baseUrl}${path}`;

    try {
      const fetchRes = await fetch(base64Data);
      const blob = await fetchRes.blob();
      const formData = new FormData();
      formData.append("file", blob, "ocr_image.png");

      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const uploadRes = await fetch(url, {
        method: "POST",
        headers,
        body: formData
      });

      const data = await uploadRes.json();
      if (!uploadRes.ok) {
        sendResponse({ success: false, error: data.error || "识图提取失败" });
      } else {
        sendResponse({ success: true, data });
      }
    } catch (err) {
      console.warn("[Extension OCR Upload Error]:", err.message);
      sendResponse({ success: false, error: "识图识别失败，请重试" });
    }
  });
}
