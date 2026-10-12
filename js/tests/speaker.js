/* =========================================================
   Hoparlör Testi
   - Web Audio API ile frekans üretimi
   - Sol / Sağ / Stereo kanal testi
   - Frekans kaydırıcı + preset butonları
   ========================================================= */

/* ---------- DOM ---------- */
const freqSlider = document.getElementById('speakerFreqSlider');
const freqDisplay = document.getElementById('speakerFreq');
const channelLabel = document.getElementById('speakerChannelLabel');
const playBtn = document.getElementById('speakerPlayBtn');
const channelBtns = document.querySelectorAll('[data-channel]');
const presetBtns = document.querySelectorAll('[data-preset]');

/* ---------- DURUM ---------- */
let audioCtx = null;
let oscillator = null;
let gainNode = null;
let pannerNode = null;
let isPlaying = false;
let currentChannel = 'both';
let currentFreq = 440;

/* Ses seviyesi — güvenli başlangıç */
const MASTER_VOLUME = 0.15;

/* =========================================================
   AUDIO CONTEXT
   ========================================================= */
function ensureAudioContext() {
  if (audioCtx) return audioCtx;

  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) {
    alert('Web Audio API desteklenmiyor.');
    return null;
  }

  audioCtx = new Ctx();
  return audioCtx;
}

/* =========================================================
   TON BAŞLAT / DURDUR
   ========================================================= */
async function startTone() {
  const ctx = ensureAudioContext();
  if (!ctx) return;

  // Tarayıcı kullanıcı etkileşimi sonrası context'i resume et
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  stopTone(); // Önce temizle

  // Oscillator
  oscillator = ctx.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(currentFreq, ctx.currentTime);

  // Gain (ses seviyesi)
  gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  // Yumuşak fade-in — patlama sesini önler
  gainNode.gain.linearRampToValueAtTime(MASTER_VOLUME, ctx.currentTime + 0.05);

  // Stereo panner
  pannerNode = ctx.createStereoPanner();

  // Bağlantılar
  oscillator.connect(gainNode);
  gainNode.connect(pannerNode);
  pannerNode.connect(ctx.destination);

  applyChannel(currentChannel);

  oscillator.start();
  isPlaying = true;
  updatePlayButton();
}

function stopTone() {
  if (!oscillator || !audioCtx) return;

  const ctx = audioCtx;
  const osc = oscillator;
  const gain = gainNode;

  try {
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.05);
    osc.stop(now + 0.06);
  } catch (err) {
    // Zaten durmuş olabilir
  }

  oscillator = null;
  gainNode = null;
  pannerNode = null;
  isPlaying = false;
  updatePlayButton();
}

/* =========================================================
   KANAL
   ========================================================= */
function applyChannel(channel) {
  currentChannel = channel;

  if (channelLabel) {
    channelLabel.textContent = channel === 'both'
      ? 'Stereo'
      : channel === 'left'
        ? 'Sol'
        : 'Sağ';
  }

  if (pannerNode) {
    const value = channel === 'left' ? -1 : channel === 'right' ? 1 : 0;
    pannerNode.pan.setValueAtTime(value, audioCtx.currentTime);
  }
}

/* =========================================================
   FREKANS
   ========================================================= */
function setFrequency(hz) {
  currentFreq = hz;

  if (freqDisplay) freqDisplay.textContent = hz;
  if (freqSlider && +freqSlider.value !== hz) freqSlider.value = hz;

  if (oscillator && audioCtx) {
    oscillator.frequency.setTargetAtTime(hz, audioCtx.currentTime, 0.01);
  }
}

/* =========================================================
   UI
   ========================================================= */
function updatePlayButton() {
  if (!playBtn) return;
  playBtn.textContent = isPlaying ? '■ Durdur' : '▶ Tonu Çal';
  playBtn.classList.toggle('btn-primary', !isPlaying);
  playBtn.classList.toggle('btn-danger', isPlaying);
}

function bindControls() {
  // Frekans kaydırıcı
  freqSlider?.addEventListener('input', (e) => {
    setFrequency(+e.target.value);
  });

  // Play/Durdur
  playBtn?.addEventListener('click', () => {
    if (isPlaying) {
      stopTone();
    } else {
      startTone();
    }
  });

  // Kanal butonları
  channelBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      applyChannel(btn.dataset.channel);

      // Aktif stilini güncelle
      channelBtns.forEach((b) => {
        b.classList.toggle('btn-primary', b === btn);
        b.classList.toggle('btn-secondary', b !== btn);
      });
    });
  });

  // Preset butonları
  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      const hz = preset === 'low' ? 100 : preset === 'mid' ? 1000 : 10000;
      setFrequency(hz);

      presetBtns.forEach((b) => {
        b.classList.toggle('btn-primary', b === btn);
        b.classList.toggle('btn-secondary', b !== btn);
      });
    });
  });

  // Sayfadan ayrılırken sesi kapat
  window.addEventListener('beforeunload', stopTone);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isPlaying) stopTone();
  });
}

/* =========================================================
   BAŞLATMA
   ========================================================= */
function init() {
  bindControls();
  setFrequency(440);
  applyChannel('both');
  console.log('[Speaker] Test hazır');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}