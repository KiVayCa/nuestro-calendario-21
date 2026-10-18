(function(){
let placesMapInstance=null;
let placeDraftMarker=null;
let placeSearchResults=[];
let lastPlaceSearchAt=0;
function selectedPlaceById(id){return id?(advCache.places||[]).find(function(p){return p.id===id;})||null:null;}
window.selectedPlaceById=selectedPlaceById;
function placeLinkHtml(id,label){return '<button type="button" class="placeTextLink" onclick="showPlaceInPlaces(\''+esc(id)+'\')">'+esc(label||'Ver lugar')+'</button>';}
window.placeLinkHtml=placeLinkHtml;
function showPlaceInPlaces(id){
 showAdvancedTab('places');
 setTimeout(function(){
  const cards=Array.from(document.querySelectorAll('#advancedContent [data-advanced-id]'));
  const card=cards.find(function(el){return el.getAttribute('data-advanced-id')===String(id);});
  if(card){card.scrollIntoView({behavior:'smooth',block:'center'});card.style.transition='box-shadow .25s ease';card.style.boxShadow='0 0 0 3px #e64d78, 0 12px 35px #562c3920';setTimeout(function(){card.style.boxShadow='';},2200);}
  if(typeof focusSavedPlace==='function')setTimeout(function(){focusSavedPlace(id);},120);
 },180);
}
window.showPlaceInPlaces=showPlaceInPlaces;
function placeSelectField(id,label){return '<div class="field"><label>'+label+'</label><select id="adv_'+id+'"><option value="">Sin lugar vinculado</option>'+(advCache.places||[]).map(function(p){return '<option value="'+esc(p.id)+'">'+esc(p.name)+(p.address?' — '+esc(p.address):'')+'</option>';}).join('')+'</select></div>';}
function placeMapsUrl(p){const raw=String(p.google_maps_url||'').trim();if(/^https?:\/\//i.test(raw)&&/(maps\.app\.goo\.gl|goo\.gl|google\.[^/]+\/maps|maps\.google\.[^/]+)/i.test(raw))return raw;if(p.latitude!=null&&p.longitude!=null)return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.latitude+','+p.longitude);return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([p.name||'',p.address||''].filter(Boolean).join(' '));}
function openGoogleMapsSearch(fromForm){let q='';if(fromForm){q=(document.getElementById('adv_place_search_query')||{}).value||(document.getElementById('adv_title')||{}).value||'';}else{q=(document.getElementById('placesMapSearch')||{}).value||'';}q=q.trim();if(!q){alert('Escribe primero el nombre del lugar que quieres buscar.');return;}const w=window.open('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q),'_blank');if(w)w.opener=null;}
window.openGoogleMapsSearch=openGoogleMapsSearch;
function renderAdvPlaces(){
 let html=advHeader('Nuestro mapa de lugares','Guarden sitios desde el mapa, búsquenlos aquí o tráiganlos desde Google Maps. Cada lugar podrá vincularse con recuerdos, sueños, metas y planes.','📍 Guardar lugar','openPlaceForm()');
 html+='<div class="advCard" style="margin-top:16px"><div class="placesMapToolbar"><input id="placesMapSearch" type="search" placeholder="Buscar un lugar o dirección (ej. Salento, Quindío)" onkeydown="if(event.key===\'Enter\'){event.preventDefault();searchPlacesFromMap();}"><button class="btn primary" onclick="searchPlacesFromMap()">🔎 Buscar en el mapa</button><button class="btn" onclick="openGoogleMapsSearch(false)">🌐 Buscar en Google Maps</button></div><div id="placeSearchResults" class="placeSearchResults" aria-live="polite"></div></div>';
 html+='<div class="placesMapShell"><div id="placesMap" role="region" aria-label="Mapa compartido de lugares"></div></div><div class="placesAttribution">Mapa © OpenStreetMap contributors · Mapa interactivo con Leaflet. La búsqueda se realiza solo cuando ustedes pulsan Buscar.</div>';
 html+='<div class="advList" style="margin-top:16px">';
 if((advCache.places||[]).length){html+=(advCache.places||[]).map(function(p){return '<div class="advItem" data-advanced-id="'+esc(p.id)+'"><div style="flex:1"><div class="advItemTitle">📍 '+esc(p.name)+'</div><div class="advMeta">'+esc(p.category||'Lugar')+(p.visit_date?' · '+dateES(p.visit_date):'')+(p.address?' · '+esc(p.address):'')+'</div><p>'+esc(p.description||'')+'</p><div class="advActions" style="justify-content:flex-start">'+(p.latitude!=null&&p.longitude!=null?'<button class="btn" onclick="focusSavedPlace(\''+esc(p.id)+'\')">📌 Ver en el mapa</button>':'')+'<a class="btn" style="text-decoration:none" target="_blank" rel="noopener noreferrer" href="'+esc(placeMapsUrl(p))+'">🌐 Abrir Google Maps</a></div></div><div class="advActions"><button class="btn" onclick="openAdvancedEdit(\'places\',\''+esc(p.id)+'\')">✏️ Editar</button><button class="btn danger" onclick="deleteAdvanced(\'places\',\''+esc(p.id)+'\')">🗑️</button></div></div>';}).join('');}
 else{html+='<div class="advEmpty">📍 Su mapa está esperando el primer lugar. Busquen uno o guárdenlo desde Google Maps.</div>';}
 return html+'</div>';
}
window.renderAdvPlaces=renderAdvPlaces;
function initPlacesMap(){
 const el=document.getElementById('placesMap');if(!el)return;
 if(placesMapInstance){try{placesMapInstance.remove();}catch(e){}placesMapInstance=null;}
 if(!window.L){el.innerHTML='<div class="advEmpty">No se pudo cargar el mapa. Comprueba tu conexión e inténtalo de nuevo.</div>';return;}
 placesMapInstance=L.map(el,{scrollWheelZoom:false}).setView([4.4389,-75.2322],6);
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'}).addTo(placesMapInstance);
 placesMapInstance.on('click',function(e){const lat=Number(e.latlng.lat.toFixed(6)),lon=Number(e.latlng.lng.toFixed(6));if(placeDraftMarker){try{placesMapInstance.removeLayer(placeDraftMarker);}catch(err){}}placeDraftMarker=L.marker([lat,lon],{draggable:true}).addTo(placesMapInstance).bindPopup('Ubicación seleccionada · puedes mover el marcador para ajustarla').openPopup();placeDraftMarker.on('dragend',function(){const pos=placeDraftMarker.getLatLng();setField('adv_latitude',pos.lat.toFixed(6));setField('adv_longitude',pos.lng.toFixed(6));});openPlaceForm(false);setTimeout(function(){setField('adv_latitude',lat);setField('adv_longitude',lon);setField('adv_address','Ubicación seleccionada manualmente en el mapa');const name=document.getElementById('adv_title');if(name)name.focus();},0);});
 const pts=[];
 (advCache.places||[]).forEach(function(p){if(p.latitude==null||p.longitude==null)return;const lat=Number(p.latitude),lon=Number(p.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lon))return;const popup='<div class="placeMapPopup"><strong>'+esc(p.name)+'</strong>'+(p.address?'<div>'+esc(p.address)+'</div>':'')+(p.category?'<div>'+esc(p.category)+'</div>':'')+'<a href="'+esc(placeMapsUrl(p))+'" target="_blank" rel="noopener noreferrer">Abrir en Google Maps ↗</a></div>';L.marker([lat,lon]).addTo(placesMapInstance).bindPopup(popup);pts.push([lat,lon]);});
 if(pts.length>1)placesMapInstance.fitBounds(pts,{padding:[28,28],maxZoom:13});else if(pts.length===1)placesMapInstance.setView(pts[0],14);
 setTimeout(function(){if(placesMapInstance)placesMapInstance.invalidateSize();},120);
}
window.initPlacesMap=initPlacesMap;
function focusSavedPlace(id){const p=selectedPlaceById(id);if(!p||p.latitude==null||p.longitude==null||!placesMapInstance)return;placesMapInstance.setView([Number(p.latitude),Number(p.longitude)],15);let target=null;placesMapInstance.eachLayer(function(l){if(l instanceof L.Marker){const a=l.getLatLng();if(Math.abs(a.lat-Number(p.latitude))<0.000001&&Math.abs(a.lng-Number(p.longitude))<0.000001)target=l;}});if(target)target.openPopup();}
window.focusSavedPlace=focusSavedPlace;
async function runPlaceSearch(query,targetId,mode){
 query=(query||'').trim();const target=document.getElementById(targetId);
 if(Date.now()-lastPlaceSearchAt<1100){if(target)target.innerHTML='<div class="advMeta">Espera un momento antes de hacer otra búsqueda.</div>';return;}lastPlaceSearchAt=Date.now();
 if(!query){if(target)target.innerHTML='<div class="advMeta">Escribe el nombre de un sitio o una dirección.</div>';return;}
 if(target)target.innerHTML='<div class="advMeta">Buscando lugares…</div>';
 try{const url='https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&accept-language=es&q='+encodeURIComponent(query);const res=await fetch(url,{headers:{Accept:'application/json'}});if(!res.ok)throw new Error('Buscador no disponible');placeSearchResults=await res.json()||[];
 if(!target)return;if(!placeSearchResults.length){target.innerHTML='<div class="advMeta">No encontramos resultados. Prueba con el nombre y la ciudad o usa Google Maps.</div>';return;}
 target.innerHTML=placeSearchResults.map(function(r,i){const label=r.name||String(r.display_name||'').split(',')[0];return '<button type="button" class="placeSearchResult" onclick="usePlaceSearchResult('+i+',\''+mode+'\')"><span><strong>'+esc(label)+'</strong><small>'+esc(r.display_name||'')+'</small></span><span>＋</span></button>';}).join('');
 }catch(e){if(target)target.innerHTML='<div class="advMeta">No se pudo buscar ahora. Puedes abrir Google Maps o escribir el lugar manualmente.</div>';}
}
function searchPlacesFromMap(){runPlaceSearch((document.getElementById('placesMapSearch')||{}).value,'placeSearchResults','map');}
function searchPlacesForForm(){runPlaceSearch((document.getElementById('adv_place_search_query')||{}).value,'adv_place_search_results','form');}
window.searchPlacesFromMap=searchPlacesFromMap;window.searchPlacesForForm=searchPlacesForForm;
function setField(id,value){const el=document.getElementById(id);if(el)el.value=value==null?'':String(value);}
function usePlaceSearchResult(index,mode){const r=placeSearchResults[index];if(!r)return;const name=r.name||String(r.display_name||'').split(',')[0],address=r.display_name||'',lat=Number(r.lat),lon=Number(r.lon);if(mode==='map'){openPlaceForm(false);setTimeout(function(){setField('adv_title',name);setField('adv_address',address);setField('adv_latitude',lat);setField('adv_longitude',lon);},0);}else{setField('adv_title',name);setField('adv_address',address);setField('adv_latitude',lat);setField('adv_longitude',lon);}const target=document.getElementById(mode==='map'?'placeSearchResults':'adv_place_search_results');if(target)target.innerHTML='';}
window.usePlaceSearchResult=usePlaceSearchResult;
function importGoogleMapsCoordinates(){const raw=((document.getElementById('adv_google_maps_url')||{}).value||'').trim();let m=raw.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);if(!m)m=raw.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);if(!m)m=raw.match(/[?&](?:q|query|ll|center)=(-?\d+(?:\.\d+)?)(?:%2C|,|%2c)\s*(-?\d+(?:\.\d+)?)/i);if(!m)m=raw.match(/\/(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)(?:[,/?!]|$)/);if(m){setField('adv_latitude',m[1]);setField('adv_longitude',m[2]);alert('Coordenadas detectadas. Revisa el nombre y la dirección antes de guardar.');}else alert('Este enlace no incluye coordenadas legibles (suele pasar con enlaces cortos de Google Maps). Puedes conservarlo como enlace, buscar el lugar con el buscador de la aplicación o hacer clic directamente en el mapa para marcar su ubicación.');}
function openPlaceGoogleMapsLink(){const raw=((document.getElementById('adv_google_maps_url')||{}).value||'').trim();if(!raw)return alert('Pega primero el enlace de Google Maps.');let url=raw;if(!/^https?:\/\//i.test(url))url='https://'+url;if(!/^(https?:\/\/)(www\.)?(maps\.app\.goo\.gl|goo\.gl|maps\.google\.[^/]+|google\.[^/]+)(\/|$)/i.test(url))return alert('Pega un enlace válido de Google Maps, por ejemplo https://maps.app.goo.gl/...');const w=window.open(url,'_blank');if(w)w.opener=null;}
window.openPlaceGoogleMapsLink=openPlaceGoogleMapsLink;
window.importGoogleMapsCoordinates=importGoogleMapsCoordinates;
function openPlaceForm(isEdit){if(!isEdit)advancedEditState={key:null,id:null};openAdvModal(isEdit?'Editar lugar 📍':'Nuevo lugar 📍',formShell(input('title','Nombre del lugar')+'<div class="field"><label>Buscar dentro de la aplicación</label><div style="display:flex;gap:8px;flex-wrap:wrap"><input id="adv_place_search_query" type="search" placeholder="Nombre del sitio o dirección" style="flex:1;min-width:190px"><button type="button" class="btn" onclick="searchPlacesForForm()">🔎 Buscar</button></div><div id="adv_place_search_results" class="placeSearchResults"></div></div>'+textarea('description','Qué significa para ustedes')+'<div class="advFormGrid">'+input('address','Dirección')+input('visit_date','Fecha de visita','date')+'</div><div class="advFormGrid">'+input('latitude','Latitud','number','step="any"')+input('longitude','Longitud','number','step="any"')+'</div>'+input('google_maps_url','Enlace de Google Maps','url','placeholder="Pega aquí el enlace del sitio"')+'<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn" onclick="importGoogleMapsCoordinates()">📌 Leer coordenadas del enlace</button><button type="button" class="btn" onclick="openPlaceGoogleMapsLink()">↗️ Probar enlace</button><button type="button" class="btn" onclick="openGoogleMapsSearch(true)">🌐 Buscar en Google Maps</button></div>'+select('category','Categoría',[['especial','Especial'],['cita','Cita'],['viaje','Viaje'],['restaurante','Restaurante'],['hogar','Hogar']]),'savePlace()'));}
window.openPlaceForm=openPlaceForm;
async function savePlace(){if(advancedEditState.key==='places'&&advancedEditState.id)return saveAdvancedEdit();const title=document.getElementById('adv_title').value.trim();if(!title)return alert('Escribe el nombre del lugar');const lat=document.getElementById('adv_latitude').value,lon=document.getElementById('adv_longitude').value;const {error}=await sb.from('places').insert({couple_id:couple.id,created_by:user.id,name:title,description:document.getElementById('adv_description').value,address:document.getElementById('adv_address').value,visit_date:document.getElementById('adv_visit_date').value||null,latitude:lat===''?null:Number(lat),longitude:lon===''?null:Number(lon),google_maps_url:document.getElementById('adv_google_maps_url').value.trim()||null,category:document.getElementById('adv_category').value});if(error)return alert('No se pudo guardar el lugar: '+error.message);closeAdvModal();await advLoadAll();}
window.savePlace=savePlace;
function injectPlaceSelector(){const form=document.querySelector('#advModalBody .advForm');if(!form||document.getElementById('adv_place_id'))return;form.insertAdjacentHTML('beforeend',placeSelectField('place_id','Vincular con un lugar del mapa'));}
['openMemoryForm','openLetterForm','openDreamForm','openChallengeForm','openGoalForm','openDateForm','openIdeaForm'].forEach(function(name){const original=window[name];if(typeof original!=='function')return;window[name]=function(isEdit){original(isEdit);injectPlaceSelector();};});
const originalOpenAdvancedEdit=window.openAdvancedEdit;
if(originalOpenAdvancedEdit)window.openAdvancedEdit=function(key,id){originalOpenAdvancedEdit(key,id);const x=(advCache[key]||[]).find(function(i){return i.id===id;});const el=document.getElementById('adv_place_id');if(el)el.value=x&&x.place_id||'';if(key==='places'&&x)setField('adv_google_maps_url',x.google_maps_url||'');};
const originalOpenModal=window.openModal,originalOpenEditModal=window.openEditModal;
function populatePlanPlaceSelect(selectedId){const el=document.getElementById('planPlaceId');if(!el)return;const old=selectedId||el.value||'';el.innerHTML='<option value="">Sin lugar vinculado</option>'+(advCache.places||[]).map(function(p){return '<option value="'+esc(p.id)+'">'+esc(p.name)+(p.address?' — '+esc(p.address):'')+'</option>';}).join('');el.value=old;}
window.populatePlanPlaceSelect=populatePlanPlaceSelect;
function syncPlanPlaceLocation(){const sel=document.getElementById('planPlaceId'),p=selectedPlaceById(sel&&sel.value);if(p){const loc=document.getElementById('location');if(loc)loc.value=p.name;}}
window.syncPlanPlaceLocation=syncPlanPlaceLocation;
if(originalOpenModal)window.openModal=function(d){originalOpenModal(d);populatePlanPlaceSelect('');};
if(originalOpenEditModal)window.openEditModal=function(plan){originalOpenEditModal(plan);populatePlanPlaceSelect(plan&&plan.place_id||'');};
const originalRenderAdvanced=window.renderAdvanced;
if(originalRenderAdvanced)window.renderAdvanced=function(){if(placesMapInstance){try{placesMapInstance.remove();}catch(e){}placesMapInstance=null;}originalRenderAdvanced();if(advancedTab==='places')setTimeout(initPlacesMap,100);};
})();