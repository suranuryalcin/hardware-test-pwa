/* =========================================================
   Konum (GPS) Testi
   - Geolocation API
   - Tek seferlik konum + canlı izleme
   - Permissions API ile izin durumu
   ========================================================= */

/* ---------- DOM ---------- */
const startBtn = document.getElementById('locStartBtn');
const watchBtn = document.getElementById('locWatchBtn');
const stopBtn = document.getElementById('locStopBtn');
const alertBox = document.getElementById('locationAlert');

const apiSupportEl = document.getElementById('locApiSupport');
const permissionEl = document.getElementById('locPermission');
const serviceStateEl = document.getElementById('locServiceState');

const latEl = document.getElementById('locLatitude');
const lonEl = document.getElementById('locLongitude');
const accEl = document.getElementById('locAccuracy');
const altEl = document.getElementById('locAltitude');
const altAccEl = document.getElementById('locAltitudeAccuracy');
const headingEl = document.getElementById('locHeading');
const speedEl = document.getElementById('locSpeed');
const tsEl = document.getElementById('locTimestamp');

const accBar = document.getElementById('locAccuracyBar');
const accValue = document.getElementById('locAccuracyValue');
const updateCountEl = document.getElementById('locUpdateCount');

/* ---------- DURUM ---------- */
let watchId = null;
let updateCount = 0;

/* =========================================================
   DESTEK KONTROLÜ
   ========================================================= */
async function checkSupport() {
  const hasGeo = 'geolocation' in navigator;

  if (apiSupportEl) {
    apiSupportEl.textContent = hasGeo ? 'Destekleniyor' : 'Yok';
    apiSupportEl.style.color = hasGeo ? 'var(--success)' : 'var(--danger)';
  }

  // Permissions API ile izin durumu
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      updatePermissionDisplay(status.state);

      status.addEventListener('change', () => {
        updatePermissionDisplay(status.state);
      });
    } catch (_) {
      if (permissionEl) permissionEl.textContent = 'Bilinmiyor';
    }
  } else if (permissionEl) {
    permissionEl.textContent = 'API yok';
  }

  if (!hasGeo) {
    showAlert('error', '⚠️ Bu tarayıcıda Geolocation API desteklenmiyor');
    disableButtons();
  }
}

function updatePermissionDisplay(state) {
  if (!permissionEl) return;

  const map = {
    granted: { text: 'İzin verildi', color: 'var(--success)' },
    prompt: { text: 'İstenecek', color: 'var(--warning)' },
    denied: { text: 'Reddedildi', color: 'var(--danger)' }
  };

  const info = map[state] || { text: state, color: 'var(--text-secondary)' };
  permissionEl.textContent = info.text;
  permissionEl.style.color = info.color;
}

/* =========================================================
   KONUM GÖSTERİMİ
   ========================================================= */
function displayPosition(pos) {
  const c = pos.coords;

  updateCount++;
  if (updateCountEl) updateCountEl.textContent = updateCount;

  if (latEl) latEl.textContent = c.latitude.toFixed(6) + '°';
  if (lonEl) lonEl.textContent = c.longitude.toFixed(6) + '°';

  if (accEl) {
    accEl.textContent = c.accuracy ? `±${c.accuracy.toFixed(1)} m` : '—';
    // Doğruluk rengi
    if (c.accuracy < 10) accEl.style.color = 'var(--success)';
    else if (c.accuracy < 50) accEl.style.color = 'var(--warning)';
    else accEl.style.color = 'var(--danger)';
  }

  if (altEl) {
    altEl.textContent = c.altitude != null
      ? `${c.altitude.toFixed(1)} m`
      : '—';
  }

  if (altAccEl) {
    altAccEl.textContent = c.altitudeAccuracy != null
      ? `±${c.altitudeAccuracy.toFixed(1)} m`
      : '—';
  }

  if (headingEl) {
    headingEl.textContent = c.heading != null
      ? `${c.heading.toFixed(1)}°`
      : '—';
  }

  if (speedEl) {
    speedEl.textContent = c.speed != null
      ? `${(c.speed * 3.6).toFixed(1)} km/s`
      : '—';
  }

  if (tsEl) {
    const d = new Date(pos.timestamp);
    tsEl.textContent = d.toLocaleTimeString('tr-TR');
  }

  // Doğruluk çubuğu — 100m üzerini kırmızı, 10m altını yeşil
  if (accValue) accValue.textContent = c.accuracy ? Math.round(c.accuracy) : '—';
  if (accBar) {
    // 0-200m arası → 0-100% (ters orantı: küçük accuracy = dolu bar)
    const pct = Math.max(0, Math.min(100, 100 - (c.accuracy / 200) * 100));
    accBar.style.width = pct + '%';

    if (c.accuracy < 10) accBar.style.background = 'var(--success)';
    else if (c.accuracy < 50) accBar.style.background = 'var(--warning)';
    else accBar.style.background = 'var(--danger)';
  }

  // İlk konum geldiğinde servis durumunu güncelle
  if (serviceStateEl) {
    serviceStateEl.textContent = 'Aktif';
    serviceStateEl.style.color = 'var(--success)';
  }

  showAlert('success', `✓ Konum alındı · ±${c.accuracy.toFixed(0)}m doğruluk`);
}

