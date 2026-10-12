/* =========================================================
   CANVAS KURULUM (tam ekran versiyon)
   ========================================================= */
function setupCanvas() {
  if (!canvas) return;

  ctx = canvas.getContext('2d');
  dpr = window.devicePixelRatio || 1;

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => {
    // Android rotate sonrası layout oturması için kısa gecikme
    setTimeout(resizeCanvas, 200);
  });

  fillBackground();
}

function resizeCanvas() {
  if (!canvas || !ctx) return;

  // Parent'ın (canvas-wrap) boyutunu al
  const parent = canvas.parentElement;
  const rect = parent.getBoundingClientRect();

  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  fillBackground();
}

function fillBackground() {
  if (!ctx || !canvas) return;
  // ctx transform zaten DPR ile ölçekli, o yüzden CSS piksel cinsinden
  const parent = canvas.parentElement;
  const rect = parent.getBoundingClientRect();

  // Tema rengine göre arka plan
  const isLight = document.documentElement.dataset.theme === 'light';
  ctx.fillStyle = isLight ? '#f5f5f7' : '#15151c';
  ctx.fillRect(0, 0, rect.width, rect.height);
}