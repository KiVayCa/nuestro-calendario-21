const CACHE='calendario21-v30';
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','./index.html','./styles.css','./app.js','./places-map.js','./manifest.json','./icon-192.png','./icon-512.png','./pareja.jpeg'])).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==self.location.origin)return;
 e.respondWith((async()=>{
  try{
   // Las navegaciones siempre intentan obtener el HTML vigente; la caché queda solo como respaldo offline.
   const request=e.request.mode==='navigate'?new Request(e.request,{cache:'no-store'}):e.request;
   const response=await fetch(request);
   if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});}
   return response;
  }catch(_){return await caches.match(e.request);}
 })());
});
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
