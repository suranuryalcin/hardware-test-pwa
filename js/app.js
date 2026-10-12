/* =========================================================
   Ana Uygulama — Sistem bilgisi + durum çubuğu
   ========================================================= */

import { registerServiceWorker, setupInstallPrompt } from './pwa.js';
/* =========================================================
   TEMA YÖNETİMİ
   ========================================================= */
const THEME_KEY = 'hw-test-theme';

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch (_) {
    return null;
  }
}

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;

  // theme-color meta etiketini de güncelle (Android status bar rengi)
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', theme === 'light' ? '#f5f5f7' : '#0f0f14');
  }

  // İkon güncelleme
  updateThemeIcons(theme);

  // Diğer test modülleri dinlesin (örn. touch canvas)
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));

  console.log('[Theme]', theme);
}

function updateThemeIcons(theme) {
  document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.setAttribute('aria-label',
      theme === 'light' ? 'Koyu temaya geç' : 'Açık temaya geç');
  });
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme || 'dark';
  const next = current === 'light' ? 'dark' : 'light';

  applyTheme(next);

  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (_) { /* yoksay */ }
}

function initTheme() {
  const stored = getStoredTheme();
  const theme = stored || getSystemTheme();
  applyTheme(theme);

  // Sistem teması değişirse (kullanıcı manuel seçmediyse) takip et
  window.matchMedia('(prefers-color-scheme: light)')
    .addEventListener('change', (e) => {
      if (!getStoredTheme()) {
        applyTheme(e.matches ? 'light' : 'dark');
      }
    });

  // Tema butonlarını bağla
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-btn');
    if (btn) {
      e.preventDefault();
      toggleTheme();
    }
  });
}
/* ---------- SİSTEM BİLGİSİ ---------- */
function updateSystemInfo() {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  // Platform / OS
  const ua = navigator.userAgent;
  let platform = 'Bilinmiyor';
  if (/Android/i.test(ua)) {
    const match = ua.match(/Android\s+([\d.]+)/);
    platform = match ? `Android ${match[1]}` : 'Android';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    platform = 'iOS';
  } else if (/Windows/i.test(ua)) {
    platform = 'Windows';
  } else if (/Mac/i.test(ua)) {
    platform = 'macOS';
  } else if (/Linux/i.test(ua)) {
    platform = 'Linux';
  }

  // Tarayıcı
  let browser = 'Bilinmiyor';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua)) browser = 'Safari';

  set('infoPlatform', platform);
  set('infoUA', browser);

  // Ekran
  set('infoScreen', `${screen.width}×${screen.height}`);
  set('infoDPR', `${window.devicePixelRatio}x`);

  // Dokunma noktası
  const touchPoints = navigator.maxTouchPoints || 0;
  set('infoTouch', touchPoints > 0 ? `${touchPoints} nokta` : 'Yok');

  // Dil
  set('infoLang', navigator.language || '—');
}

/* ---------- DURUM ÇUBUĞU ---------- */
function updateNetworkStatus() {
  const el = document.getElementById('statusNetwork');
  if (!el) return;

  const valueEl = el.querySelector('.status-value');
  el.classList.remove('is-ok', 'is-warn', 'is-err');

  if (!navigator.onLine) {
    el.classList.add('is-err');
    valueEl.textContent = 'Çevrimdışı';
    return;
  }

  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) {
    el.classList.add('is-ok');
    valueEl.textContent = 'Bağlı';
    return;
  }

  const type = (conn.effectiveType || 'bilinmiyor').toUpperCase();
  const downlink = conn.downlink ? `${conn.downlink}Mb` : '';

  el.classList.add('is-ok');
  valueEl.textContent = `${type}${downlink ? ' · ' + downlink : ''}`;
}

function updateOnlineStatus() {
  const el = document.getElementById('statusOnline');
  if (!el) return;

  const valueEl = el.querySelector('.status-value');
  el.classList.remove('is-ok', 'is-warn', 'is-err');

  if (navigator.onLine) {
    el.classList.add('is-ok');
    valueEl.textContent = 'Çevrimiçi';
  } else {
    el.classList.add('is-err');
    valueEl.textContent = 'Çevrimdışı';
  }
}

async function updateBatteryStatus() {
  const el = document.getElementById('statusBattery');
  if (!el) return;

  const valueEl = el.querySelector('.status-value');
  el.classList.remove('is-ok', 'is-warn', 'is-err');

  if (!('getBattery' in navigator)) {
    el.classList.add('is-warn');
    valueEl.textContent = 'Bilinmiyor';
    return;
  }

  try {
    const battery = await navigator.getBattery();
    const update = () => {
      const pct = Math.round(battery.level * 100);
      valueEl.textContent = `${pct}%`;

      el.classList.remove('is-ok', 'is-warn', 'is-err');
      if (battery.charging) el.classList.add('is-ok');
      else if (pct <= 20) el.classList.add('is-err');
      else if (pct <= 40) el.classList.add('is-warn');
      else el.classList.add('is-ok');
    };

    update();
    battery.addEventListener('levelchange', update);
    battery.addEventListener('chargingchange', update);
  } catch (err) {
    el.classList.add('is-warn');
    valueEl.textContent = 'Hata';
  }
}

/* ---------- BAŞLATMA ---------- */
function init() {
  initTheme();
  updateSystemInfo();
  updateNetworkStatus();
  updateOnlineStatus();
  updateBatteryStatus();

  // Ağ olayları
  window.addEventListener('online', () => {
    updateOnlineStatus();
    updateNetworkStatus();
  });
  window.addEventListener('offline', () => {
    updateOnlineStatus();
    updateNetworkStatus();
  });
// Tema değişince canvas'ı yeniden çiz
window.addEventListener('themechange', () => {
  fillBackground();
});
  // Connection değişimleri
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn) {
    conn.addEventListener('change', updateNetworkStatus);
  }

  // PWA
  registerServiceWorker();
  setupInstallPrompt();
}

// DOM hazır olduğunda başlat
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}