/* =========================================================
   HATA YÖNETİMİ
   ========================================================= */
function handleError(err) {
  console.error('[Location] Hata:', err);

  const messages = {
    1: '⚠️ Konum izni reddedildi. Tarayıcı ayarlarından izin verin.',
    2: '⚠️ Konum bilgisi alınamadı. GPS açık mı?',
    3: '⚠️ Konum zaman aşımına uğradı.'
  };

  const msg = messages[err.code] || `⚠️ Konum hatası: ${err.message}`;
  showAlert('error', msg);

  if (serviceStateEl) {
    serviceStateEl.textContent = 'Hata';
    serviceStateEl.style.color = 'var(--danger)';
  }
}

/* =========================================================
   TEK SEFERLİK KONUM
   ========================================================= */
function getCurrentPosition() {
  if (!navigator.geolocation) return;

  showAlert('info', '📍 Konum alınıyor...');
  if (startBtn) startBtn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      displayPosition(pos);
      if (startBtn) startBtn.disabled = false;
    },
    (err) => {
      handleError(err);
      if (startBtn) startBtn.disabled = false;
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
}

/* =========================================================
   CANLI İZLEME
   ========================================================= */
function startWatch() {
  if (!navigator.geolocation || watchId != null) return;

  showAlert('info', '📡 Canlı izleme başlatıldı...');

  if (watchBtn) watchBtn.disabled = true;
  if (startBtn) startBtn.disabled = true;
  if (stopBtn) stopBtn.disabled = false;

  if (serviceStateEl) {
    serviceStateEl.textContent = 'İzleniyor';
    serviceStateEl.style.color = 'var(--warning)';
  }

  watchId = navigator.geolocation.watchPosition(
    displayPosition,
    handleError,
    {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 1000
    }
  );
}

function stopWatch() {
  if (watchId != null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  if (watchBtn) watchBtn.disabled = false;
  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;

  if (serviceStateEl) {
    serviceStateEl.textContent = 'Durduruldu';
    serviceStateEl.style.color = 'var(--text-secondary)';
  }

  showAlert('info', 'Canlı izleme durduruldu');
}

/* =========================================================
   YARDIMCILAR
   ========================================================= */
function showAlert(type, text) {
  if (!alertBox) return;
  alertBox.className = 'alert alert-' + type;
  alertBox.textContent = text;
}

function disableButtons() {
  [startBtn, watchBtn, stopBtn].forEach((b) => {
    if (b) b.disabled = true;
  });
}

/* =========================================================
   BAŞLATMA
   ========================================================= */
function init() {
  checkSupport();

  startBtn?.addEventListener('click', getCurrentPosition);
  watchBtn?.addEventListener('click', startWatch);
  stopBtn?.addEventListener('click', stopWatch);

  // Sayfa kapanırken izlemeyi durdur
  window.addEventListener('beforeunload', stopWatch);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && watchId != null) {
      // Arka planda GPS'i kapat (pil tasarrufu)
      stopWatch();
    }
  });

  console.log('[Location] Test hazır');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}