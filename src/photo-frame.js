let photoFrameDraft=null,photoFrameBusy=false;
function clampFrame(value,min,max,fallback){
  const n=Number(value);return value!=null&&Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;
}
function normalizePhotoFrame(row={},home=false){
  const prefix=home?"home_photo_":"photo_";
  return {x:clampFrame(row[prefix+"x"],0,100,50),y:clampFrame(row[prefix+"y"],0,100,50),zoom:clampFrame(row[prefix+"zoom"],1,3,1)};
}
function frameGeometry(frame){
  const x=clampFrame(frame.x,0,100,50),y=clampFrame(frame.y,0,100,50),z=clampFrame(frame.zoom,1,3,1);
  return {position:x+"% "+y+"%",transform:"scale("+z+")"};
}
function photoFrameStyle(row={},home=false){
  const g=frameGeometry(normalizePhotoFrame(row,home));
  return "object-position:"+g.position+";transform-origin:"+g.position+";transform:"+g.transform+";";
}
function applyPhotoFrame(img,row,home=false){
  if(!img)return;
  const g=frameGeometry(normalizePhotoFrame(row,home));
  img.style.objectPosition=g.position;img.style.transformOrigin=g.position;img.style.transform=g.transform;
}
function openMemoryFrame(id){const m=advCache.memories.find(x=>x.id===id);if(m?.photo_url)openPhotoFrame("memory",m);}
function openHomeFrame(){openPhotoFrame("home",coupleSettings);}
async function openPhotoFrame(kind,row){
  const home=kind==="home",frame=normalizePhotoFrame(row,home),path=home?row.home_photo_path:row.photo_url;
  const st={kind,id:row.id,path,frame,account:user?.id,space:couple?.id};photoFrameDraft=st;
  openAdvModal(home?"Ajustar portada ❤️":"Ajustar foto 📸",`<p class="advMeta">Arrastra la imagen o usa los controles. Se guarda el encuadre, no un recorte de la foto original.</p><div class="photoFramePreview ${home?"photoFrameCover":""}" id="photoFramePreview"><img id="photoFrameImage" alt="Vista previa del encuadre" draggable="false"><span id="photoFrameLoading" role="status">Cargando foto…</span></div>
  <div class="homePhotoCropControls"><div><label>🔎 Zoom <output id="photoFrameZoomText"></output></label><input type="range" id="photoFrameZoom" min="1" max="3" step="0.05" oninput="changePhotoFrame('zoom',this.value)"></div>
  <div><label>↔️ Horizontal <output id="photoFrameXText"></output></label><input type="range" id="photoFrameX" min="0" max="100" step="1" oninput="changePhotoFrame('x',this.value)"></div>
  <div><label>↕️ Vertical <output id="photoFrameYText"></output></label><input type="range" id="photoFrameY" min="0" max="100" step="1" oninput="changePhotoFrame('y',this.value)"></div></div>
  <div class="modalBtns"><button class="btn" onclick="resetPhotoFrame()">Restablecer</button><button class="btn" onclick="closeAdvModal()">Cancelar</button><button class="btn primary" id="photoFrameSave" onclick="savePhotoFrame()" disabled>Guardar encuadre ❤️</button></div>`);
  refreshPhotoFramePreview();
  const preview=$("photoFramePreview"),pointers=new Map();
  let previous=null;
  const geometry=()=>{
    const points=[...pointers.values()];
    if(!points.length)return null;
    const a=points[0],b=points[1];
    return b?{x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(a.x-b.x,a.y-b.y)}:{x:a.x,y:a.y,distance:0};
  };
  preview.addEventListener("pointerdown",e=>{if(photoFrameDraft!==st)return;e.preventDefault();preview.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});previous=geometry();});
  preview.addEventListener("pointermove",e=>{
    if(photoFrameDraft!==st||!pointers.has(e.pointerId))return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const next=geometry(),rect=preview.getBoundingClientRect();
    if(previous&&next&&rect.width&&rect.height){
      st.frame.x=clampFrame(st.frame.x-(next.x-previous.x)/rect.width*100,0,100,50);
      st.frame.y=clampFrame(st.frame.y-(next.y-previous.y)/rect.height*100,0,100,50);
      if(previous.distance&&next.distance)st.frame.zoom=clampFrame(st.frame.zoom*next.distance/previous.distance,1,3,1);
      refreshPhotoFramePreview();
    }
    previous=next;
  });
  const release=e=>{pointers.delete(e.pointerId);previous=geometry();};
  preview.addEventListener("pointerup",release);preview.addEventListener("pointercancel",release);
  try{
    const url=home?(await signedPhoto(path)||(!path?"pareja.jpeg":null)):await memoryImageUrl(path);
    if(photoFrameDraft!==st||!$("photoFrameImage")||user?.id!==st.account||couple?.id!==st.space)return;
    if(!url)throw new Error("No se pudo abrir la foto.");
    const img=$("photoFrameImage");
    img.onload=()=>{if(photoFrameDraft===st&&$("photoFrameSave")){$("photoFrameLoading").hidden=true;$("photoFrameSave").disabled=false;}};
    img.onerror=()=>{if(photoFrameDraft===st&&$("photoFrameLoading"))$("photoFrameLoading").textContent="No se pudo cargar la foto.";};
    img.src=url;
  }catch(error){if(photoFrameDraft===st&&$("photoFrameLoading"))$("photoFrameLoading").textContent="No se pudo cargar la foto.";}
}
function refreshPhotoFramePreview(){
  const st=photoFrameDraft,img=$("photoFrameImage");if(!st||!img)return;
  const g=frameGeometry(st.frame);img.style.objectPosition=g.position;img.style.transformOrigin=g.position;img.style.transform=g.transform;
  for(const [key,control] of [["x","X"],["y","Y"],["zoom","Zoom"]]){
    $("photoFrame"+control).value=st.frame[key];$("photoFrame"+control+"Text").textContent=key==="zoom"?st.frame[key].toFixed(2)+"×":Math.round(st.frame[key])+"%";
  }
}
function changePhotoFrame(key,value){
  if(!photoFrameDraft||!["x","y","zoom"].includes(key))return;
  photoFrameDraft.frame[key]=clampFrame(value,key==="zoom"?1:0,key==="zoom"?3:100,key==="zoom"?1:50);refreshPhotoFramePreview();
}
function resetPhotoFrame(){if(photoFrameDraft){photoFrameDraft.frame={x:50,y:50,zoom:1};refreshPhotoFramePreview();}}
async function savePhotoFrame(){
  const st=photoFrameDraft;if(!st||photoFrameBusy||user?.id!==st.account||couple?.id!==st.space)return;
  photoFrameBusy=true;
  try{
    const {x,y,zoom}=st.frame;
    if(st.kind==="home"){
      if(coupleSettings.home_photo_path!==st.path)throw new Error("La foto cambió. Abre el editor nuevamente.");
      if(!await saveCoupleSettings({home_photo_x:x,home_photo_y:y,home_photo_zoom:zoom}))return;
    }else{
      const {error}=await sb.from("memories").update({photo_x:x,photo_y:y,photo_zoom:zoom}).eq("id",st.id).eq("couple_id",st.space).eq("photo_url",st.path).select("id").single();
      if(error)throw error;
      await advLoadAll(["memories"]);
    }
    if(photoFrameDraft!==st)return;
    closeAdvModal();renderAdvanced();showAppToast("Encuadre guardado. Conservamos la foto original. ❤️");
  }catch(error){appAlert("No pudimos guardar el encuadre. "+(error.message||""));}
  finally{photoFrameBusy=false;}
}
