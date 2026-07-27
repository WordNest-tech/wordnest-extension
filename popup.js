// extension/popup.js - Control script for extension popup UI

document.addEventListener("DOMContentLoaded", () => {
  const statusDot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");
  const apiUrlInput = document.getElementById("api-url-input");
  const saveBtn = document.getElementById("save-settings");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  
  // 1. Get current connection and auth status from background
  chrome.runtime.sendMessage({ action: "GET_STATUS" }, (response) => {
    if (response) {
      if (response.loggedIn) {
        statusDot.className = "dot online";
        statusText.textContent = `已连接: ${response.user ? response.user.name : '用户'}`;
      } else {
        statusDot.className = "dot";
        statusText.textContent = "未登录，请先登录平台网站";
      }
      
      if (response.apiUrl) {
        apiUrlInput.value = response.apiUrl;
      }
      
      
      if (response.themeSettings) {
        applyThemeSettings(response.themeSettings);
      }
    }
  });

  // Get initial sidebar toggle state
  chrome.storage.local.get("sidebarEnabled", (res) => {
    if (res.sidebarEnabled !== undefined) {
      sidebarToggle.checked = res.sidebarEnabled;
    }
  });
  
  // Real-time toggle saving
  sidebarToggle.addEventListener("change", () => {
    chrome.storage.local.set({ sidebarEnabled: sidebarToggle.checked });
  });

  // 2. Save settings callback
  saveBtn.addEventListener("click", () => {
    const apiUrl = apiUrlInput.value.trim();
    if (!apiUrl) return;
    
    chrome.storage.local.set({ apiUrl }, () => {
      saveBtn.textContent = "保存成功 ✓";
      saveBtn.style.background = "var(--accent-success, #10b981)";
      
      setTimeout(() => {
        saveBtn.textContent = "保存设置";
        saveBtn.style.background = "var(--accent-primary, #B5694A)";
      }, 1500);
    });
  });
});

// Helper to apply synchronized theme settings
function applyThemeSettings(themeSettings) {
  const { theme, colorTheme } = themeSettings;
  const effectiveTheme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
    
  document.documentElement.setAttribute('data-theme', effectiveTheme);
  document.documentElement.setAttribute('data-color-theme', colorTheme || 'default');
}
