/* =========================================================
   Ekran Renk Testi
   - Ana renkleri tam ekran gösterir
   - Fullscreen API + fallback overlay
   - Çıkışta geri bildirim verir
   ========================================================= */

/* ---------- DOM ---------- */
const colorButtons = document.querySelectorAll('#colorButtons [data-color]');
const overlay = document.getElementById('fullscreenOverlay');

/* ---------- DURUM ---------- */
let activeColor = null;
let isFullscreen = false;

/* =========================================================
   OVERLAY OLUŞTURMA
   ========================================================= */
function createOverlayDOM() {
  if (!overlay) return;

  overlay.innerHTML = `
    <div id="colorStage" style="
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
      cursor: pointer;
      transition: background 0.15s;
    ">
      <div id="colorHint" style="
        position: absolute;
        bottom: calc(24px + env(safe-area-inset-bottom, 0px));
        left: 50%;
        transform: translateX(-50%);
        padding: 10px 18px;
        background: rgba(0,0,0,0.55);
        color: #fff;
        font-size: 13px;
        border-radius: 999px;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        transition: opacity 0.3s;
        pointer-events: none;
        user-select: none;
        white-space: nowrap;
      ">Dokun → Çık · Çift dokun → Renk değiştir</div>

      <div id="colorLabel" style="
        position: absolute;
        top: calc(24px + env(safe-area-inset-top, 0px));
        left: 50%;
        transform: translateX(-50%);
        padding: 6px 14px;
        background: rgba(0,0,0,0.35);
        color: #fff;
        font-size: 12px;
        border-radius: 999px;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        pointer-events: none;
        user-select: none;
        opacity: 0.85;
        transition: opacity 0.3s;
      "></div>
    </div>
  `;
}

/* =========================================================
   TAM EKRAN
   ========================================================= */
async function enterFullscreen() {
  const el = document.documentElement;

  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen({ navigationUI: 'hide' });
    } else if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
    }
    isFullscreen = true;
  } catch (err) {
    console.warn('[Color] Fullscreen reddedildi:', err);
    isFullscreen = false;
  }

  // Android'de navigasyon çubuğunu gizlemek için yön kilidi denemesi
  // (bazı tarayıcılarda ve PWA modunda çalışır)
  try {
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock('portrait').catch(() => {});
    }
  } catch (_) { /* yoksay */ }
}

async function exitFullscreen() {
  try {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      }
    }
  } catch (err) {
    console.warn('[Color] Fullscreen çıkış hatası:', err);
  }

  isFullscreen = false;

  try {
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
  } catch (_) { /* yoksay */ }
}

/* =========================================================
   RENK GÖSTER
   ========================================================= */
function showColor(hex) {
  activeColor = hex;

  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');

  const stage = document.getElementById('colorStage');
  const label = document.getElementById('colorLabel');
  const hint = document.getElementById('colorHint');

  if (stage) stage.style.background = hex;

  if (label) {
    const rgb = hexToRgb(hex);
    const luminance = relativeLuminance(rgb);
    const textColor = luminance > 0.5 ? '#000' : '#fff';

    label.textContent = hex.toUpperCase();
    label.style.color = textColor;
    label.style.background = luminance > 0.5
      ? 'rgba(0,0,0,0.15)'
      : 'rgba(0,0,0,0.4)';
  }

  if (hint) {
    // Açık renklerde koyu metin, koyu renklerde açık metin
    const rgb = hexToRgb(hex);
    const lum = relativeLuminance(rgb);
    hint.style.color = lum > 0.5 ? '#000' : '#fff';
    hint.style.background = lum > 0.5
      ? 'rgba(255,255,255,0.35)'
      : 'rgba(0,0,0,0.55)';

    // 3 saniye sonra ipucunu soluklaştır
    hint.style.opacity = '1';
    clearTimeout(hint._fadeTimer);
    hint._fadeTimer = setTimeout(() => {
      hint.style.opacity = '0.25';
    }, 3000);
  }
}

function hideColor() {
  overlay.hidden = true;
  overlay.setAttribute('aria-hidden', 'true');
  activeColor = null;
}

/* =========================================================
   RENK YARDIMCILARI
   ========================================================= */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h;

  return {
    r: parseInt(full.substring(0, 2), 16),
    g: parseInt(full.substring(2, 4), 16),
    b: parseInt(full.substring(4, 6), 16)
  };
}

function relativeLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928
      ? s / 12.92
      : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/* =========================================================
   OLAY BAĞLAMA
   ========================================================= */
function bindColorButtons() {
  colorButtons.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const hex = btn.dataset.color;
      if (!hex) return;

      await enterFullscreen();
      showColor(hex);
    });
  });
}

function bindOverlayEvents() {
  if (!overlay) return;

  // Stage'e her tıklandığında çık (tek dokunma)
  overlay.addEventListener('click', async (e) => {
    // Sadece stage'e tıklanınca değil, genel overlay'e tıklanınca da çık
    if (!activeColor) return;

    hideColor();
    await exitFullscreen();
  });

  // Fullscreen değişimi (kullanıcı ESC / sistem geri tuşu ile çıkarsa)
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && activeColor) {
      hideColor();
    }
  });

  document.addEventListener('webkitfullscreenchange', () => {
    if (!document.webkitFullscreenElement && activeColor) {
      hideColor();
    }
  });
}

/* =========================================================
   BAŞLATMA
   ========================================================= */
function init() {
  createOverlayDOM();
  bindColorButtons();
  bindOverlayEvents();

  console.log('[Color] Test hazır ·',
    colorButtons.length, 'renk');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}