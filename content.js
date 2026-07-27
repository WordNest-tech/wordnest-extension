// extension/content.js - Content Script for Reading Assistance with Shadow DOM Tooltip

// Helper for robust communication, catching extension context invalidations
function safeSendMessage(message, callback) {
  try {
    if (!chrome.runtime || !chrome.runtime.id) {
      if (callback) callback({ success: false, error: "扩展连接已断开，请刷新页面后重试。" });
      return;
    }
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        const errMsg = chrome.runtime.lastError.message;
        if (callback) {
          callback({ success: false, error: errMsg.includes("context invalidated") ? "扩展已更新，请刷新网页。" : errMsg });
        }
        return;
      }
      if (callback) callback(response);
    });
  } catch (err) {
    if (callback) callback({ success: false, error: "扩展已失效，请刷新网页。" });
  }
}

let selectionBubble = null;
let tooltipContainer = null;
let currentSelectionText = "";
let currentSelectionRect = null;

document.addEventListener("mouseup", handleMouseUp);
document.addEventListener("mousedown", handleMouseDown);

// Ctrl + Click handler for non-selectable elements (cards, buttons, etc)
document.addEventListener("click", function(e) {
  if (e.ctrlKey) {
    e.preventDefault();
    e.stopPropagation();

    if (tooltipContainer && tooltipContainer.contains(e.target)) return;
    if (selectionBubble && selectionBubble.contains(e.target)) return;

    let text = (e.target.innerText || e.target.textContent || "").trim();
    if (!text || text.length > 500) return;
    
    // 必须包含至少一个英文字母
    if (!/[a-zA-Z]/.test(text)) {
      return;
    }

    currentSelectionText = text;
    currentSelectionRect = e.target.getBoundingClientRect();
    
    // Show full tooltip directly at mouse coordinates
    showFullTooltip(e.pageX, e.pageY, text);
  }
}, true);

function handleMouseDown(e) {
  // If clicking outside the tooltip/bubble, remove them
  if (tooltipContainer && !tooltipContainer.contains(e.target)) {
    removeTooltip();
  }
  if (selectionBubble && !selectionBubble.contains(e.target)) {
    removeBubble();
  }
}

function handleMouseUp(e) {
  // Ignore clicks inside our own containers
  if (tooltipContainer && tooltipContainer.contains(e.target)) return;
  if (selectionBubble && selectionBubble.contains(e.target)) return;

  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (!selectedText || selectedText.length > 300) {
    return;
  }
  
  // 必须包含至少一个英文字母，防止纯数字、纯中文或纯标点符号污染服务器数据
  if (!/[a-zA-Z]/.test(selectedText)) {
    return;
  }
  
  currentSelectionText = selectedText;
  
  // Calculate selection coordinates to place the trigger bubble
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  if (rect.width === 0 && rect.height === 0) return;
  
  currentSelectionRect = {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height
  };
  
  showTriggerBubble(
    rect.left + window.scrollX + rect.width / 2,
    rect.top + window.scrollY - 32,
    selectedText
  );
}

