(() => {
  if (!('serviceWorker' in navigator)) return;
  let installPrompt = null;
  const style = document.createElement('style');
  style.textContent = '.connection-banner{position:fixed;z-index:99999;left:50%;top:12px;transform:translateX(-50%);padding:9px 16px;border-radius:999px;font:600 13px Sarabun,sans-serif;box-shadow:0 6px 24px #0002;transition:.25s}.connection-banner.offline{background:#fef3c7;color:#92400e}.connection-banner.online{background:#dcfce7;color:#166534}.pwa-install{position:fixed;z-index:9998;right:16px;bottom:16px;border:0;border-radius:999px;padding:10px 16px;background:#2563eb;color:#fff;font:600 13px Sarabun,sans-serif;box-shadow:0 8px 24px #1d4ed844;cursor:pointer}';
  document.head.appendChild(style);
  const banner = document.createElement('div');
  banner.className = 'connection-banner';
  banner.hidden = true;
  document.body.appendChild(banner);
  let hideTimer;
  function showConnection(online, initial = false) {
    clearTimeout(hideTimer);
    banner.hidden = false;
    banner.className = `connection-banner ${online ? 'online' : 'offline'}`;
    banner.textContent = online ? 'เชื่อมต่ออินเทอร์เน็ตแล้ว' : 'ออฟไลน์ — ระบบจะส่งข้อมูลไม่ได้จนกว่าจะเชื่อมต่ออีกครั้ง';
    if (online) hideTimer = setTimeout(() => { banner.hidden = true; }, initial ? 1 : 2500);
  }
  window.addEventListener('online', () => showConnection(true));
  window.addEventListener('offline', () => showConnection(false));
  showConnection(navigator.onLine, true);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); installPrompt = event;
    const button = document.createElement('button'); button.className = 'pwa-install'; button.textContent = 'ติดตั้งแอป'; document.body.appendChild(button);
    button.addEventListener('click', async () => { button.disabled = true; await installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; button.remove(); });
  });
  window.addEventListener('appinstalled', () => { installPrompt = null; document.querySelector('.pwa-install')?.remove(); });
  navigator.serviceWorker.register('/service-worker.js').catch(error => console.warn('PWA registration failed:', error.message));
})();
