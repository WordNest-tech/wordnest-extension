// extension/token_sync.js - Runs on WordNest website to sync authentication state and theme settings

function getAndSyncData() {
  try {
    let token = null;
    let user = null;
    let themeSettings = { theme: 'system', colorTheme: 'default' };

    // 1. Get Auth Data
    const authDataRaw = localStorage.getItem('linguaflow-auth');
    if (authDataRaw) {
      const auth = JSON.parse(authDataRaw);
      if (auth && auth.state && auth.state.token) {
        token = auth.state.token;
        user = auth.state.user;
      }
    }
    
    // 2. Get Theme Data
    const themeDataRaw = localStorage.getItem('linguaflow-theme');
    if (themeDataRaw) {
      const themeData = JSON.parse(themeDataRaw);
      if (themeData && themeData.state) {
        themeSettings = {
          theme: themeData.state.theme || 'system',
          colorTheme: themeData.state.colorTheme || 'default'
        };
      }
    }

    if (token) {
      chrome.runtime.sendMessage({
        action: "SYNC_AUTH",
        data: { token, user, themeSettings }
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[WordNest Extension] Sync message failed:', chrome.runtime.lastError.message);
        } else {
          console.log('[WordNest Extension] Data synced successfully:', user ? user.name : 'Unknown User', themeSettings);
        }
      });
    } else {
      chrome.runtime.sendMessage({
        action: "CLEAR_AUTH"
      });
    }
  } catch (err) {
    console.error('[WordNest Extension] Error parsing local storage:', err);
  }
}

// Sync immediately on page load
getAndSyncData();

// Hook into window storage event (detect logins & theme changes from other tabs)
window.addEventListener('storage', (e) => {
  if (e.key === 'linguaflow-auth' || e.key === 'linguaflow-theme') {
    getAndSyncData();
  }
});

// Intercept setItem to catch real-time state changes in the same tab
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  originalSetItem.apply(this, arguments);
  if (key === 'linguaflow-auth' || key === 'linguaflow-theme') {
    getAndSyncData();
  }
};

const originalRemoveItem = localStorage.removeItem;
localStorage.removeItem = function(key) {
  originalRemoveItem.apply(this, arguments);
  if (key === 'linguaflow-auth' || key === 'linguaflow-theme') {
    getAndSyncData();
  }
};
