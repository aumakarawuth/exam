const CACHE_NAME = 'exam-shell-v2';
const SHELL = [
  '/', '/student.html', '/admin', '/admin.html', '/teacher', '/teacher.html', '/object-analysis-design', '/object-analysis-design.html',
  '/manifest.webmanifest', '/assets/app-icon.svg', '/assets/pwa.js',
  '/assets/student.css', '/assets/student-boot.js', '/assets/student-main.js',
  '/assets/admin.css', '/assets/admin-boot.js', '/assets/admin-main.js',
  '/assets/teacher.css', '/assets/teacher-boot.js', '/assets/teacher-main.js',
  '/assets/object-analysis-design.css', '/assets/object-analysis-design-boot.js', '/assets/object-analysis-design-main.js', '/assets/object-analysis-design-main-2.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match('/'))));
    return;
  }
  event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    }).catch(() => caches.match(request)));
});
