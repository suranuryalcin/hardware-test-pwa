/* =========================================================
   Mikrofon Testi
   - getUserMedia ile ses kaydı
   - AnalyserNode ile dalga formu + seviye
   - İzin akışı ve hata yönetimi
   ========================================================= */

/* ---------- DOM ---------- */
const startBtn = document.getElementById('micStartBtn');
const stopBtn = document.getElementById('micStopBtn');
const waveCanvas = document.getElementById('micWaveform');
const levelBar = document.getElementById('micLevelBar');
const levelValue = document.getElementById('micLevel');
const peakValue = document.getElementById('micPeak');
const alertBox = document.getElementById('micPermissionAlert');

/* ---------- DURUM ---------- */
let audioCtx = null;
let analyser = null;
let sourceNode = null;
let stream = null;
let rafId = null;
let peakLevel = 0;

let timeDomainData = null;
let waveCtx = null;
let waveDpr = 1;

/* =========================================================
   CANVAS
   ========================================================= */
function setupWaveCanvas() {
  if (!waveCanvas) return;

  waveCtx = waveCanvas.getContext('2d');
  waveDpr = window.devicePixelRatio || 1;

  resizeWaveCanvas();
  window.addEventListener('resize', resizeWaveCanvas);
}

function resizeWaveCanvas() {
  if (!waveCanvas || !waveCtx) return;

  const rect = waveCanvas.getBoundingClientRect();
  waveCanvas.width = Math.round(rect.width * waveDpr);
  waveCanvas.height = Math.round(rect.height * waveDpr);

  waveCtx.setTransform(waveDpr, 0, 0, waveDpr, 0, 0);

  fillWaveBg();
}

function fillWaveBg() {
  if (!waveCtx || !waveCanvas) return;
  const rect = waveCanvas.getBoundingClientRect();
  waveCtx.fillStyle = '#15151c';
  waveCtx.fillRect(0, 0, rect.width, rect.height);
}

function drawWaveform() {
  if (!waveCtx || !analyser || !waveCanvas) return;

  const rect = waveCanvas.getBoundingClientRect();
  const W = rect.width;
  const H = rect.height;

  // Arka planı hafifçe soluklaştır (iz bırakma efekti)
  waveCtx.fillStyle = 'rgba(21, 21, 28, 0.25)';
  waveCtx.fillRect(0, 0, W, H);

  analyser.getByteTimeDomainData(timeDomainData);

  waveCtx.beginPath();
  waveCtx.lineWidth = 2;
  waveCtx.strokeStyle = '#30d158';

  const slice = W / timeDomainData.length;
  let x = 0;

  for (let i = 0; i < timeDomainData.length; i++) {
    const v = timeDomainData[i] / 128.0;
    const y = (v * H) / 2;
    if (i === 0) waveCtx.moveTo(x, y);
    else waveCtx.lineTo(x, y);
    x += slice;
  }

  waveCtx.stroke();
}

/* =========================================================
   SEVİYE ÖLÇÜMÜ
   ========================================================= */
function updateLevel() {
  if (!analyser) return;

  const freqData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(freqData);

  // RMS hesabı
  let sum = 0;
  for (let i = 0; i < freqData.length; i++) {
    sum += freqData[i] * freqData[i];
  }
  const rms = Math.sqrt(sum / freqData.length);
  const level = Math.round((rms / 255) * 100);

  if (level > peakLevel) peakLevel = level;

  if (levelValue) levelValue.textContent = level;
  if (peakValue) peakValue.textContent = peakLevel;
  if (levelBar) levelBar.style.width = level + '%';

  // Seviyeye göre renk
  if (levelBar) {
    if (level > 70) levelBar.style.background = '#ff453a';
    else if (level > 40) levelBar.style.background = '#ff9f0a';
    else levelBar.style.background = '#30d158';
  }
}

/* =========================================================
   DÖNGÜ
   ========================================================= */
function loop() {
  drawWaveform();
  updateLevel();
  rafId = requestAnimationFrame(loop);
}

/* =========================================================
   İZİN + BAŞLAT
   ========================================================= */
async function startMic() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showAlert('error', 'Bu tarayıcıda mikrofon erişimi desteklenmiyor.');
    return;
  }

  try {
    setAlert('info', '🎤 Mikrofon izni isteniyor...');

    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });

    // Audio context
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();

    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    sourceNode = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.75;

    timeDomainData = new Uint8Array(analyser.fftSize);

    sourceNode.connect(analyser);

    // UI
    startBtn.disabled = true;
    stopBtn.disabled = false;

    setAlert('success', '✓ Mikrofon aktif · Konuşarak dalga formunu test edin');
    peakLevel = 0;
    if (peakValue) peakValue.textContent = '0';

    loop();
  } catch (err) {
    console.error('[Mic] Hata:', err);

    let msg = 'Mikrofon başlatılamadı.';
    if (err.name === 'NotAllowedError') {
      msg = '⚠️ Mikrofon izni reddedildi. Tarayıcı ayarlarından izin verin.';
    } else if (err.name === 'NotFoundError') {
      msg = '⚠️ Mikrofon bulunamadı.';
    } else if (err.name === 'NotReadableError') {
      msg = '⚠️ Mikrofon başka bir uygulama tarafından kullanılıyor.';
    } else if (err.name === 'SecurityError') {
      msg = '⚠️ Güvenlik nedeniyle mikrofon erişimi engellendi. HTTPS gerekli.';
    }

    showAlert('error', msg);
    resetUI();
  }
}

/* =========================================================
   DURDUR
   ========================================================= */
function stopMic() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  if (sourceNode) {
    try { sourceNode.disconnect(); } catch (_) {}
    sourceNode = null;
  }

  analyser = null;

  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }

  if (audioCtx) {
    try { audioCtx.close(); } catch (_) {}
    audioCtx = null;
  }

  resetUI();
  setAlert('info', 'Mikrofon durduruldu. Yeniden başlatmak için butona basın.');
}

function resetUI() {
  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;
  if (levelBar) levelBar.style.width = '0%';
  if (levelValue) levelValue.textContent = '0';

  fillWaveBg();
}

/* =========================================================
   UYARI
   ========================================================= */
function setAlert(type, text) {
  if (!alertBox) return;
  alertBox.className = 'alert alert-' + type;
  alertBox.textContent = text;
}

function showAlert(type, text) {
  setAlert(type, text);
}

/* =========================================================
   BAŞLATMA
   ========================================================= */
function init() {
  setupWaveCanvas();

  startBtn?.addEventListener('click', startMic);
  stopBtn?.addEventListener('click', stopMic);

  window.addEventListener('beforeunload', stopMic);

  // Sayfa arka plana atılırsa mikrofoni durdur
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && stream) stopMic();
  });

  console.log('[Mic] Test hazır');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}