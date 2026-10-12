/* =========================================================
   Ağ Bağlantısı Testi
   - Network Information API (effectiveType, downlink, rtt)
   - online/offline olayları
   - Ping testi (fetch ile gecikme ölçümü)
   ========================================================= */

/* ---------- DOM ---------- */
const statusEl = document.getElementById('netStatus');
const typeEl = document.getElementById('netType');
const downlinkEl = document.getElementById('netDownlink');
const rttEl = document.getElementById('netRtt');
const saveDataEl = document.getElementById('netSaveData');
const pingValueEl = document.getElementById('pingValue');
const pingCountEl = document.getElementById('pingCount');
const pingStartBtn = document.getElementById('pingStartBtn');
const alertBox = document.getElementById('networkAlert');

/* ---------- DURUM ---------- */
const conn = navigator.connection
  || navigator.mozConnection
  || navigator.webkitConnection
  || null;

let pingRunning = false;
let pingSamples = [];

/* =========================================================
   BAĞLANTI BİLGİLERİ
   ========================================================= */
function updateConnectionInfo() {
  // Durum
  if (statusEl) {
    statusEl.textContent = navigator.onLine ? 'Çevrimiçi' : 'Çevrimdışı';
    statusEl.style.color = navigator.onLine
      ? 'var(--success)'
      : 'var(--danger)';
  }

  if (!conn) {
    if (typeEl) typeEl.textContent = 'Bilinmiyor';
    if (downlinkEl) downlinkEl.textContent = '—';
    if (rttEl) rttEl.textContent = '—';
    if (saveDataEl) saveDataEl.textContent = '—';

    if (alertBox) {
      alertBox.className = 'alert alert-warn';
      alertBox.textContent = '⚠️ Network Information API desteklenmiyor';
    }
    return;
  }

  const type = (conn.effectiveType || 'bilinmiyor').toUpperCase();
  const downlink = conn.downlink ? `${conn.downlink} Mbps` : '—';
  const rtt = conn.rtt != null ? `${conn.rtt} ms` : '—';
  const saveData = conn.saveData ? 'Açık' : 'Kapalı';

  if (typeEl) typeEl.textContent = type;
  if (downlinkEl) downlinkEl.textContent = downlink;
  if (rttEl) rttEl.textContent = rtt;
  if (saveDataEl) saveDataEl.textContent = saveData;

  if (alertBox) {
    alertBox.className = 'alert alert-success';
    alertBox.textContent = `✓ Bağlantı algılandı · ${type}`;
  }
}

/* =========================================================
   PING TESTİ
   ========================================================= */
async function measurePing() {
  // Cache bypass için query string ekle
  const url = `./network.html?ping=${Date.now()}`;
  const start = performance.now();

  try {
    await fetch(url, {
      method: 'HEAD',
      cache: 'no-store',
      mode: 'same-origin'
    });
    const elapsed = performance.now() - start;
    return elapsed;
  } catch (err) {
    return null;
  }
}

async function runPingTest() {
  if (pingRunning) return;
  pingRunning = true;
  pingSamples = [];

  if (pingStartBtn) {
    pingStartBtn.disabled = true;
    pingStartBtn.textContent = 'Test ediliyor...';
  }

  const SAMPLE_COUNT = 5;

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const ms = await measurePing();
    if (ms != null) {
      pingSamples.push(ms);
    }

    if (pingCountEl) pingCountEl.textContent = i + 1;

    // Anlık ortalama
    if (pingValueEl && pingSamples.length > 0) {
      const avg = pingSamples.reduce((a, b) => a + b, 0) / pingSamples.length;
      pingValueEl.textContent = Math.round(avg);
    }

    if (i < SAMPLE_COUNT - 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  // Sonuç
  if (pingSamples.length === 0) {
    if (pingValueEl) pingValueEl.textContent = 'Hata';
    if (alertBox) {
      alertBox.className = 'alert alert-error';
      alertBox.textContent = '⚠️ Ping testi başarısız · Ağ bağlantısını kontrol edin';
    }
  } else {
    const avg = pingSamples.reduce((a, b) => a + b, 0) / pingSamples.length;
    const min = Math.min(...pingSamples);
    const max = Math.max(...pingSamples);

    if (pingValueEl) pingValueEl.textContent = Math.round(avg);
    if (alertBox) {
      alertBox.className = 'alert alert-success';
      alertBox.textContent = `✓ Ortalama ${Math.round(avg)}ms · Min ${Math.round(min)}ms · Maks ${Math.round(max)}ms`;
    }

    // Değer rengi
    if (pingValueEl) {
      if (avg < 50) pingValueEl.style.color = 'var(--success)';
      else if (avg < 150) pingValueEl.style.color = 'var(--warning)';
      else pingValueEl.style.color = 'var(--danger)';
    }
  }

  pingRunning = false;
  if (pingStartBtn) {
    pingStartBtn.disabled = false;
    pingStartBtn.textContent = 'Ping Testi Başlat';
  }
}

/* =========================================================
   OLAY BAĞLAMA
   ========================================================= */
function bindEvents() {
  window.addEventListener('online', updateConnectionInfo);
  window.addEventListener('offline', updateConnectionInfo);

  if (conn) {
    conn.addEventListener('change', updateConnectionInfo);
  }

  pingStartBtn?.addEventListener('click', runPingTest);
}

/* =========================================================
   BAŞLATMA
   ========================================================= */
function init() {
  updateConnectionInfo();
  bindEvents();
  console.log('[Network] Test hazır · Destek:', !!conn);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}