// Show a small premium trigger bubble near selection
function showTriggerBubble(x, y, text) {
  removeBubble();
  
  selectionBubble = document.createElement("div");
  selectionBubble.id = "wordnest-trigger-bubble";
  
  // Design styled trigger icon matching WordNest terracotta style
  const shadow = selectionBubble.attachShadow({ mode: "open" });
  
  const style = document.createElement("style");
  style.textContent = `
    .trigger-btn {
      position: absolute;
      left: -17px;
      top: -17px;
      width: 34px;
      height: 34px;
      background: transparent;
      border: none;
      box-shadow: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      margin: 0;
      z-index: 2147483647;
      animation: popIn 0.2s ease-out;
    }
    .trigger-btn svg {
      width: 32px;
      height: 32px;
      transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      filter: drop-shadow(0 3px 6px rgba(181, 105, 74, 0.25));
    }
    .trigger-btn:hover svg {
      transform: scale(1.15);
      filter: drop-shadow(0 4px 10px rgba(181, 105, 74, 0.4));
    }
    @keyframes popIn {
      0% { transform: scale(0); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
  `;
  
  const button = document.createElement("button");
  button.className = "trigger-btn";
  button.title = "WordNest 助手";
  button.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M19 8 Q12 11 5 8 v6 c0 5 2 8 7 8 s7-3 7-8 V8 z" fill="#FFFDF9" stroke="#B5694A" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>
      <path d="M7.5 12.5 Q9 9.5 10.5 12.5 M13.5 12.5 Q15 9.5 16.5 12.5" fill="none" stroke="#B5694A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 14.5 l-1.5 2 h3 z" fill="#B5694A" stroke="#B5694A" stroke-width="1.5" stroke-linejoin="round"></path>
    </svg>
  `;
  
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    removeBubble();
    showFullTooltip(x, y, text);
  });
  
  shadow.appendChild(style);
  shadow.appendChild(button);
  
  selectionBubble.style.position = "absolute";
  selectionBubble.style.left = `${x}px`;
  selectionBubble.style.top = `${y}px`;
  selectionBubble.style.width = "0px";
  selectionBubble.style.height = "0px";
  selectionBubble.style.zIndex = "2147483647";
  
  document.body.appendChild(selectionBubble);
}

// Show the main premium card tooltip (Shadow DOM)
function showFullTooltip(x, y, text) {
  removeTooltip();
  
  // 1. Query background for active user theme settings
  safeSendMessage({ action: "GET_STATUS" }, (statusRes) => {
    let themeSettings = { theme: 'system', colorTheme: 'default' };
    if (statusRes && statusRes.themeSettings) {
      themeSettings = statusRes.themeSettings;
    }
    
    const theme = themeSettings.theme;
    const colorTheme = themeSettings.colorTheme || 'default';
    const effectiveTheme = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;

    tooltipContainer = document.createElement("div");
    tooltipContainer.id = "wordnest-tooltip-card";
    
    const shadow = tooltipContainer.attachShadow({ mode: "open" });
    
    // Inject fonts dynamically
    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap";
    shadow.appendChild(fontLink);

    const style = document.createElement("style");
    style.textContent = `
      /* 1. Default (Warm Humanity) */
      .card, .card[data-color-theme="default"] {
        --bg-card: rgba(255, 251, 245, 0.96);
        --border-card: rgba(181, 105, 74, 0.16);
        --text-main: #2D2A24;
        --text-sec: #4A463E;
        --text-muted: #6B665C;
        --accent-main: #B5694A;
        --accent-hover: #9A5A3F;
        --accent-bg-glow: rgba(181, 105, 74, 0.1);
        --tab-border: rgba(61, 57, 41, 0.08);
        --item-bg: rgba(61, 57, 41, 0.03);
        --success-text: #5E8A5B;
        --success-bg: rgba(94, 138, 91, 0.1);
        --success-border: rgba(94, 138, 91, 0.2);
        --shadow-card: 0 12px 32px rgba(61, 57, 41, 0.12);
      }
      .card[data-theme="dark"], .card[data-theme="dark"][data-color-theme="default"] {
        --bg-card: rgba(42, 38, 31, 0.97);
        --border-card: rgba(255, 255, 255, 0.08);
        --text-main: #F5F2ED;
        --text-sec: #C9C4BB;
        --text-muted: #8F8A80;
        --accent-main: #B5694A;
        --accent-hover: #D07B58;
        --accent-bg-glow: rgba(181, 105, 74, 0.15);
        --tab-border: rgba(255, 255, 255, 0.08);
        --item-bg: rgba(255, 255, 255, 0.03);
        --success-text: #8FB996;
        --success-bg: rgba(94, 138, 91, 0.15);
        --success-border: rgba(94, 138, 91, 0.25);
        --shadow-card: 0 12px 40px rgba(0, 0, 0, 0.4);
      }
      
      /* 2. Romantic Sakura */
      .card[data-color-theme="romantic"] {
        --bg-card: rgba(255, 245, 247, 0.96);
        --border-card: rgba(236, 72, 153, 0.16);
        --text-main: #5F1A37;
        --text-sec: #853A5A;
        --text-muted: #A36B83;
        --accent-main: #EC4899;
        --accent-hover: #DB2777;
        --accent-bg-glow: rgba(236, 72, 153, 0.1);
        --tab-border: rgba(236, 72, 153, 0.08);
        --item-bg: rgba(236, 72, 153, 0.03);
        --success-text: #5E8A5B;
        --success-bg: rgba(94, 138, 91, 0.1);
        --success-border: rgba(94, 138, 91, 0.2);
        --shadow-card: 0 12px 32px rgba(236, 72, 153, 0.1);
      }
      .card[data-theme="dark"][data-color-theme="romantic"] {
        --bg-card: rgba(69, 36, 52, 0.97);
        --border-card: rgba(255, 255, 255, 0.08);
        --text-main: #FCE7F3;
        --text-sec: #F472B6;
        --text-muted: #A36B83;
        --accent-main: #F472B6;
        --accent-hover: #F472B6;
        --accent-bg-glow: rgba(244, 114, 182, 0.15);
        --tab-border: rgba(255, 255, 255, 0.08);
        --item-bg: rgba(255, 255, 255, 0.03);
        --success-text: #8FB996;
        --success-bg: rgba(94, 138, 91, 0.15);
        --success-border: rgba(94, 138, 91, 0.25);
        --shadow-card: 0 12px 40px rgba(0, 0, 0, 0.4);
      }

      /* 3. Nature Forest */
      .card[data-color-theme="nature"] {
        --bg-card: rgba(244, 248, 244, 0.96);
        --border-card: rgba(74, 124, 89, 0.16);
        --text-main: #2D3A30;
        --text-sec: #435447;
        --text-muted: #6B7C6E;
        --accent-main: #4A7C59;
        --accent-hover: #3C6448;
        --accent-bg-glow: rgba(74, 124, 89, 0.1);
        --tab-border: rgba(74, 124, 89, 0.08);
        --item-bg: rgba(74, 124, 89, 0.03);
        --success-text: #4A7C59;
        --success-bg: rgba(74, 124, 89, 0.1);
        --success-border: rgba(74, 124, 89, 0.2);
        --shadow-card: 0 12px 32px rgba(74, 124, 89, 0.08);
      }
      .card[data-theme="dark"][data-color-theme="nature"] {
        --bg-card: rgba(40, 55, 46, 0.97);
        --border-card: rgba(255, 255, 255, 0.08);
        --text-main: #E8F0E8;
        --text-sec: #8FB996;
        --text-muted: #6B7C6E;
        --accent-main: #8FB996;
        --accent-hover: #A3CBB0;
        --accent-bg-glow: rgba(143, 185, 150, 0.15);
        --tab-border: rgba(255, 255, 255, 0.08);
        --item-bg: rgba(255, 255, 255, 0.03);
        --success-text: #8FB996;
        --success-bg: rgba(94, 138, 91, 0.15);
        --success-border: rgba(94, 138, 91, 0.25);
        --shadow-card: 0 12px 40px rgba(0, 0, 0, 0.4);
      }

      /* 4. Fresh Ocean */
      .card[data-color-theme="ocean"] {
        --bg-card: rgba(240, 249, 255, 0.96);
        --border-card: rgba(14, 165, 233, 0.16);
        --text-main: #164E63;
        --text-sec: #0369A1;
        --text-muted: #0284C7;
        --accent-main: #0EA5E9;
        --accent-hover: #0284C7;
        --accent-bg-glow: rgba(14, 165, 233, 0.1);
        --tab-border: rgba(14, 165, 233, 0.08);
        --item-bg: rgba(14, 165, 233, 0.03);
        --success-text: #5E8A5B;
        --success-bg: rgba(94, 138, 91, 0.1);
        --success-border: rgba(94, 138, 91, 0.2);
        --shadow-card: 0 12px 32px rgba(14, 165, 233, 0.08);
      }
      .card[data-theme="dark"][data-color-theme="ocean"] {
        --bg-card: rgba(28, 37, 65, 0.97);
        --border-card: rgba(255, 255, 255, 0.08);
        --text-main: #E0F2FE;
        --text-sec: #38BDF8;
        --text-muted: #0EA5E9;
        --accent-main: #38BDF8;
        --accent-hover: #7DD3FC;
        --accent-bg-glow: rgba(56, 189, 248, 0.15);
        --tab-border: rgba(255, 255, 255, 0.08);
        --item-bg: rgba(255, 255, 255, 0.03);
        --success-text: #8FB996;
        --success-bg: rgba(94, 138, 91, 0.15);
        --success-border: rgba(94, 138, 91, 0.25);
        --shadow-card: 0 12px 40px rgba(0, 0, 0, 0.4);
      }

      /* 5. Cyber Tech */
      .card[data-color-theme="cyber"] {
        --bg-card: rgba(255, 248, 245, 0.96);
        --border-card: rgba(255, 107, 53, 0.16);
        --text-main: #2B1D12;
        --text-sec: #6B4E3D;
        --text-muted: #8F6F5E;
        --accent-main: #FF6B35;
        --accent-hover: #E0531D;
        --accent-bg-glow: rgba(255, 107, 53, 0.1);
        --tab-border: rgba(255, 107, 53, 0.08);
        --item-bg: rgba(255, 107, 53, 0.03);
        --success-text: #5E8A5B;
        --success-bg: rgba(94, 138, 91, 0.1);
        --success-border: rgba(94, 138, 91, 0.2);
        --shadow-card: 0 12px 32px rgba(255, 107, 53, 0.08);
      }
      .card[data-theme="dark"][data-color-theme="cyber"] {
        --bg-card: rgba(45, 45, 45, 0.97);
        --border-card: rgba(255, 255, 255, 0.08);
        --text-main: #FF9F1C;
        --text-sec: #FFD166;
        --text-muted: #A3A3A3;
        --accent-main: #FF6B35;
        --accent-hover: #FF8552;
        --accent-bg-glow: rgba(255, 107, 53, 0.15);
        --tab-border: rgba(255, 255, 255, 0.08);
        --item-bg: rgba(255, 255, 255, 0.03);
        --success-text: #8FB996;
        --success-bg: rgba(94, 138, 91, 0.15);
        --success-border: rgba(94, 138, 91, 0.25);
        --shadow-card: 0 12px 40px rgba(0, 0, 0, 0.4);
      }

      /* 6. Minimalist */
      .card[data-color-theme="minimal"] {
        --bg-card: rgba(250, 250, 250, 0.96);
        --border-card: rgba(0, 0, 0, 0.08);
        --text-main: #111111;
        --text-sec: #444444;
        --text-muted: #888888;
        --accent-main: #000000;
        --accent-hover: #333333;
        --accent-bg-glow: rgba(0, 0, 0, 0.04);
        --tab-border: rgba(0, 0, 0, 0.08);
        --item-bg: rgba(0, 0, 0, 0.02);
        --success-text: #444444;
        --success-bg: rgba(0, 0, 0, 0.05);
        --success-border: rgba(0, 0, 0, 0.1);
        --shadow-card: 0 12px 32px rgba(0, 0, 0, 0.04);
      }
      .card[data-theme="dark"][data-color-theme="minimal"] {
        --bg-card: rgba(37, 37, 37, 0.97);
        --border-card: rgba(255, 255, 255, 0.08);
        --text-main: #FFFFFF;
        --text-sec: #CCCCCC;
        --text-muted: #888888;
        --accent-main: #FFFFFF;
        --accent-hover: #E0E0E0;
        --accent-bg-glow: rgba(255, 255, 255, 0.1);
        --tab-border: rgba(255, 255, 255, 0.08);
        --item-bg: rgba(255, 255, 255, 0.03);
        --success-text: #CCCCCC;
        --success-bg: rgba(255, 255, 255, 0.1);
        --success-border: rgba(255, 255, 255, 0.15);
        --shadow-card: 0 12px 40px rgba(0, 0, 0, 0.4);
      }

      .card {
        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        position: absolute;
        width: 320px;
        max-height: 420px;
        overflow-y: auto;
        background: var(--bg-card);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid var(--border-card);
        border-radius: 16px;
        box-shadow: var(--shadow-card);
        color: var(--text-main);
        padding: 18px;
        z-index: 2147483647;
        animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        scrollbar-width: thin;
        scrollbar-color: var(--border-card) transparent;
      }
      .card::-webkit-scrollbar {
        width: 6px;
      }
      .card::-webkit-scrollbar-thumb {
        background: var(--border-card);
        border-radius: 3px;
      }
      @keyframes slideUp {
        0% { transform: translateY(10px); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
      }
      .tabs {
        display: flex;
        border-bottom: 1px solid var(--tab-border);
        margin-bottom: 12px;
        padding-bottom: 6px;
      }
      .tab {
        flex: 1;
        background: none;
        border: none;
        color: var(--text-muted);
        font-size: 13px;
        font-weight: 600;
        padding: 6px 0;
        cursor: pointer;
        text-align: center;
        transition: all 0.2s;
      }
      .tab.active {
        color: var(--accent-main);
        border-bottom: 2px solid var(--accent-main);
      }
      .content-area {
        min-height: 80px;
      }
      .loading-spinner {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100px;
        color: var(--text-muted);
        font-size: 13px;
        gap: 10px;
      }
      .spinner {
        width: 24px;
        height: 24px;
        border: 3px solid var(--accent-bg-glow);
        border-top-color: var(--accent-main);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      /* Translate mode bar inside tooltip */
      .translate-mode-bar {
        display: flex;
        background: var(--item-bg);
        border: 1px solid var(--tab-border);
        border-radius: 8px;
        padding: 2px;
        margin-bottom: 12px;
        gap: 2px;
      }
      .mode-btn {
        flex: 1;
        background: transparent;
        border: none;
        color: var(--text-muted);
        font-size: 11px;
        font-weight: 600;
        padding: 5px 0;
        cursor: pointer;
        border-radius: 6px;
        transition: all 0.2s;
        text-align: center;
      }
      .mode-btn:hover {
        color: var(--text-main);
      }
      .mode-btn.active {
        color: white;
        background: var(--accent-main);
      }
      .translation-text {
        font-size: 13px;
        line-height: 1.6;
        color: var(--text-sec);
        white-space: pre-wrap;
      }

      /* Word lookup UI */
      .word-header {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 12px;
      }
      .word-title {
        font-size: 20px;
        font-weight: 700;
        color: var(--text-main);
      }
      .phonetic-wrapper {
        display: flex;
        align-items: center;
        gap: 4px;
        color: var(--accent-main);
        font-size: 14px;
        margin-bottom: 0;
      }
      .audio-btn {
        background: none;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        padding: 2px;
      }
      .audio-btn svg {
        width: 16px;
        height: 16px;
        stroke: var(--accent-main);
        fill: none;
        stroke-width: 2;
      }
      .pos-tag {
        display: inline-block;
        padding: 2px 6px;
        background: var(--accent-bg-glow);
        color: var(--accent-main);
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
        margin-right: 6px;
        text-transform: lowercase;
      }
      .definition {
        font-size: 14px;
        line-height: 1.5;
        color: var(--text-sec);
        margin-bottom: 12px;
        text-align: left;
      }
      .def-line {
        margin-top: 2px;
      }
      .example-box {
        background: var(--item-bg);
        border-left: 3px solid var(--accent-main);
        padding: 8px 12px;
        border-radius: 4px;
        margin-bottom: 16px;
      }
      .example-en {
        font-size: 13px;
        font-style: italic;
        color: var(--text-sec);
        margin-bottom: 4px;
      }
      .example-zh {
        font-size: 12px;
        color: var(--text-muted);
      }
      .action-btn {
        width: 100%;
        padding: 10px;
        background: linear-gradient(135deg, var(--accent-main), var(--accent-hover));
        color: #FFFBF5;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        box-shadow: 0 4px 12px rgba(181, 105, 74, 0.25);
      }
      .action-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(181, 105, 74, 0.4);
      }
      .action-btn.saved {
        background: var(--success-bg);
        color: var(--success-text);
        border: 1px solid var(--success-border);
        box-shadow: none;
        cursor: default;
      }
      /* Sentence Translation & Analysis */
      .translation-text {
        font-size: 14px;
        line-height: 1.6;
        color: var(--text-sec);
        margin-bottom: 12px;
      }
      .analysis-section {
        margin-bottom: 12px;
      }
      .section-title {
        font-size: 11px;
        text-transform: uppercase;
        color: var(--accent-main);
        font-weight: 700;
        letter-spacing: 0.05em;
        margin-bottom: 4px;
      }
      .section-body {
        font-size: 13px;
        line-height: 1.5;
        color: var(--text-sec);
        background: var(--item-bg);
        padding: 8px;
        border-radius: 6px;
        border: 1px solid var(--border-card);
      }
      .error-msg {
        color: #C45C5C;
        font-size: 13px;
        text-align: center;
        padding: 10px;
      }
    `;
    
    const card = document.createElement("div");
    card.className = "card";
    
    // Apply user selected themes
    card.setAttribute('data-theme', effectiveTheme);
    card.setAttribute('data-color-theme', colorTheme);
    
    // Decide active tab and contents based on selection length (under 10 words allows lookup & saving)
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const isLookupable = wordCount < 10;
    let activeTab = isLookupable ? "lookup" : "translate";
    
    // Render structure
    card.innerHTML = `
      <div class="tabs">
        ${isLookupable ? `<button class="tab active" data-tab="lookup">词句释义</button>` : ''}
        <button class="tab ${!isLookupable ? 'active' : ''}" data-tab="translate">翻译</button>
        <button class="tab" data-tab="analyze">长句语法解析</button>
      </div>
      <div class="content-area">
        <div class="loading-spinner">
          <div class="spinner"></div>
          <span>AI正在思考...</span>
        </div>
      </div>
    `;
    
    shadow.appendChild(style);
    shadow.appendChild(card);
    
    // Set floating position (prevent going off-screen)
    const tooltipWidth = 320;
    const tooltipHeight = 350;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let leftPos = x - tooltipWidth / 2;
    let topPos = y - tooltipHeight - 15;
    
    // Position relative to actual selected text bounding box to avoid overlapping highlight
    if (currentSelectionRect) {
      leftPos = currentSelectionRect.left + window.scrollX + currentSelectionRect.width / 2 - tooltipWidth / 2;
      topPos = currentSelectionRect.top + window.scrollY - tooltipHeight - 15;
      
      // If it goes off-screen top, show below selection with comfortable 15px gap
      if (currentSelectionRect.top + window.scrollY - tooltipHeight - 15 < 10) {
        topPos = currentSelectionRect.bottom + window.scrollY + 15;
      }
    } else {
      if (topPos < 10) topPos = y + 40;
    }
    
    if (leftPos < 10) leftPos = 10;
    if (leftPos + tooltipWidth > viewportWidth - 10) leftPos = viewportWidth - tooltipWidth - 10;
    
    tooltipContainer.style.position = "absolute";
    tooltipContainer.style.left = `${leftPos}px`;
    tooltipContainer.style.top = `${topPos}px`;
    tooltipContainer.style.zIndex = "2147483647";
    
    document.body.appendChild(tooltipContainer);
    
    // Initialize content loaded by active tab
    loadTabData(activeTab, text, shadow);
    
    // Tab click events
    shadow.querySelectorAll(".tab").forEach(tabBtn => {
      tabBtn.addEventListener("click", () => {
        shadow.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        tabBtn.classList.add("active");
        const tabName = tabBtn.getAttribute("data-tab");
        loadTabData(tabName, text, shadow);
      });
    });
  });
}

// Function to trigger tab load
function loadTabData(tab, text, shadow) {
  const contentArea = shadow.querySelector(".content-area");
  contentArea.innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
      <span>AI正在思考...</span>
    </div>
  `;
  
  if (tab === "lookup") {
    safeSendMessage({ action: "LOOKUP_WORD", data: { word: text } }, (res) => {
      if (!res || !res.success) {
        contentArea.innerHTML = `<div class="error-msg">${(res && res.error) || '请求失败，请检查登录状态'}</div>`;
        return;
      }
      
      const vocab = res.data.vocabulary;
      const saved = res.data.saved;
      let parsedExample = { en: "", zh: "" };
      
      if (vocab.example) {
        try {
          const ex = typeof vocab.example === 'string' ? JSON.parse(vocab.example) : vocab.example;
          if (Array.isArray(ex) && ex.length > 0) {
            parsedExample = ex[0];
          } else if (ex.en) {
            parsedExample = ex;
          }
        } catch(e) {}
      }

      // 去掉所有类型的前导空格（包括全角空格），强制左对齐，并转为数组形式
      const defLines = vocab.definition 
        ? vocab.definition.replace(/\\n/g, '\n').split('\n').map(line => line.replace(/^[\s\u3000\xA0]+|[\s\u3000\xA0]+$/g, '')).filter(line => line) 
        : [];
      
      contentArea.innerHTML = `
        <div class="word-header">
          <span class="word-title">${vocab.word}</span>
          ${vocab.phonetic ? `
            <div class="phonetic-wrapper">
              <span>/${vocab.phonetic}/</span>
              <button class="audio-btn" id="play-pron">
                <svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
              </button>
            </div>
          ` : ''}
        </div>
        
        <div class="definition">
          ${vocab.partOfSpeech ? `<span class="pos-tag">${vocab.partOfSpeech}</span>` : ''}
          ${defLines.map(line => `<div class="def-line">${line}</div>`).join('')}
        </div>
        
        ${parsedExample.en ? `
          <div class="example-box">
            <div class="example-en">${parsedExample.en}</div>
            <div class="example-zh">${parsedExample.zh}</div>
          </div>
        ` : ''}
        
        <button class="action-btn ${saved ? 'saved' : ''}" id="add-vocab-btn" ${saved ? 'disabled' : ''}>
          ${saved ? '✓ 已成功同步至生词本' : '+ 一键加入生词本'}
        </button>
      `;
      
      // Pronunciation speaker
      const playBtn = shadow.getElementById("play-pron");
      if (playBtn) {
        playBtn.addEventListener("click", () => {
          const u = new SpeechSynthesisUtterance(vocab.word);
          u.lang = "en-US";
          window.speechSynthesis.speak(u);
        });
      }
      
      // Save word button
      const addBtn = shadow.getElementById("add-vocab-btn");
      if (addBtn && !saved) {
        addBtn.addEventListener("click", () => {
          addBtn.disabled = true;
          addBtn.textContent = "正在同步中...";
          safeSendMessage({ action: "ADD_WORD", data: { word: vocab.word, predefinedData: vocab } }, (saveRes) => {
            if (saveRes && saveRes.success) {
              addBtn.className = "action-btn saved";
              addBtn.textContent = "✓ 已成功同步至生词本";
            } else {
              addBtn.disabled = false;
              addBtn.textContent = "同步失败，重试";
            }
          });
        });
      }
    });
  } 
  else if (tab === "translate") {
    contentArea.innerHTML = `
      <div class="translate-mode-bar">
        <button class="mode-btn active" data-mode="fast">极速翻译</button>
        <button class="mode-btn" data-mode="ai">AI 翻译</button>
      </div>
      <div class="translate-result-container">
        <div class="loading-spinner">
          <div class="spinner"></div>
          <span>极速翻译中...</span>
        </div>
      </div>
    `;

    const modeButtons = contentArea.querySelectorAll(".mode-btn");
    const resultContainer = contentArea.querySelector(".translate-result-container");

    const performTranslation = (mode) => {
      resultContainer.innerHTML = `
        <div class="loading-spinner">
          <div class="spinner"></div>
          <span>${mode === 'ai' ? 'AI 正在翻译...' : '极速翻译中...'}</span>
        </div>
      `;

      safeSendMessage({ action: "TRANSLATE_TEXT", data: { text, mode } }, (res) => {
        if (!res || !res.success) {
          resultContainer.innerHTML = `<div class="error-msg">${(res && res.error) || '翻译失败，请先登录'}</div>`;
          return;
        }
        resultContainer.innerHTML = `
          <div class="translation-text">${res.data.translation}</div>
        `;
      });
    };

    // Bind mode click events
    modeButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        if (btn.classList.contains("active")) return;
        modeButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        performTranslation(btn.getAttribute("data-mode"));
      });
    });

    // Run initial default fast translation
    performTranslation("fast");
  } 
  else if (tab === "analyze") {
    safeSendMessage({ action: "ANALYZE_GRAMMAR", data: { sentence: text } }, (res) => {
      if (!res || !res.success) {
        contentArea.innerHTML = `<div class="error-msg">${(res && res.error) || '解析失败，请确保账号有权限'}</div>`;
        return;
      }
      const ana = res.data.analysis;
      contentArea.innerHTML = `
        <div class="analysis-section">
          <div class="section-title">核心主干</div>
          <div class="section-body">${ana.structure || '暂无'}</div>
        </div>
        <div class="analysis-section">
          <div class="section-title">核心时态</div>
          <div class="section-body">${ana.tense || '暂无'}</div>
        </div>
        <div class="analysis-section">
          <div class="section-title">句法分析</div>
          <div class="section-body" style="white-space: pre-line;">${ana.explanation || '暂无'}</div>
        </div>
        ${ana.keyPoints ? `
          <div class="analysis-section">
            <div class="section-title">关键语法点</div>
            <div class="section-body" style="white-space: pre-line;">${ana.keyPoints}</div>
          </div>
        ` : ''}
      `;
    });
  }
}

