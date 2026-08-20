const CACHE='ai-clock-v2.5.0';
const ASSETS=['./','./index.html','./style.css','./v2.2.css','./v2.3.css','./v2.4.css','./v2.4-settings.css','./v2.5.css','./manifest.webmanifest','./icon.svg','./js/app.js','./js/core.js','./js/world-clock.js','./js/stopwatch.js','./js/timer.js','./js/alarm.js','./js/converter.js','./js/meeting-planner.js','./js/meeting-planner-service.js','./js/settings.js','./js/notification.js','./js/dashboard.js','./js/shortcut-router.js'];
self.addEventListener('install',(event)=>{ event.waitUntil(caches.open(CACHE).then((cache)=>cache.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate',(event)=>{ event.waitUntil(caches.keys().then((keys)=>Promise.all(keys.filter((key)=>key!==CACHE).map((key)=>caches.delete(key))))); self.clients.claim(); });
self.addEventListener('fetch',(event)=>{
  if(event.request.method!=='GET') return;
  event.respondWith(caches.match(event.request).then((cached)=>cached||fetch(event.request).then((response)=>{ const copy=response.clone(); caches.open(CACHE).then((cache)=>cache.put(event.request,copy)); return response; }).catch(()=>caches.match('./index.html'))));
});
self.addEventListener('notificationclick',(event)=>{
  event.notification.close();
  const target=event.notification.data?.url||'./?view=home';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then((list)=>{
    const existing=list.find((client)=>'focus' in client);
    if(existing){ existing.navigate(target); return existing.focus(); }
    return clients.openWindow(target);
  }));
});
