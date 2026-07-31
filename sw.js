const CACHE_VERSION = 'paisa-v28';
const ASSETS = ['/paisa-app/','/paisa-app/index.html','/paisa-app/manifest.json','/paisa-app/icon-192.png','/paisa-app/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.destination === 'document' || url.pathname.endsWith('.html')) {
    e.respondWith(fetch(e.request).then(res => { const clone = res.clone(); caches.open(CACHE_VERSION).then(ca => ca.put(e.request, clone)); return res; }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(res => { const clone = res.clone(); caches.open(CACHE_VERSION).then(ca => ca.put(e.request, clone)); return res; })));
});

// ===== Background daily-summary notification =====
// A page-context setInterval only runs while the app is open, so it can't
// deliver a notification once the app/tab is closed. Periodic Background
// Sync lets the service worker itself wake up (best-effort, mainly on
// installed Android Chrome PWAs with enough site engagement) and fire the
// notification independently. The page keeps its own foreground timer too,
// which catches up immediately whenever the app is reopened — that combo is
// the most reliable outcome achievable without a push-notification server.
function idbOpenSW(){
  return new Promise((res,rej)=>{
    const req=indexedDB.open('paisa_fs',2);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains('handles')) db.createObjectStore('handles');
      if(!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
    };
    req.onsuccess=()=>res(req.result);
    req.onerror=()=>rej(req.error);
  });
}
async function swMetaGet(key){
  const db=await idbOpenSW();
  return new Promise((res)=>{
    const tx=db.transaction('meta','readonly');
    const rq=tx.objectStore('meta').get(key);
    rq.onsuccess=()=>res(rq.result);rq.onerror=()=>res(undefined);
  });
}
async function swMetaSet(key,val){
  const db=await idbOpenSW();
  return new Promise((res)=>{
    const tx=db.transaction('meta','readwrite');
    tx.objectStore('meta').put(val,key);
    tx.oncomplete=()=>res();tx.onerror=()=>res();
  });
}
async function runEODBackgroundCheck(){
  const prefs=await swMetaGet('notifPrefs');
  if(!prefs||!prefs.enabled) return;
  const [h,m]=(prefs.time||'21:00').split(':').map(Number);
  const now=new Date();
  const todayKey=now.toISOString().slice(0,10);
  const lastShown=await swMetaGet('eodShownDate');
  if(lastShown===todayKey) return;
  const nowMin=now.getHours()*60+now.getMinutes();
  if(nowMin<h*60+m) return;
  await self.registration.showNotification('📊 Paisa — Daily reminder',{
    body:"End of day! Don't forget to log any pending transactions.",
    icon:'/paisa-app/icon-192.png',badge:'/paisa-app/icon-192.png',tag:'paisa-eod'
  });
  await swMetaSet('eodShownDate',todayKey);
}
self.addEventListener('periodicsync', e => {
  if(e.tag==='paisa-eod-check') e.waitUntil(runEODBackgroundCheck());
});
self.addEventListener('sync', e => {
  if(e.tag==='paisa-eod-check') e.waitUntil(runEODBackgroundCheck());
});