function removeBubble() {
  if (selectionBubble) {
    selectionBubble.remove();
    selectionBubble = null;
  }
}

function removeTooltip() {
  if (tooltipContainer) {
    tooltipContainer.remove();
    tooltipContainer = null;
  }
}

// Ctrl + H hotkey for Viewport AI Analysis
document.addEventListener("keydown", function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
    e.preventDefault();
    e.stopPropagation();
    
    // Get visible English text in viewport
    const text = getViewportEnglishText();
    if (!text) {
      alert("当前视口内未检测到明显的英文文本。");
      return;
    }
    
    // Dispatch custom event to communicate with sidebar.js
    window.dispatchEvent(new CustomEvent("wordnest-analyze-viewport", {
      detail: { text }
    }));
  }
});

function getViewportEnglishText() {
  const textNodes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  const viewHeight = window.innerHeight;
  const viewWidth = window.innerWidth;
  
  while (node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent) continue;
    
    // Ignore script, style, and our own elements
    if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' || parent.closest('#wordnest-global-sidebar') || parent.closest('#wordnest-tooltip-card')) {
      continue;
    }
    
    // Basic visibility check
    const style = window.getComputedStyle(parent);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      continue;
    }
    
    const rect = parent.getBoundingClientRect();
    const inView = (
      rect.bottom > 0 &&
      rect.top < viewHeight &&
      rect.right > 0 &&
      rect.left < viewWidth
    );
    
    if (inView) {
      const text = node.nodeValue.trim();
      // Must contain English letters
      if (text && /[a-zA-Z]/.test(text)) {
        textNodes.push(text);
      }
    }
  }
  
  return textNodes.join(" ").substring(0, 3000); // limit to 3000 chars
}
