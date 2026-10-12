/* =========================================================
   Titreşim Testi
   - Vibration API
   - Süre ve ritim pattern'leri
   - Destek kontrolü + görsel geri bildirim
   ========================================================= */

/* ---------- DOM ---------- */
const supportAlert = document.getElementById('vibrationSupportAlert');
const durationBtns = document.querySelectorAll('[data-vibrate]');
const patternBtns = document.querySelectorAll('[data-pattern]');
const stopBtn = document.getElementById('vibrationStopBtn');

/* ---------- DURUM ---------- */
const isSupported = 'vibrate' in navigator;

/* =========================================================
   DESTEK KONTROLÜ
   ========================================================= */
function checkSupport() {
  if (!supportAlert) return;

  if (isSupported) {
    supportAlert.className = 'alert alert-success';
    supportAlert.textContent = '✓ Titreşim API destekleniyor';
  } else {
    supportAlert.className = 'alert alert-error';
    supportAlert.textContent = '⚠️ Bu tarayıcıda Titreşim API desteklenmiyor';

    // Butonları devre dışı bırak
    [...durationBtns, ...patternBtns].forEach((b) => {
      b.disabled = true;
    });
    if (stopBtn) stopBtn.disabled = true;
  }
}

/* =========================================================
   TİTREŞİM
   ========================================================= */
function vibrate(pattern) {
  if (!isSupported) return;

  try {
    navigator.vibrate(pattern);
    console.log('[Vibration] Pattern:', pattern);
  } catch (err) {
    console.error('[Vibration] Hata:', err);
  }
}

function stopVibration() {
  if (!isSupported) return;
  navigator.vibrate(0);
  console.log('[Vibration] Durduruldu');
}

/* =========================================================
   BUTON EFEKTLERİ
   ========================================================= */
function flashButton(btn) {
  const original = btn.style.background;
  btn.style.background = 'var(--accent)';
  btn.style.color = '#fff';
  btn.style.transform = 'scale(0.95)';

  setTimeout(() => {
    btn.style.background = original;
    btn.style.color = '';
    btn.style.transform = '';
  }, 200);
}

/* =========================================================
   OLAY BAĞLAMA
   ========================================================= */
function bindControls() {
  durationBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const ms = +btn.dataset.vibrate;
      if (!ms) return;
      vibrate(ms);
      flashButton(btn);
    });
  });

  patternBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      try {
        const pattern = JSON.parse(btn.dataset.pattern);
        vibrate(pattern);
        flashButton(btn);
      } catch (err) {
        console.warn('[Vibration] Geçersiz pattern:', btn.dataset.pattern);
      }
    });
  });

  stopBtn?.addEventListener('click', () => {
    stopVibration();
    if (stopBtn) {
      stopBtn.textContent = '■ Durduruldu';
      setTimeout(() => {
        stopBtn.textContent = '■ Titreşimi Durdur';
      }, 800);
    }
  });

  // Sayfadan çıkarken titreşimi kes
  window.addEventListener('beforeunload', stopVibration);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopVibration();
  });
}

/* =========================================================
   BAŞLATMA
   ========================================================= */
function init() {
  checkSupport();
  bindControls();
  console.log('[Vibration] Test hazır · Destek:', isSupported);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}