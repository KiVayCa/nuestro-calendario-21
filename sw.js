const CACHE='calendario21-v16';
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png','./pareja.jpeg'])).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request))));

self.addEventListener('push',e=>{
  let data={title:'Nuestro Calendario #21',body:'Tienes una novedad de pareja. ❤️',url:'/'};
  try{if(e.data)data={...data,...e.data.json()};}catch(_){if(e.data)data.body=e.data.text();}
  e.waitUntil(self.registration.showNotification(data.title||'Nuestro Calendario #21',{
    body:data.body||'Tienes una novedad de pareja. ❤️',
    icon:'/icon-192.png',badge:'/icon-192.png',tag:data.tag||'nc21-notification',
    data:{url:data.url||'/'},renotify:false
  }));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const target=new URL(e.notification.data?.url||'/',self.location.origin).href;
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{
    for(const client of clients){if(new URL(client.url).origin===self.location.origin){client.navigate(target);return client.focus();}}
    return self.clients.openWindow(target);
  }));
});
