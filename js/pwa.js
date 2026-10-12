/* =========================================================
   PWA — Service Worker kaydı + kurulum istemi
   ========================================================= */

let deferredPrompt = null;

/* ---------- SERVICE WORKER KAYDI ---------- */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service Worker desteklenmiyor');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('./service-worker.js', {
      scope: './'
    });
    console.log('[PWA] ✓ SW kayıtlı:', registration.scope);

    // Güncelleme kontrolü
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('[PWA] Yeni sürüm hazır');
          // Sessizce aktive et
          newWorker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });
  } catch (err) {
    console.error('[PWA] SW kaydı başarısız:', err);
  }
}

/* ---------- KURULUM İSTEMİ ---------- */
export function setupInstallPrompt() {
  const installBtn = document.getElementById('installBtn');
  if (!installBtn) return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
    console.log('[PWA] Kurulabilir');
  });

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Kullanıcı seçimi:', outcome);

    deferredPrompt = null;
    installBtn.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] ✓ Uygulama kuruldu');
    installBtn.hidden = true;
    deferredPrompt = null;
  });
}