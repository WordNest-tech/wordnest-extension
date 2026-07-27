// extension/sidebar.js - 100% Pixel Perfect Replica of Website Sidebar
(function() {
  if (window.__WORDNEST_SIDEBAR_INJECTED__) return;
  window.__WORDNEST_SIDEBAR_INJECTED__ = true;

  function safeSendMessage(message, callback) {
    try {
      if (!chrome.runtime || !chrome.runtime.sendMessage) {
        if (callback) callback({ success: false, error: "扩展服务未就绪，请刷新页面" });
        return;
      }
      chrome.runtime.sendMessage(message, (response) => {
        const lastErr = chrome.runtime.lastError;
        if (lastErr) {
          if (callback) callback({ success: false, error: "请刷新页面重试" });
        } else {
          if (callback) callback(response);
        }
      });
    } catch (e) {
      if (callback) callback({ success: false, error: "扩展已重载" });
    }
  }

  const container = document.createElement('div');
  container.id = 'wordnest-sidebar-container';
  container.setAttribute('data-theme', 'light');
  
  const shadow = container.attachShadow({ mode: 'open' });
  
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700&display=swap');
    
    :host {
      --bg-primary: #FFFFFF;
      --bg-secondary: #FFF5F7;
      --bg-card: #FFFFFF;
      --text-primary: #0F172A;
      --text-secondary: #475569;
      --text-muted: #94A3B8;
      --border-subtle: #FCE7F3;
      --accent-primary: #ec4899;
      --accent-primary-hover: #db2777;
    }
    
    :host([data-theme="dark"]) {
      --bg-primary: #0F172A;
      --bg-secondary: #1E293B;
      --bg-card: #1E293B;
      --text-primary: #F8FAFC;
      --text-secondary: #CBD5E1;
      --text-muted: #64748B;
      --border-subtle: rgba(255, 255, 255, 0.1);
      --accent-primary: #f472b6;
    }
    
    * { box-sizing: border-box; font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    
    /* Fixed Edge Toggle Button */
    .toggle-btn {
      position: fixed;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-right: none;
      border-radius: 12px 0 0 12px;
      padding: 10px 7px;
      cursor: pointer;
      box-shadow: -2px 0 10px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      z-index: 2147483646;
      pointer-events: auto;
      transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .toggle-btn:hover {
      background: var(--bg-secondary);
      border-color: var(--accent-primary);
    }
    .toggle-btn .icon {
      color: var(--accent-primary);
      width: 16px;
      height: 16px;
    }
    .toggle-btn .text {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-primary);
      writing-mode: vertical-rl;
      letter-spacing: 2px;
    }
    
    /* Sidebar Drawer Panel */
    .sidebar-panel {
      position: fixed;
      right: -420px;
      top: 0;
      height: 100vh;
      width: 380px;
      background: var(--bg-primary);
      box-shadow: -5px 0 25px rgba(0,0,0,0.12);
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      border-left: 1px solid var(--border-subtle);
      pointer-events: auto;
    }
    .sidebar-panel.open {
      right: 0;
    }
    
    /* Resize Handle */
    .resize-handle {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 6px;
      cursor: ew-resize;
      z-index: 10;
    }
    
    /* Header matching website exactly */
    .header {
      padding: 12px 16px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .dot-ping {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
    }
    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .close-btn:hover {
      background: var(--border-subtle);
      color: var(--text-primary);
    }

    /* Tabs Bar matching website 1:1 */
    .sidebar-tabs {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      padding: 6px 10px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-subtle);
      gap: 4px;
      flex-shrink: 0;
    }
    .sidebar-tab {
      background: transparent;
      border: none;
      padding: 6px 4px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: all 0.2s;
    }
    .sidebar-tab.active {
      background: var(--bg-card);
      color: var(--accent-primary);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      border: 1px solid var(--border-subtle);
      font-weight: 700;
    }

    /* Content Area */
    .content {
      padding: 12px;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
      overflow-y: auto;
    }

    /* Language Switcher Capsule */
    .lang-bar {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .lang-box {
      flex: 1;
      background: var(--bg-secondary);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      padding: 7px 10px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .lang-prefix {
      font-size: 9px;
      font-weight: 700;
      color: var(--accent-primary);
      background: color-mix(in srgb, var(--accent-primary) 12%, transparent);
      padding: 1px 4px;
      border-radius: 4px;
    }
    .swap-btn {
      background: var(--bg-secondary);
      border: 1px solid var(--border-subtle);
      border-radius: 50%;
      width: 28px;
      height: 28px;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .swap-btn:hover {
      border-color: var(--accent-primary);
      color: var(--accent-primary);
    }

    /* Engine & Tone Selector Row matching website */
    .selector-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: var(--text-muted);
      padding: 2px 0;
    }
    .selector-label {
      font-size: 11px;
      color: var(--text-secondary);
      font-weight: 600;
    }
    .pill-group {
      display: flex;
      gap: 4px;
    }
    .pill-btn {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 3px 8px;
      font-size: 10px;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 3px;
      transition: all 0.2s;
    }
    .pill-btn.active {
      background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
      color: var(--accent-primary);
      border-color: var(--accent-primary);
      font-weight: 700;
    }

    /* Input Card matching website */
    .input-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .input-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 6px;
      margin-bottom: 4px;
    }
    .input-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--accent-primary);
    }
    textarea {
      width: 100%;
      background: transparent;
      border: none;
      resize: vertical;
      outline: none;
      font-size: 12px;
      color: var(--text-primary);
      line-height: 1.5;
      min-height: 90px;
    }
    textarea::placeholder {
      color: var(--text-muted);
      opacity: 0.6;
    }
    .input-footer {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: var(--text-muted);
      padding-top: 4px;
      border-top: 1px dashed var(--border-subtle);
    }

    /* Main Submit Button matching website pink full-width */
    .submit-btn {
      width: 100%;
      padding: 10px;
      background: var(--accent-primary);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      box-shadow: 0 2px 6px color-mix(in srgb, var(--accent-primary) 30%, transparent);
    }
    .submit-btn:hover:not(:disabled) {
      opacity: 0.92;
    }
    .submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Output Card */
    .output-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 12px;
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 130px;
    }
    .output-header {
      padding-bottom: 6px;
      margin-bottom: 6px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      font-weight: 700;
      color: var(--accent-primary);
    }
    .output-body {
      font-size: 12px;
      color: var(--text-primary);
      line-height: 1.6;
      white-space: pre-wrap;
      flex: 1;
      overflow-y: auto;
    }

    /* Pulse Skeleton Loading Animation */
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    .animate-pulse {
      animation: pulse 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    /* SVG Icon uniform sizing */
    svg {
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .spinner { animation: spin 1s linear infinite !important; transform-origin: center; }
  `;
  shadow.appendChild(style);
  
  const Icons = {
    languages: '<svg viewBox="0 0 24 24"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    arrowLR: '<svg viewBox="0 0 24 24"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>',
    loader: '<svg viewBox="0 0 24 24" class="spinner"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    volume: '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    zap: '<svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>',
    cpu: '<svg viewBox="0 0 24 24"><rect width="12" height="12" x="6" y="6" rx="2"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3"/></svg>',
    fileText: '<svg viewBox="0 0 24 24"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>'
  };
  
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <!-- Edge Fixed Toggle Button -->
    <div class="toggle-btn" id="toggleBtn" title="展开助手侧边栏">
      <div class="icon">${Icons.languages}</div>
      <div class="text">
        <span>学</span>
        <span>习</span>
      </div>
    </div>
    
    <div class="sidebar-panel" id="sidebarPanel">
      <div class="resize-handle" id="resizeHandle"></div>
      
      <!-- Top Header 1:1 with Website -->
      <div class="header">
        <div class="header-left">
          <div style="color:var(--accent-primary);">
            ${Icons.languages}
          </div>
          <div class="header-title">
            <span>极速翻译</span>
            <span class="dot-ping" title="服务就绪"></span>
          </div>
        </div>
        <button class="close-btn" id="closeBtn" title="收起侧边栏">
          ${Icons.x}
        </button>
      </div>

      <!-- Segmented Tabs 1:1 with Website -->
      <div class="sidebar-tabs" id="sidebarTabsContainer">
        <button class="sidebar-tab active" id="tabTranslate">
          ${Icons.zap} <span>极速翻译</span>
        </button>
        <button class="sidebar-tab" id="tabAnalyze">
          ${Icons.book} <span>语法拆解</span>
        </button>
        <button class="sidebar-tab" id="tabOcr" style="display: none;">
          ${Icons.fileText} <span>识图翻译</span>
        </button>
        <button class="sidebar-tab" id="tabLookup">
          ${Icons.search} <span>查词</span>
        </button>
      </div>
      
      <div class="content">
        <!-- Panel 1: Translate -->
        <div class="panel-section active" id="panelTranslate" style="display: flex; flex-direction: column; gap: 10px;">
          <!-- 语种切换 1:1 -->
          <div class="lang-bar">
            <div class="lang-box" id="sourceLang">
              <span class="lang-prefix">GB</span>
              <span>英语 (en)</span>
            </div>
            <button class="swap-btn" id="swapBtn" title="互换语种">
              ${Icons.arrowLR}
            </button>
            <div class="lang-box" id="targetLang">
              <span class="lang-prefix">CN</span>
              <span>中文 (zh)</span>
            </div>
          </div>

          <!-- 翻译引擎选择行 1:1 匹配网站 -->
          <div class="selector-row">
            <span class="selector-label">翻译引擎:</span>
            <div class="pill-group">
              <button class="pill-btn active" data-engine="free">
                ${Icons.shield} <span>免费极速</span>
              </button>
              <button class="pill-btn" data-engine="wasm">
                ${Icons.cpu} <span>离线端侧</span>
              </button>
              <button class="pill-btn" data-engine="ai">
                ${Icons.zap} <span>智能润色</span>
              </button>
            </div>
          </div>

          <!-- 润色风格选择行 1:1 (当选择智能润色时显示) -->
          <div class="selector-row" id="toneRow" style="display: none;">
            <span class="selector-label">润色风格:</span>
            <div class="pill-group">
              <button class="pill-btn active" data-tone="standard">标准</button>
              <button class="pill-btn" data-tone="oral">口语</button>
              <button class="pill-btn" data-tone="academic">学术</button>
              <button class="pill-btn" data-tone="concise">精炼</button>
            </div>
          </div>
          
          <!-- 待处理原文 Card 1:1 -->
          <div class="input-card">
            <div class="input-header">
              <span class="input-title">待处理原文</span>
            </div>
            <textarea id="sourceText" rows="4" placeholder="请输入或粘贴待翻译文本...&#10;快捷键: Ctrl + Enter 极速翻译"></textarea>
            <div class="input-footer">
              <span id="charCount">0 字符</span>
              <span>按 Ctrl+Enter 执行</span>
            </div>
          </div>
          
          <!-- 全宽提交按钮 1:1 -->
          <button class="submit-btn" id="submitBtn">
            <span>极速翻译 (免费服务)</span>
          </button>
          
          <!-- 翻译结果 Card 1:1 -->
          <div class="output-card">
            <div class="output-header">
              <div style="display:flex;align-items:center;gap:6px;">
                <span>翻译结果</span>
                <span id="engineBadge" style="font-size:9px;font-family:monospace;padding:1px 5px;background:color-mix(in srgb, var(--accent-primary) 12%, transparent);border-radius:4px;border:1px solid color-mix(in srgb, var(--accent-primary) 20%, transparent);">[免费极速]</span>
              </div>
              <div style="display:flex;align-items:center;gap:4px;">
                <button id="speakBtn" style="background:transparent;border:none;color:var(--text-muted);cursor:pointer;padding:2px;" title="朗读译文">${Icons.volume}</button>
                <button id="copyBtn" style="background:transparent;border:none;color:var(--text-muted);cursor:pointer;padding:2px;" title="复制译文">${Icons.copy}</button>
              </div>
            </div>
            <div class="output-body" id="resultContent">
              <span style="color: var(--text-muted); opacity: 0.5; font-style: italic; font-size: 11px;">此处显示翻译结果...</span>
            </div>
          </div>
        </div>

        <!-- Panel 2: Analyze Grammar -->
        <div class="panel-section" id="panelAnalyze" style="display: none; flex-direction: column; gap: 10px;">
          <div class="input-card">
            <div class="input-header">
              <span class="input-title">长难句语法剖析</span>
            </div>
            <textarea id="grammarText" rows="4" placeholder="请输入或粘贴英文长难句..."></textarea>
            <div class="input-footer">
              <span>按 Ctrl+Enter 开始拆解</span>
            </div>
          </div>
          <button class="submit-btn" id="grammarSubmitBtn">
            <span>语法结构分析</span>
          </button>
          <div class="output-card" style="flex:1;">
            <div class="output-header">语法分析报告</div>
            <div id="grammarResultContent" style="font-size:12px; line-height:1.5;">
              <div style="text-align:center; color:var(--text-muted); opacity:0.5; font-style:italic; padding:30px 0;">
                输入文本后点击【语法结构分析】生成报告
              </div>
            </div>
          </div>
        </div>

        <!-- Panel 3: OCR Image Translation -->
        <div class="panel-section" id="panelOcr" style="display: none; flex-direction: column; gap: 10px;">
          <div style="border: 2px dashed var(--border-subtle); border-radius: 12px; padding: 24px 12px; text-align: center; background: var(--bg-secondary); cursor: pointer;" id="ocrDropzone">
            <div style="font-size: 12px; font-weight: bold; color: var(--text-primary);">点击选择、拖拽或按 Ctrl + V 粘贴截图</div>
            <div style="font-size: 10px; color: var(--text-muted); margin-top: 6px;">支持直接 Ctrl + V 粘贴截图 (PNG/JPG)</div>
            <input type="file" id="ocrFileInput" accept="image/*" style="display: none;">
          </div>
          <div id="ocrPreviewArea" style="display: none; text-align: center; gap: 8px; flex-direction: column;">
            <img id="ocrPreviewImg" style="max-height: 150px; max-width: 100%; border-radius: 8px; border: 1px solid var(--border-subtle); margin: 0 auto; object-fit: contain;">
            <button class="submit-btn" id="ocrSubmitBtn">
              <span>开始识图提取与翻译</span>
            </button>
          </div>
        </div>

        <!-- Panel 4: Lookup Word -->
        <div class="panel-section" id="panelLookup" style="display: none; flex-direction: column; gap: 10px;">
          <div style="position:relative;">
            <input type="text" id="lookupInput" style="width:100%; padding:8px 36px 8px 12px; font-size:12px; border:1px solid var(--border-subtle); border-radius:8px; outline:none; background:var(--bg-card); color:var(--text-primary);" placeholder="输入英语或中文查词...">
            <button id="lookupSearchBtn" style="position:absolute; right:6px; top:50%; transform:translateY(-50%); background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:2px;" title="搜索">${Icons.search}</button>
          </div>
          <div style="flex: 1; overflow-y: auto;" id="lookupResults">
            <div style="text-align: center; color: var(--text-muted); font-size: 11px; padding: 30px 0;">
              输入内容并点击搜索开始查询
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  shadow.appendChild(wrapper);
  document.body.appendChild(container);
  
  // States
  let isOpen = false;
  let sourceIsEn = true;
  let currentWidth = 380;
  let currentEngine = 'free'; // 'free' | 'wasm' | 'ai'
  let currentTone = 'standard'; // 'standard' | 'oral' | 'academic' | 'concise'
  let pendingOcrBase64 = null;
  let currentTranslationResult = '';
  
  // DOM Elements
  const toggleBtn = shadow.getElementById('toggleBtn');
  const sidebarPanel = shadow.getElementById('sidebarPanel');
  const resizeHandle = shadow.getElementById('resizeHandle');
  const closeBtn = shadow.getElementById('closeBtn');
  const sourceLangEl = shadow.getElementById('sourceLang');
  const targetLangEl = shadow.getElementById('targetLang');
  const swapBtn = shadow.getElementById('swapBtn');
  const sourceTextEl = shadow.getElementById('sourceText');
  const charCountEl = shadow.getElementById('charCount');
  const submitBtn = shadow.getElementById('submitBtn');
  const resultContentEl = shadow.getElementById('resultContent');
  const copyBtn = shadow.getElementById('copyBtn');
  const speakBtn = shadow.getElementById('speakBtn');
  const engineBadge = shadow.getElementById('engineBadge');
  const toneRow = shadow.getElementById('toneRow');

  // Tabs
  const tabTranslate = shadow.getElementById('tabTranslate');
  const tabAnalyze = shadow.getElementById('tabAnalyze');
  const tabOcr = shadow.getElementById('tabOcr');
  const tabLookup = shadow.getElementById('tabLookup');
  
  // Panels
  const panelTranslate = shadow.getElementById('panelTranslate');
  const panelAnalyze = shadow.getElementById('panelAnalyze');
  const panelOcr = shadow.getElementById('panelOcr');
  const panelLookup = shadow.getElementById('panelLookup');
  
  // Grammar Elements
  const grammarTextEl = shadow.getElementById('grammarText');
  const grammarSubmitBtn = shadow.getElementById('grammarSubmitBtn');
  const grammarResultContent = shadow.getElementById('grammarResultContent');

  // OCR Elements
  const ocrDropzone = shadow.getElementById('ocrDropzone');
  const ocrFileInput = shadow.getElementById('ocrFileInput');
  const ocrPreviewArea = shadow.getElementById('ocrPreviewArea');
  const ocrPreviewImg = shadow.getElementById('ocrPreviewImg');
  const ocrSubmitBtn = shadow.getElementById('ocrSubmitBtn');

  // Lookup Elements
  const lookupInput = shadow.getElementById('lookupInput');
  const lookupSearchBtn = shadow.getElementById('lookupSearchBtn');
  const lookupResults = shadow.getElementById('lookupResults');

  // Toggle Panel
  toggleBtn.addEventListener('click', () => { isOpen = !isOpen; updateSidebarState(); });
  closeBtn.addEventListener('click', () => { isOpen = false; updateSidebarState(); });

  function updateSidebarState() {
    if (isOpen) {
      sidebarPanel.classList.add('open');
      sidebarPanel.style.right = '0';
      toggleBtn.style.right = currentWidth + 'px';
    } else {
      sidebarPanel.classList.remove('open');
      sidebarPanel.style.right = '-' + (currentWidth + 20) + 'px';
      toggleBtn.style.right = '0';
    }
  }

  // Segmented Tabs Switcher (4 Tabs)
  const tabs = [
    { btn: tabTranslate, panel: panelTranslate },
    { btn: tabAnalyze, panel: panelAnalyze },
    { btn: tabOcr, panel: panelOcr },
    { btn: tabLookup, panel: panelLookup }
  ];

  tabs.forEach(t => {
    t.btn.addEventListener('click', () => {
      tabs.forEach(x => {
        x.btn.classList.remove('active');
        x.panel.style.display = 'none';
      });
      t.btn.classList.add('active');
      t.panel.style.display = 'flex';
    });
  });

  // Engine Switcher (免费极速 | 离线端侧 | 智能润色)
  const engineBtns = shadow.querySelectorAll('[data-engine]');
  engineBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      engineBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentEngine = btn.dataset.engine;

      if (currentEngine === 'ai') {
        toneRow.style.display = 'flex';
        submitBtn.querySelector('span').textContent = `智能润色 (${getToneText(currentTone)})`;
        engineBadge.textContent = `[AI润色: ${getToneText(currentTone)}]`;
      } else if (currentEngine === 'wasm') {
        toneRow.style.display = 'none';
        submitBtn.querySelector('span').textContent = '离线翻译 (本地模型)';
        engineBadge.textContent = '[离线WASM]';
      } else {
        toneRow.style.display = 'none';
        submitBtn.querySelector('span').textContent = '极速翻译 (免费服务)';
        engineBadge.textContent = '[免费极速]';
      }
    });
  });

  // Tone Switcher (标准 | 口语 | 学术 | 精炼)
  const toneBtns = shadow.querySelectorAll('[data-tone]');
  toneBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toneBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTone = btn.dataset.tone;
      submitBtn.querySelector('span').textContent = `智能润色 (${getToneText(currentTone)})`;
      engineBadge.textContent = `[AI润色: ${getToneText(currentTone)}]`;
    });
  });

  function getToneText(t) {
    if (t === 'oral') return '口语';
    if (t === 'academic') return '学术';
    if (t === 'concise') return '精炼';
    return '标准';
  }

  // Swap Languages
  swapBtn.addEventListener('click', () => {
    sourceIsEn = !sourceIsEn;
    if (sourceIsEn) {
      sourceLangEl.innerHTML = '<span class="lang-prefix">GB</span><span>英语 (en)</span>';
      targetLangEl.innerHTML = '<span class="lang-prefix">CN</span><span>中文 (zh)</span>';
    } else {
      sourceLangEl.innerHTML = '<span class="lang-prefix">CN</span><span>中文 (zh)</span>';
      targetLangEl.innerHTML = '<span class="lang-prefix">GB</span><span>英语 (en)</span>';
    }
  });

  sourceTextEl.addEventListener('input', () => {
    charCountEl.textContent = `${sourceTextEl.value.length} 字符`;
  });

  sourceTextEl.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      doTranslate();
    }
  });

  // Main Translation
  submitBtn.addEventListener('click', doTranslate);

  function doTranslate() {
    const text = sourceTextEl.value.trim();
    if (!text) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = Icons.loader + " <span>翻译中...</span>";

    resultContentEl.innerHTML = `
      <div style="padding: 6px 0; display: flex; flex-direction: column; gap: 8px;" class="animate-pulse">
        <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--accent-primary); font-weight: 600;">
          ${Icons.loader} <span>正在为您生成高质量翻译...</span>
        </div>
        <div style="height: 10px; background: color-mix(in srgb, var(--accent-primary) 15%, transparent); border-radius: 6px; width: 100%;"></div>
        <div style="height: 10px; background: color-mix(in srgb, var(--accent-primary) 15%, transparent); border-radius: 6px; width: 85%;"></div>
        <div style="height: 10px; background: color-mix(in srgb, var(--accent-primary) 15%, transparent); border-radius: 6px; width: 60%;"></div>
      </div>
    `;

    safeSendMessage({
      action: "TRANSLATE_TEXT",
      data: { text, engine: currentEngine, tone: currentTone }
    }, (res) => {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>' + (currentEngine === 'ai' ? `智能润色 (${getToneText(currentTone)})` : currentEngine === 'wasm' ? '离线翻译 (本地模型)' : '极速翻译 (免费服务)') + '</span>';

      if (!res || !res.success) {
        const fallbackText = (res && res.error) || '网络已中断，已为您自动保护输入的文本原文。';
        resultContentEl.innerHTML = `<div style="color: var(--text-muted); font-size: 11px; padding: 6px; background: rgba(0,0,0,0.04); border-radius: 6px;">💡 ${fallbackText}</div>`;
        return;
      }

      currentTranslationResult = res.data.translation;
      resultContentEl.innerHTML = renderMarkdown(currentTranslationResult);
    });
  }

  // Copy Result
  copyBtn.addEventListener('click', () => {
    if (!currentTranslationResult) return;
    navigator.clipboard.writeText(currentTranslationResult).then(() => {
      copyBtn.innerHTML = Icons.check;
      copyBtn.style.color = '#10b981';
      showToast('已复制译文至剪贴板');
      setTimeout(() => {
        copyBtn.innerHTML = Icons.copy;
        copyBtn.style.color = '';
      }, 2000);
    });
  });

  // Speak Result
  speakBtn.addEventListener('click', () => {
    if (!currentTranslationResult) return;
    const utterance = new SpeechSynthesisUtterance(currentTranslationResult);
    utterance.lang = sourceIsEn ? 'zh-CN' : 'en-US';
    window.speechSynthesis.speak(utterance);
  });

  // Grammar Analysis Function
  grammarSubmitBtn.addEventListener('click', doGrammarAnalysis);
  grammarTextEl.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      doGrammarAnalysis();
    }
  });

  function doGrammarAnalysis() {
    const sentence = (grammarTextEl.value || sourceTextEl.value).trim();
    if (!sentence) {
      showToast('请输入需要分析的英文长难句', 'error');
      return;
    }

    grammarSubmitBtn.disabled = true;
    grammarSubmitBtn.innerHTML = Icons.loader + " <span>分析中...</span>";

    grammarResultContent.innerHTML = `
      <div style="padding: 8px 0; display: flex; flex-direction: column; gap: 8px;" class="animate-pulse">
        <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--accent-primary); font-weight: 600;">
          ${Icons.loader} <span>AI 正在剖析句子语法结构与考点...</span>
        </div>
        <div style="height: 10px; background: color-mix(in srgb, var(--accent-primary) 15%, transparent); border-radius: 6px; width: 100%;"></div>
        <div style="height: 10px; background: color-mix(in srgb, var(--accent-primary) 15%, transparent); border-radius: 6px; width: 80%;"></div>
        <div style="height: 10px; background: color-mix(in srgb, var(--accent-primary) 15%, transparent); border-radius: 6px; width: 60%;"></div>
      </div>
    `;

    safeSendMessage({
      action: "ANALYZE_GRAMMAR",
      data: { sentence }
    }, (res) => {
      grammarSubmitBtn.disabled = false;
      grammarSubmitBtn.innerHTML = "<span>语法结构分析</span>";

      if (!res || !res.success) {
        grammarResultContent.innerHTML = `<div style="color:red; font-size:11px;">分析暂未成功，请重试</div>`;
        return;
      }

      const analysis = res.data?.analysis || {};
      grammarResultContent.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:6px; margin-top:4px;">
          ${analysis.structure ? `<div style="padding:6px 8px; background:var(--bg-secondary); border-radius:6px; border:1px solid var(--border-subtle);"><strong style="color:var(--accent-primary);">1. 句子结构:</strong> ${analysis.structure}</div>` : ''}
          ${analysis.tense ? `<div style="padding:6px 8px; background:var(--bg-secondary); border-radius:6px; border:1px solid var(--border-subtle);"><strong style="color:var(--accent-primary);">2. 时态语态:</strong> ${analysis.tense}</div>` : ''}
          ${analysis.keyPoints ? `<div style="padding:6px 8px; background:var(--bg-secondary); border-radius:6px; border:1px solid var(--border-subtle);"><strong style="color:var(--accent-primary);">3. 考点解析:</strong> ${analysis.keyPoints}</div>` : ''}
          ${analysis.explanation ? `<div style="padding:6px 8px; background:var(--bg-secondary); border-radius:6px; border:1px solid var(--border-subtle);"><strong style="color:var(--accent-primary);">4. 详细拆解:</strong><p style="margin-top:2px; color:var(--text-secondary);">${analysis.explanation}</p></div>` : ''}
        </div>
      `;
    });
  }

  // OCR Dropzone & Clipboard Paste Handlers
  ocrDropzone.addEventListener('click', () => ocrFileInput.click());

  ocrFileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      pendingOcrBase64 = event.target.result;
      ocrPreviewImg.src = pendingOcrBase64;
      ocrPreviewArea.style.display = 'flex';
    };
    reader.readAsDataURL(file);
  });

  ocrSubmitBtn.addEventListener('click', () => {
    if (!pendingOcrBase64) return;

    ocrSubmitBtn.disabled = true;
    ocrSubmitBtn.innerHTML = Icons.loader + " <span>识图提取中...</span>";

    safeSendMessage({
      action: "PARSE_DOCUMENT_OCR",
      data: { base64Data: pendingOcrBase64 }
    }, (res) => {
      ocrSubmitBtn.disabled = false;
      ocrSubmitBtn.innerHTML = "<span>开始识图提取与翻译</span>";

      if (res && res.success && res.data && res.data.text) {
        sourceTextEl.value = res.data.text;
        tabTranslate.click();
        doTranslate();
      } else {
        sourceTextEl.value = "Extracted image content.";
        tabTranslate.click();
      }
    });
  });

  // Global Clipboard Image Paste Listener (Ctrl + V)
  window.addEventListener('paste', (e) => {
    if (!isOpen) return;
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (!file) continue;

        const reader = new FileReader();
        reader.onload = (event) => {
          pendingOcrBase64 = event.target.result;
          ocrPreviewImg.src = pendingOcrBase64;
          ocrPreviewArea.style.display = 'flex';
          tabOcr.click();
          showToast('已读取剪贴板截图，请点击开始提取');
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  });

  // Resize Drag Listener
  let isResizing = false;
  resizeHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isResizing = true;
    document.body.style.cursor = 'ew-resize';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const newWidth = Math.min(Math.max(window.innerWidth - e.clientX, 320), 800);
    currentWidth = newWidth;
    sidebarPanel.style.width = newWidth + "px";
  });

  window.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
    }
  });

  // Lookup Search
  lookupSearchBtn.addEventListener('click', runLookup);
  lookupInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runLookup(); });

  function runLookup() {
    const query = lookupInput.value.trim();
    if (!query) return;

    lookupResults.innerHTML = `<div style="text-align:center; padding:30px 0; color:var(--accent-primary);" class="animate-pulse">${Icons.loader} 正在搜索...</div>`;

    safeSendMessage({
      action: "SEARCH_VOCAB",
      data: { query }
    }, (res) => {
      if (!res || !res.success) {
        lookupResults.innerHTML = `<div style="text-align:center; color:red; padding:30px 0;">搜索失败</div>`;
        return;
      }

      const results = res.data.results || [];
      if (results.length === 0) {
        lookupResults.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:30px 0;">未找到相关单词</div>`;
        return;
      }

      lookupResults.innerHTML = '';
      results.forEach(item => {
        const card = document.createElement('div');
        card.style.cssText = 'padding:8px; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:6px; margin-bottom:6px; display:flex; flex-direction:column; gap:4px;';
        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:6px;">
              <strong style="font-size:12px; color:var(--text-primary);">${item.word}</strong>
              ${item.phonetic ? `<span style="font-size:10px; color:var(--text-muted);">${item.phonetic}</span>` : ''}
              <button class="audio-btn" style="background:transparent; border:none; color:var(--accent-primary); cursor:pointer; padding:2px;">${Icons.volume}</button>
            </div>
            <button class="add-btn" style="padding:3px 6px; border:none; background:color-mix(in srgb, var(--accent-primary) 12%, transparent); color:var(--accent-primary); font-size:10px; font-weight:600; border-radius:4px; cursor:pointer;">${Icons.plus} 加入学习</button>
          </div>
          <div style="font-size:11px; color:var(--text-secondary);">${item.definition ? item.definition.replace(/\\n/g, '<br>') : ''}</div>
        `;

        card.querySelector('.audio-btn').addEventListener('click', () => playSpeech(item.word));
        card.querySelector('.add-btn').addEventListener('click', function() {
          this.disabled = true;
          safeSendMessage({ action: "ADD_WORD", data: { word: item.word } }, (addRes) => {
            if (addRes && addRes.success) {
              this.style.background = 'color-mix(in srgb, #10b981 12%, transparent)';
              this.style.color = '#10b981';
              this.innerHTML = Icons.check + ' 已加入';
              showToast(`"${item.word}" 已加入学习列表`);
            }
          });
        });

        lookupResults.appendChild(card);
      });
    });
  }

  function playSpeech(word) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  }

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '8px 16px';
    toast.style.borderRadius = '8px';
    toast.style.color = 'white';
    toast.style.fontSize = '12px';
    toast.style.fontWeight = '600';
    toast.style.zIndex = '2147483647';
    toast.style.background = type === 'error' ? '#ef4444' : '#10b981';
    shadow.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2200);
  }

  function renderMarkdown(md) {
    if (!md) return "";
    let html = md
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    html = html.replace(/^### (.*$)/gim, '<h3 style="font-size:12px; margin:6px 0 4px 0; color:var(--accent-primary);">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 style="font-size:13px; margin:10px 0 4px 0; color:var(--accent-primary); border-bottom:1px solid var(--border-subtle); pb-2px;">$1</h2>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/^\s*-\s+(.*$)/gim, '<li style="margin-left:12px; margin-bottom:2px;">$1</li>');
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  // Follow Theme System
  function applyTheme(themeMode) {
    let effectiveTheme = themeMode;
    if (themeMode === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    container.setAttribute('data-theme', effectiveTheme);
  }

  function initTheme() {
    safeSendMessage({ action: "GET_STATUS" }, (statusRes) => {
      let themeSettings = { theme: 'system' };
      if (statusRes && statusRes.themeSettings) themeSettings = statusRes.themeSettings;
      applyTheme(themeSettings.theme || 'system');

      // Check admin status for OCR tab
      const user = statusRes && (statusRes.user || statusRes.userInfo);
      const isAdmin = user && user.role && user.role.toString().toUpperCase() === 'ADMIN';
      if (isAdmin) {
        shadow.getElementById('tabOcr').style.display = 'flex';
      } else {
        shadow.getElementById('tabOcr').style.display = 'none';
      }
    });
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    safeSendMessage({ action: "GET_STATUS" }, (statusRes) => {
      if (!statusRes || !statusRes.themeSettings || statusRes.themeSettings.theme === 'system') {
        applyTheme('system');
      }
    });
  });

  chrome.storage.local.get("sidebarEnabled", (res) => {
    if (res.sidebarEnabled === false) {
      container.style.display = 'none';
    } else {
      container.style.display = 'block';
    }
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.sidebarEnabled) {
        container.style.display = changes.sidebarEnabled.newValue === false ? 'none' : 'block';
      }
      if (changes.theme) {
        applyTheme(changes.theme.newValue);
      }
    }
  });

  initTheme();

  window.addEventListener("wordnest-analyze-viewport", (e) => {
    const text = e.detail.text;
    isOpen = true;
    updateSidebarState();
    sourceTextEl.value = text;
    charCountEl.textContent = text.length + ' 字符';
    doTranslate();
  });

})();
