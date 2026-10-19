

/* =====================================================
   SUPABASE
===================================================== */

const SUPABASE_URL =
'https://vmvfcdtohzdhqatxhxdb.supabase.co';

const SUPABASE_KEY =
'sb_publishable_B7N7E-vcuumKlEsEuyxkhQ_vJAZLnl3';


/* =====================================================
   USUARIOS PERMITIDOS
===================================================== */

const allowed = [

  'nickolasmorales82@gmail.com',

  'nickodavid@hotmail.com',

  'anamariagarciazapata3@gmail.com'

];


let sb = null;

let user = null;

let couple = null;

let plans = [];

let view = new Date();

let currentPlan = null;

let currentDay = null;

let realtimeChannel = null;


const $ = id =>
document.getElementById(id);


/* =====================================================
   MENSAJES
===================================================== */

function setMsg(text,ok=false){

  $('loginMsg').textContent =
    text;

  $('loginMsg').style.color =
    ok
    ? '#27845b'
    : 'var(--muted)';

}


/* =====================================================
   FECHAS
===================================================== */

const months = [

  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'

];


const iso = d =>

  d.getFullYear() +
  '-' +
  String(
    d.getMonth()+1
  ).padStart(2,'0') +
  '-' +
  String(
    d.getDate()
  ).padStart(2,'0');


function days(d){

  return Math.max(

    0,

    Math.floor(

      (
        Date.now() -
        d.getTime()
      ) /
      86400000

    )

  );

}


/* =====================================================
   CONTADORES
===================================================== */

function counters(){

  const togetherDays =
    days(
      new Date(
        '2026-01-21T00:00:00'
      )
    );


  const datingDays =
    days(
      new Date(
        '2026-04-21T00:00:00'
      )
    );


  $('together').innerHTML =
    togetherDays +
    ' <small>días juntos</small>';


  $('dating').innerHTML =
    datingDays +
    ' <small>días de novios</small>';


  $('story').textContent =
    togetherDays +
    ' días de historia';

}


counters();

setInterval(
  counters,
  60000
);


/* =====================================================
   LOGIN
===================================================== */

async function login(){

  try{

    const email =
      $('email')
      .value
      .trim()
      .toLowerCase();


    const password =
      $('password').value;


    if(!email){

      setMsg(
        'Escribe tu correo ❤️'
      );

      return;

    }


    if(!password){

      setMsg(
        'Escribe tu contraseña 🔐'
      );

      return;

    }


    if(
      !allowed.includes(email)
    ){

      setMsg(
        'Este espacio es privado para Nicolás y Ana María ❤️'
      );

      return;

    }


    if(!sb){

      setMsg(
        'No se pudo conectar con Supabase. Recarga la página.'
      );

      return;

    }


    $('loginBtn').disabled =
      true;


    setMsg(
      'Entrando a Nuestro Calendario…'
    );


    const {
      data,
      error
    } =
    await sb.auth.signInWithPassword({

      email:email,

      password:password

    });


    $('loginBtn').disabled =
      false;


    if(error){

      console.error(error);

      setMsg(
        'Correo o contraseña incorrectos.'
      );

      return;

    }


    user =
      data.user;


    await setup();


  }catch(err){

    console.error(err);

    $('loginBtn').disabled =      false;

    setMsg(
      'Ocurrió un error inesperado.'
    );

  }

}


/* =====================================================
   CREAR CUENTA
===================================================== */

async function register(){

  try{

    const email =
      $('email')
      .value
      .trim()
      .toLowerCase();


    const password =
      $('password').value;


    if(!email){

      setMsg(
        'Escribe tu correo ❤️'
      );

      return;

    }


    if(password.length < 6){

      setMsg(
        'La contraseña debe tener mínimo 6 caracteres.'
      );

      return;

    }


    if(
      !allowed.includes(email)
    ){

      setMsg(
        'Este espacio es privado para Nicolás y Ana María ❤️'
      );

      return;

    }


    $('registerBtn').disabled =
      true;

    setMsg(
      'Creando tu cuenta…'
    );


    const {
      data,
      error
    } =
    await sb.auth.signUp({

      email:email,

      password:password,

      options:{

        emailRedirectTo:
        'https://nuestrocalendario21.vercel.app/'

      }

    });


    $('registerBtn').disabled =
      false;


    if(error){

      console.error(error);

      setMsg(
        error.message
      );

      return;

    }


    if(data.session){

      user =
        data.user;

      await setup();

    }else{

      setMsg(
        'Cuenta creada. Revisa tu correo para confirmar tu cuenta ❤️',
        true
      );

    }


  }catch(err){

    console.error(err);

    $('registerBtn').disabled =
      false;

    setMsg(
      'No pudimos crear la cuenta.'
    );

  }

}


/* =====================================================
   RECUPERAR CONTRASEÑA
===================================================== */

async function forgotPassword(){

  const email =
    $('email')
    .value
    .trim()
    .toLowerCase();


  if(!email){

    setMsg(
      'Escribe primero tu correo.'
    );

    return;

  }


  if(
    !allowed.includes(email)
  ){

    setMsg(
      'Este espacio es privado para Nicolás y Ana María ❤️'
    );

    return;

  }


  try{

    const {
      error
    } =
    await sb.auth.resetPasswordForEmail(

      email,

      {

        redirectTo:
        'https://nuestrocalendario21.vercel.app/'

      }

    );


    if(error){

      console.error(error);

      setMsg(
        'No pudimos enviar el correo de recuperación.'
      );

      return;

    }


    setMsg(
      'Te enviamos un correo para recuperar tu contraseña ❤️',
      true
    );


  }catch(err){

    console.error(err);

    setMsg(
      'No pudimos enviar el correo de recuperación.'
    );

  }

}


/* Evita ejecutar setup más de una vez al restaurar la misma sesión. */
let authSetupUserId=null;

/* =====================================================
   INICIALIZAR
===================================================== */

async function init(){

  try{

    if(!window.supabase){

      setMsg(
        'No se pudo cargar Supabase. Recarga la página.'
      );

      return;

    }


    sb =
      window.supabase.createClient(

        SUPABASE_URL,

        SUPABASE_KEY

      );


    $('login')
      .classList
      .add('hidden');

    $('join')
      .classList
      .add('hidden');

    $('app')
      .classList
      .add('hidden');


    sb.auth.onAuthStateChange(

      async(
        event,
        session
      )=>{

        console.log(
          'Supabase Auth:',
          event
        );


        if(session && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')){
          user = session.user;
          // SIGNED_IN puede emitirse al volver a una pestaña o renovar el token.
          // Si este usuario ya está configurado, no reactives la pantalla de carga.
          if(authSetupUserId===session.user.id)return;
          document.body.classList.add('auth-pending');
          authSetupUserId=session.user.id;
          setup().catch(err=>{
            authSetupUserId=null;
            console.error('No se pudo restaurar la sesión:',err);
            document.body.classList.remove('auth-pending');
            $('login').classList.remove('hidden');
          });
        } else if(event === 'INITIAL_SESSION' && !session){
          document.body.classList.remove('auth-pending');
          $('login').classList.remove('hidden');
        }


        if(
          event === 'SIGNED_OUT'
        ){

          authSetupUserId=null;
          user = null;

          couple = null;

          plans = [];

          if(realtimeChannel){

            await sb
              .removeChannel(
                realtimeChannel
              );

            realtimeChannel = null;

          }


          $('app')
            .classList
            .add('hidden');


          $('join')
            .classList
            .add('hidden');


          document.body.classList.remove('auth-pending');
          $('login')
            .classList
            .remove('hidden');


          $('email').value =
            '';

          $('password').value =
            '';


          setMsg('');

        }

      }

    );


  }catch(err){

    console.error(err);

    setMsg(
      'No se pudo inicializar la aplicación.'
    );

  }

}


/* =====================================================
   CONFIGURAR USUARIO
===================================================== */

async function setup(){

  if(
    !user ||
    !sb
  )
    return;


  $('userLine').textContent =
    'Conectado como ' +
    user.email;


  const {
    data:mem,
    error
  } =
  await sb

    .from('couple_members')

    .select(
      'couple_id,display_name'
    )

    .eq(
      'user_id',
      user.id
    )

    .maybeSingle();


  if(error){

    console.error(error);

    $('login')
      .classList
      .add('hidden');

    $('join')
      .classList
      .remove('hidden');

    $('joinMsg').textContent =
      'Hay un problema con el espacio compartido: ' +
      error.message;

    return;

  }


  if(mem){

    couple = {

      id:
      mem.couple_id

    };


    await showApp();

    return;

  }


  if(
    user.email ===
    'nickolasmorales82@gmail.com'
  ){

    const {data:c,error} = await sb.rpc('get_or_create_our_couple');

    if(error){
      console.error('No se pudo obtener el espacio compartido:',error);
      $('login').classList.add('hidden');
      $('join').classList.remove('hidden');
      $('joinMsg').textContent = 'No pudimos preparar el espacio: ' + error.message;
      return;
    }

    couple = c;
    $('joinCode').textContent = c.join_code || 'NUESTRO #21';
    $('join').classList.remove('hidden');
    $('login').classList.add('hidden');
    $('joinMsg').textContent = 'Este es tu código. Compártelo con Ana. ❤️';
    return;

  }

  $('login')
    .classList
    .add('hidden');


  $('join')
    .classList
    .remove('hidden');


  $('joinCode').textContent =
    'NUESTRO #21';


  $('joinIntro').textContent =    'Nicolás debe compartir contigo el código de su espacio.';


  $('joinMsg').textContent =
    'Pega el código cuando lo tengas. ❤️';

}


/* =====================================================
   UNIR ANA
===================================================== */

$('joinBtn').onclick =
async()=>{

  const code = await appPrompt(
      'Pega aquí el código que le apareció a Nicolás:'
    );


  if(!code)
    return;


  $('joinMsg').textContent =
    'Uniendo nuestro espacio…';


  const {
    data:c,
    error
  } =
  await sb.rpc(

    'join_couple',

    {

      p_join_code:
      code.trim(),

      p_display_name:
      'Ana María'

    }

  );


  if(error){

    console.error(error);

    $('joinMsg').textContent =
      'No pudimos unirnos: ' +
      error.message;

    return;

  }


  couple = c;

  await showApp();

};


/* =====================================================
   MOSTRAR APP
===================================================== */

async function showApp(){

  $('login')
    .classList
    .add('hidden');


  $('join')
    .classList
    .add('hidden');


  $('app')
    .classList
    .remove('hidden');


  await loadPlans();


  if(realtimeChannel){

    await sb
      .removeChannel(
        realtimeChannel
      );

  }


  realtimeChannel =
    sb

      .channel(
        'plans-live-' +
        couple.id
      )

      .on(

        'postgres_changes',

        {

          event:'*',

          schema:'public',

          table:'plans',

          filter:
          'couple_id=eq.' +
          couple.id

        },

        ()=>{

          loadPlans();

        }

      )

      .subscribe();

  const advArea=$('advancedArea'); const cardsArea=document.querySelector('.cards'); if(advArea&&cardsArea) cardsArea.parentNode.insertBefore(advArea,cardsArea);
  document.body.classList.add('app-ready');
  const appEl=$('app'), advEl=$('advancedArea');
  if(appEl && advEl && appEl.firstElementChild!==advEl) appEl.insertBefore(advEl, appEl.firstElementChild);
  const ws=document.querySelector('.workspace'); if(ws) ws.classList.add('tab-hidden');
  const requestedTab=new URLSearchParams(location.search).get('tab');
  showAdvancedTab(validAdvancedTabs.has(requestedTab)?requestedTab:advancedTab);
  initAdvanced();
  document.body.classList.remove('auth-pending');
}


/* =====================================================
   CARGAR PLANES
===================================================== */

async function loadPlans(){

  if(!couple)
    return;


  const {
    data,
    error
  } =
  await sb

    .from('plans')

    .select('*')

    .eq(
      'couple_id',
      couple.id
    )

    .order(
      'plan_date'
    );


  if(error){

    console.error(error);

    plans = [];

    render();

    return;

  }


  plans =
    data || [];


  render();

}


/* =====================================================
   SEGURIDAD HTML
===================================================== */

function escapeHtml(value){

  return String(
    value ?? ''
  )

  .replace(
    /&/g,
    '&amp;'
  )

  .replace(
    /</g,
    '&lt;'
  )

  .replace(
    />/g,
    '&gt;'
  )

  .replace(
    /"/g,
    '&quot;'
  )

  .replace(
    /'/g,
    '&#039;'
  );

}


/* =====================================================
   ICONO CATEGORIA
===================================================== */

function categoryIcon(category){

  if(category === 'viaje')
    return '✈️';

  if(category === 'paseo')
    return '🏍️';

  if(category === 'aniversario')
    return '💜';

  if(category === 'compras')
    return '🛍️';

  if(category === 'otro')
    return '⭐';

  return '♡';

}


/* =====================================================
   NOMBRE CATEGORIA
===================================================== */

function categoryName(category){

  const names = {

    cita:'Cita',

    paseo:'Paseo',

    viaje:'Viaje',

    aniversario:'Aniversario',

    compras:'Compras',

    otro:'Otro'

  };

  return names[category] ||
    'Cita';

}


/* =====================================================
   FORMATO FECHA
===================================================== */

function formatDate(date){

  if(!date)
    return '';

  return new Date(
    date +
    'T12:00:00'
  ).toLocaleDateString(

    'es-CO',

    {

      weekday:'long',

      day:'numeric',

      month:'long',

      year:'numeric'

    }

  );

}


/* =====================================================
   FORMATO HORA
===================================================== */

function formatTime(time){

  if(!time)
    return '';

  const parts =
    time.split(':');

  let hour =
    parseInt(parts[0],10);

  const minute =
    parts[1] || '00';

  const suffix =
    hour >= 12
    ? 'p. m.'
    : 'a. m.';

  hour =
    hour % 12 || 12;

  return (
    hour +
    ':' +
    minute +
    ' ' +
    suffix
  );

}


/* =====================================================
   FORMATO DINERO
===================================================== */

function formatMoney(value){

  if(
    value === null ||
    value === undefined ||
    value === ''
  )
    return '';

  return new Intl.NumberFormat(
    'es-CO',
    {
      style:'currency',
      currency:'COP',
      maximumFractionDigits:0
    }
  ).format(value);

}


/* =====================================================
   RENDER CALENDARIO
===================================================== */

function render(){

  $('month').textContent =

    months[
      view.getMonth()
    ] +

    ' ' +

    view.getFullYear();


  const y =
    view.getFullYear();

  const m =
    view.getMonth();


  const first =
    new Date(
      y,
      m,
      1
    );


  const start =
    (
      first.getDay()+6
    ) % 7;


  let html = '';


  for(
    let i=0;    i<42;
    i++
  ){

    const d =
      new Date(
        y,
        m,
        i-start+1
      );


    const k =
      iso(d);


    const events = getCalendarEventsForRange(k,k);


    html += `

      <div
        class="day
        ${
          d.getMonth() !== m
          ? 'muted'
          : ''
        }
        ${
          k === iso(new Date())
          ? 'today'
          : ''
        }"

        onclick="handleDayClick('${k}')"
      >

        <b>
          ${d.getDate()}
        </b>

        ${
          events
            .map(
              ev =>

              `<div
                class="event ${ev.source!=='plan'?'advanced-event':''}"
                onclick="event.stopPropagation();openCalendarEvent('${ev.source}','${ev.id}')"
                title="${escapeHtml(ev.title)}"
                role="button"
                tabindex="0"
              >
                ${escapeHtml(ev.icon || '♡')} ${escapeHtml(ev.title)}
              </div>`
            )
            .join('')
        }

      </div>

    `;

  }


  $('grid').innerHTML =    html;


  renderNextPlan();

}


/* =====================================================
   CLICK DIA
===================================================== */

function handleDayClick(date){
  // El cuerpo del día siempre abre el formulario de plan normal.
  // Los eventos avanzados se abren únicamente al pulsar su propio bloque/icono.
  openModal(date);
}


/* =====================================================
   PROXIMO PLAN
===================================================== */

function renderNextPlan(){
  const next=getNextUpcomingPlan();
  if(next){
    $('next').innerHTML=`<div class="nextTop">${categoryIcon(next.category)}</div><div class="nextBody"><div class="nextDate">${escapeHtml(formatDate(next._occurrenceDate))}${next.plan_time?' · '+escapeHtml(formatTime(next.plan_time)):''}</div><b>${escapeHtml(next.title)}</b><div>${escapeHtml(next.note||'Un nuevo recuerdo para los dos.')}</div>${next.recurrence_enabled?'<span class="seriesBadge">🔁 Recurrente</span>':''}</div>`;
    $('next').onclick=()=>openPlanDetail(next.id);
  }else{
    $('next').innerHTML=`<div class="nextTop">♡</div><div class="nextBody">Todavía no hay planes futuros.<br>Agreguen el primero ❤️</div>`;
    $('next').onclick=()=>openModal();
  }
}

/* =====================================================
   OCURRENCIAS DE PLANES RECURRENTES
===================================================== */
function dateKeyLocal(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function parseDateOnly(s){return new Date(s+'T00:00:00');}
function addDaysDate(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
function addMonthsSafe(d,n){const day=d.getDate();const x=new Date(d.getFullYear(),d.getMonth()+n,1);const max=new Date(x.getFullYear(),x.getMonth()+1,0).getDate();x.setDate(Math.min(day,max));return x;}
function occurrenceAllowed(plan,d){return !plan.recurrence_end_date || dateKeyLocal(d)<=plan.recurrence_end_date;}
function getPlanOccurrencesForRange(startKey,endKey){
 const start=parseDateOnly(startKey),end=parseDateOnly(endKey),out=[];
 for(const plan of plans){
  const base=parseDateOnly(plan.plan_date);
  if(!plan.recurrence_enabled||!plan.recurrence_type||plan.recurrence_type==='none'){if(plan.plan_date>=startKey&&plan.plan_date<=endKey)out.push({...plan,_occurrenceDate:plan.plan_date});continue;}
  const limit=plan.recurrence_end_date?parseDateOnly(plan.recurrence_end_date):end,maxEnd=limit<end?limit:end;
  if(maxEnd<start||maxEnd<base)continue;
  const interval=Math.max(1,Number(plan.recurrence_interval||1));
  if(plan.recurrence_type==='daily'){
    for(let d=new Date(base);d<=maxEnd;d=addDaysDate(d,interval))if(d>=start&&occurrenceAllowed(plan,d))out.push({...plan,_occurrenceDate:dateKeyLocal(d)});
  }else if(plan.recurrence_type==='weekly'){
    const days=(Array.isArray(plan.recurrence_days)&&plan.recurrence_days.length?plan.recurrence_days:[((base.getDay()+6)%7)+1]).map(Number);
    for(let d=new Date(base);d<=maxEnd;d=addDaysDate(d,1)){if(d<start)continue;const weeks=Math.floor((d-base)/604800000),dow=((d.getDay()+6)%7)+1;if(weeks>=0&&weeks%interval===0&&days.includes(dow)&&occurrenceAllowed(plan,d))out.push({...plan,_occurrenceDate:dateKeyLocal(d)});}
  }else if(plan.recurrence_type==='monthly'){
    let monthsDiff=Math.max(0,(start.getFullYear()-base.getFullYear())*12+start.getMonth()-base.getMonth());
    let d=addMonthsSafe(base,Math.floor(monthsDiff/interval)*interval);if(d<start)d=addMonthsSafe(d,interval);
    for(;d<=maxEnd;d=addMonthsSafe(d,interval)){const months=(d.getFullYear()-base.getFullYear())*12+d.getMonth()-base.getMonth();if(months>=0&&months%interval===0&&d>=base&&occurrenceAllowed(plan,d))out.push({...plan,_occurrenceDate:dateKeyLocal(d)});}
  }else if(plan.recurrence_type==='yearly'){
    const startYear=Math.max(base.getFullYear(),start.getFullYear());let y=startYear;while((y-base.getFullYear())%interval!==0)y++;
    for(;y<=maxEnd.getFullYear();y+=interval){const d=new Date(y,base.getMonth(),base.getDate());if(d>=start&&d<=maxEnd&&d>=base&&occurrenceAllowed(plan,d))out.push({...plan,_occurrenceDate:dateKeyLocal(d)});}
  }
 }
 return out.sort((a,b)=>(a._occurrenceDate+' '+(a.plan_time||'')).localeCompare(b._occurrenceDate+' '+(b.plan_time||'')));
}
function getUpcomingPlanOccurrences(daysAhead=730){
 const start=new Date(),end=addDaysDate(start,daysAhead),todayKey=dateKeyLocal(start),arr=getPlanOccurrencesForRange(todayKey,dateKeyLocal(end)),now=new Date();
 return arr.filter(x=>{const d=parseDateOnly(x._occurrenceDate);if(x._occurrenceDate===todayKey&&x.plan_time){const [h,m]=x.plan_time.split(':').map(Number);d.setHours(h,m||0,0,0);}return d>=now;});
}
function getNextUpcomingPlan(){return getUpcomingPlanOccurrences(730).find(x=>!x.completed)||null;}

/* =====================================================
   EVENTOS AVANZADOS EN EL CALENDARIO PRINCIPAL
===================================================== */
function getImportantDateOccurrencesForRange(startKey,endKey){
  const start=parseDateOnly(startKey),end=parseDateOnly(endKey),out=[];
  for(const item of (advCache.dates||[])){
    if(!item.event_date) continue;
    const base=parseDateOnly(item.event_date);
    const type=item.recurrence_type || (item.recurring?'yearly':'none');
    const interval=Math.max(1,Number(item.recurrence_interval||1));
    if(type==='none'){
      if(item.event_date>=startKey&&item.event_date<=endKey) out.push({source:'date',id:item.id,date:item.event_date,title:item.title,icon:'📅',category:item.category});
    }else if(type==='monthly'){
      let months=(start.getFullYear()-base.getFullYear())*12+start.getMonth()-base.getMonth();
      let d=addMonthsSafe(base,Math.max(0,Math.floor(months/interval)*interval));
      if(d<start)d=addMonthsSafe(d,interval);
      for(;d<=end;d=addMonthsSafe(d,interval)){if(d>=base)out.push({source:'date',id:item.id,date:dateKeyLocal(d),title:item.title,icon:'📅',category:item.category});}
    }else if(type==='yearly'){
      let y=Math.max(base.getFullYear(),start.getFullYear());
      while((y-base.getFullYear())%interval!==0)y++;
      for(;y<=end.getFullYear();y+=interval){const d=new Date(y,base.getMonth(),base.getDate());if(d>=start&&d<=end&&d>=base)out.push({source:'date',id:item.id,date:dateKeyLocal(d),title:item.title,icon:'📅',category:item.category});}
    }
  }
  return out;
}
function getAdvancedCalendarEventsForRange(startKey,endKey){
  const out=getImportantDateOccurrencesForRange(startKey,endKey);
  const add=(source,id,date,title,icon,category)=>{if(date&&date>=startKey&&date<=endKey)out.push({source,id,date,title,icon,category});};
  for(const x of (advCache.memories||[]))add('memory',x.id,x.memory_date,x.title,'📸',x.category);
  for(const x of (advCache.dreams||[]))add('dream',x.id,x.target_date,x.title,'✨',x.category);
  for(const x of (advCache.challenges||[])){add('challenge',x.id,x.start_date,x.title,'🎯',x.category);if(x.end_date&&x.end_date!==x.start_date)add('challenge',x.id+'-end',x.end_date,x.title+' · Fin','🏁',x.category);}
  for(const x of (advCache.goals||[]))add('goal',x.id,x.target_date,x.title,'💰',x.category);
  for(const x of (advCache.places||[]))add('place',x.id,x.visit_date,x.name,'📍',x.category);
  for(const x of (advCache.letters||[])){if(x.unlock_at){const d=new Date(x.unlock_at);if(!Number.isNaN(d.getTime()))add('letter',x.id,dateKeyLocal(d),x.title,'💌',x.category);}}
  return out;
}
function getCalendarEventsForRange(startKey,endKey){
  const plansForRange=getPlanOccurrencesForRange(startKey,endKey).map(p=>({source:'plan',id:p.id,date:p._occurrenceDate,title:p.title,icon:categoryIcon(p.category),category:p.category,time:p.plan_time,completed:p.completed}));
  return [...plansForRange,...getAdvancedCalendarEventsForRange(startKey,endKey)].sort((a,b)=>(a.date+' '+(a.time||'')+' '+a.title).localeCompare(b.date+' '+(b.time||'')+' '+b.title));
}
function openCalendarEvent(source,id){
  if(source==='plan'){openPlanDetail(id);return;}
  const tabMap={date:'dates',memory:'memories',letter:'letters',dream:'dreams',challenge:'challenges',goal:'goals',place:'places'};
  const tab=tabMap[source];
  if(tab){showAdvancedTab(tab);setTimeout(()=>{const el=document.querySelector('[data-advanced-id="'+id+'"]');if(el){el.classList.add('item-highlight');el.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>el.classList.remove('item-highlight'),1800);}},180);}
}

/* =====================================================
   CAMBIAR MES
===================================================== */

function move(n){

  view.setMonth(
    view.getMonth()+n
  );

  render();

}


function today(){

  view =
    new Date();

  render();

}


/* =====================================================
   ABRIR MODAL AGREGAR
===================================================== */

function openModal(d){

  $('modalTitle').textContent =
    'Agregar un plan ♡';


  $('modal').classList.remove('is-closing');
  $('modal').style.display = 'grid';


  $('date').value =
    d ||
    iso(view);


  $('title').value =
    '';

  $('time').value =
    '';

  $('cat').value =
    'cita';

  $('location').value =
    '';

  $('budget').value =
    '';

  $('noteInput').value =
    '';

  $('completed').value =
    'false';

  resetRecurrenceFields(d || iso(view));

  $('modal')
    .dataset
    .editingId =
    '';


  setTimeout(
    () =>
      $('title').focus(),
    50
  );

}


/* =====================================================
   ABRIR EDITAR
===================================================== */

function openEditModal(plan){

  $('modalTitle').textContent =
    'Editar plan ✏️';


  $('modal').style.display =
    'grid';


  $('date').value =
    plan.plan_date || '';


  $('title').value =
    plan.title || '';


  $('time').value =
    plan.plan_time
    ? plan.plan_time.slice(0,5)
    : '';


  $('cat').value =
    plan.category || 'cita';


  $('location').value =
    plan.location || '';


  $('budget').value =
    plan.budget ?? '';


  $('noteInput').value =
    plan.note || '';


  $('completed').value =
    plan.completed
    ? 'true'
    : 'false';

  setRecurrenceFields(plan);

  $('modal')
    .dataset
    .editingId =
    plan.id;


  setTimeout(
    () =>
      $('title').focus(),
    50
  );

}


/* =====================================================
   CERRAR MODAL
===================================================== */

function closeModal(){
  const modal=$('modal');
  modal.classList.add('is-closing');
  window.setTimeout(()=>{if(modal.classList.contains('is-closing')){modal.style.display='none';modal.classList.remove('is-closing');}},210);
}


/* =====================================================
   GUARDAR PLAN
===================================================== */

function syncRecurrenceUI(){const enabled=$('recurrenceEnabled')?.checked;const opts=$('recurrenceOptions');if(opts)opts.classList.toggle('hidden',!enabled);const type=$('recurrenceType')?.value;const weekly=$('weeklyDaysBox');if(weekly)weekly.classList.toggle('hidden',!enabled||type!=='weekly');}
function defaultRecurrenceDay(date){const d=parseDateOnly(date||iso(new Date()));return ((d.getDay()+6)%7)+1;}
function resetRecurrenceFields(date){if(!$('recurrenceEnabled'))return;$('recurrenceEnabled').checked=false;$('recurrenceType').value='weekly';$('recurrenceInterval').value='1';$('recurrenceEndDate').value='';document.querySelectorAll('input[name="recurrenceDay"]').forEach(x=>x.checked=Number(x.value)===defaultRecurrenceDay(date));syncRecurrenceUI();}
function setRecurrenceFields(plan){if(!$('recurrenceEnabled'))return;const enabled=!!plan.recurrence_enabled;$('recurrenceEnabled').checked=enabled;$('recurrenceType').value=plan.recurrence_type&&plan.recurrence_type!=='none'?plan.recurrence_type:'weekly';$('recurrenceInterval').value=plan.recurrence_interval||1;$('recurrenceEndDate').value=plan.recurrence_end_date||'';const days=Array.isArray(plan.recurrence_days)&&plan.recurrence_days.length?plan.recurrence_days:[defaultRecurrenceDay(plan.plan_date)];document.querySelectorAll('input[name="recurrenceDay"]').forEach(x=>x.checked=days.includes(Number(x.value)));syncRecurrenceUI();}
$('recurrenceEnabled')?.addEventListener('change',syncRecurrenceUI);$('recurrenceType')?.addEventListener('change',syncRecurrenceUI);

async function savePlan(){

  if(
    !couple ||
    !user
  ){

    appAlert(
      'Tu sesión no está lista.'
    );

    return;

  }


  const title =
    $('title')
      .value
      .trim();


  if(!title){

    appAlert(
      'Escribe un nombre para el plan ❤️'
    );

    return;

  }


  const editingId =
    $('modal')
      .dataset
      .editingId;


  const planData = {

    title:
      title,

    plan_date:
      $('date').value,

    plan_time:
      $('time').value ||
      null,

    category:
      $('cat').value,

    location: window.selectedPlaceById?.($('planPlaceId')?.value)?.name || null,
    place_id: $('planPlaceId')?.value || null,

    note:
      $('noteInput')
        .value
        .trim() ||
      null,

    budget:
      $('budget').value
      ? Number(
          $('budget').value
        )
      : null,

    completed:
      $('completed').value ===
      'true',

    recurrence_enabled: $('recurrenceEnabled').checked,
    recurrence_type: $('recurrenceEnabled').checked ? $('recurrenceType').value : 'none',
    recurrence_interval: $('recurrenceEnabled').checked ? Math.max(1, Number($('recurrenceInterval').value || 1)) : 1,
    recurrence_days: $('recurrenceEnabled').checked && $('recurrenceType').value==='weekly' ? Array.from(document.querySelectorAll('input[name="recurrenceDay"]:checked')).map(x=>Number(x.value)) : null,
    recurrence_end_date: $('recurrenceEnabled').checked ? ($('recurrenceEndDate').value || null) : null

  };


  let error;
  let createdPlanId=null;


  if(editingId){

    const result =
      await sb

        .from('plans')

        .update(
          planData
        )

        .eq(
          'id',
          editingId
        )

        .eq(
          'couple_id',
          couple.id
        );


    error =
      result.error;


  }else{

    const result =
      await sb
        .from('plans')
        .insert({couple_id:couple.id,...planData,created_by:user.id})
        .select('id')
        .single();
    error=result.error;
    if(!error)createdPlanId=result.data?.id;

  }


  if(error){

    console.error(error);

    appAlert(
      'No pudimos guardar el plan: ' +
      error.message
    );

    return;

  }


  closeModal();
  await loadPlans();
  if(!editingId&&createdPlanId){
    const planOwnerName=myProfile?.display_name||coupleProfiles.find(p=>p.user_id===user.id)?.display_name||'Tu pareja';    await createPartnerNotification({event_type:'plan_created',title:'Nuevo plan en el calendario ❤️',body:planOwnerName+' agregó «'+title+'» para el '+formatDate(planData.plan_date)+'.',target_tab:'calendar',target_id:createdPlanId});
  }

}


/* =====================================================
   MODAL LISTA DE PLANES
===================================================== */

function openPlansModal(date){

  currentDay =
    date;


  const dayPlans = getCalendarEventsForRange(date,date);


  $('plansModalDate').textContent =
    formatDate(date);


  $('plansList').innerHTML =

    dayPlans
      .map(
        ev => `
          <button class="planOption" onclick="openCalendarEvent('${ev.source}','${ev.id}')">
            <div class="planOptionTitle">${escapeHtml(ev.icon || '♡')} ${escapeHtml(ev.title)}</div>
            <div class="planOptionMeta">${ev.source==='plan'?categoryName(ev.category):'Fecha especial'}${ev.time?' · '+escapeHtml(formatTime(ev.time)):''}${ev.completed?' · ✓ Completado':''}</div>
          </button>
        `
      )
      .join('');


  $('addFromDayBtn').onclick =
    () => {

      closePlansModal();

      openModal(
        currentDay
      );

    };


  $('plansModal').style.display =
    'grid';

}


/* =====================================================
   CERRAR LISTA
===================================================== */

function closePlansModal(){

  $('plansModal').style.display =
    'none';

}

/* =====================================================
   ABRIR DETALLE
===================================================== */

function openPlanDetail(id){

  const plan =
    plans.find(
      p =>
      p.id === id
    );


  if(!plan)
    return;


  currentPlan =
    plan;


  closePlansModal();


  $('detailIcon').textContent =
    categoryIcon(
      plan.category
    );


  $('detailTitle').textContent =
    plan.title;


  $('detailDate').textContent =
    formatDate(
      plan.plan_date
    );


  $('detailCompleted').innerHTML =
    plan.completed
    ? '<span class="completedBadge">✓ Plan completado ❤️</span>'
    : '';


  let rows = '';
  if(plan.recurrence_enabled){const typeNames={daily:'día(s)',weekly:'semana(s)',monthly:'mes(es)',yearly:'año(s)'};rows+=`<div class="detailRow"><div class="detailEmoji">🔁</div><div class="detailContent"><div class="detailLabel">Repetición</div><div class="detailValue">Cada ${plan.recurrence_interval||1} ${typeNames[plan.recurrence_type]||'periodo'}${plan.recurrence_end_date?' · hasta '+formatDate(plan.recurrence_end_date):''}</div></div></div>`;}


  rows += `

    <div class="detailRow">

      <div class="detailEmoji">
        🏷️
      </div>

      <div class="detailContent">

        <div class="detailLabel">
          Categoría
        </div>

        <div class="detailValue">
          ${escapeHtml(
            categoryName(
              plan.category
            )
          )}
        </div>

      </div>

    </div>

  `;


  if(plan.plan_time){

    rows += `

      <div class="detailRow">

        <div class="detailEmoji">
          🕐
        </div>

        <div class="detailContent">

          <div class="detailLabel">
            Hora
          </div>

          <div class="detailValue">
            ${escapeHtml(
              formatTime(
                plan.plan_time
              )
            )}
          </div>

        </div>

      </div>

    `;

  }


  if(plan.location){

    rows += `

      <div class="detailRow">

        <div class="detailEmoji">
          📍
        </div>

        <div class="detailContent">

          <div class="detailLabel">
            Lugar
          </div>

          <div class="detailValue">
            ${plan.place_id&&window.selectedPlaceById&&window.selectedPlaceById(plan.place_id)?window.placeLinkHtml(plan.place_id,window.selectedPlaceById(plan.place_id).name):escapeHtml(plan.location)}
          </div>

        </div>

      </div>

    `;

  }


  if(plan.budget !== null &&
     plan.budget !== undefined){

    rows += `

      <div class="detailRow">

        <div class="detailEmoji">
          💰
        </div>

        <div class="detailContent">

          <div class="detailLabel">
            Presupuesto
          </div>

          <div class="detailValue">
            ${escapeHtml(
              formatMoney(
                plan.budget
              )
            )}
          </div>

        </div>

      </div>

    `;

  }


  if(plan.note){

    rows += `

      <div class="detailRow">

        <div class="detailEmoji">
          💌
        </div>

        <div class="detailContent">

          <div class="detailLabel">
            Nota
          </div>

          <div class="detailValue">
            ${escapeHtml(
              plan.note
            )}
          </div>

        </div>

      </div>

    `;

  }


  $('detailRows').innerHTML =
    rows;


  $('detailModal').style.display =
    'grid';

}


/* =====================================================
   CERRAR DETALLE
===================================================== */

function closeDetailModal(){

  $('detailModal').style.display =
    'none';

  currentPlan =
    null;

}


/* =====================================================
   EDITAR PLAN
===================================================== */

function editCurrentPlan(){

  if(!currentPlan)
    return;


  const plan =
    currentPlan;


  closeDetailModal();

  openEditModal(
    plan
  );

}


/* =====================================================
   ELIMINAR PLAN
===================================================== */

async function deleteCurrentPlan(){

  if(!currentPlan)
    return;


  const confirmed = await appConfirm(

      '¿Seguro que quieres eliminar "' +
      currentPlan.title +
      '"? ❤️'

    );


  if(!confirmed)
    return;


  const {
    error
  } =
  await sb

    .from('plans')

    .delete()

    .eq(
      'id',
      currentPlan.id
    )

    .eq(
      'couple_id',
      couple.id
    );


  if(error){

    console.error(error);

    appAlert(
      'No pudimos eliminar el plan: ' +
      error.message
    );

    return;

  }


  closeDetailModal();

  await loadPlans();

}


/* =====================================================
   CERRAR SESION
===================================================== */

async function logout(){
  // Cerrar cualquier modal/panel antes de cerrar la sesión para que
  // nunca quede un cuadro flotante sobre la pantalla de inicio de sesión.
  closeProfilePanel();
  closeAdvModal();
  closeModal();
  closePlansModal();
  closeDetailModal();

  document.querySelectorAll('.modal.show').forEach(m=>m.classList.remove('show'));

  if(sb){
    await sb.auth.signOut();
  }
}


/* =====================================================
   BOTONES
===================================================== */

$('loginBtn')
  .addEventListener(
    'click',
    login
  );


$('registerBtn')
  .addEventListener(
    'click',
    register
  );


$('forgotBtn')
  .addEventListener(
    'click',
    forgotPassword
  );


$('password')
  .addEventListener(

    'keydown',

    event => {

      if(
        event.key === 'Enter'
      ){

        login();

      }

    }

  );


/* =====================================================
   CERRAR MODALES AL TOCAR FONDO
===================================================== */

$('modal')
  .addEventListener(
    'click',
    event => {

      if(
        event.target ===
        $('modal')
      ){

        closeModal();

      }

    }
  );


$('plansModal')
  .addEventListener(
    'click',
    event => {

      if(
        event.target ===
        $('plansModal')
      ){

        closePlansModal();

      }

    }
  );


$('detailModal')
  .addEventListener(
    'click',
    event => {

      if(
        event.target ===
        $('detailModal')
      ){
        closeDetailModal();

      }

    }
  );



/* =====================================================
   MOTOR AVANZADO — NUESTRO CALENDARIO #21
===================================================== */
let advancedTab=(function(){try{return localStorage.getItem('nc21_last_tab')||'home';}catch(e){return 'home';}})();
let suppressTabAnimation=false;
let animateNextModuleRender=false;
const validAdvancedTabs=new Set(['home','calendar','story','memories','letters','dreams','challenges','ideas','dates','goals','budget','notifications','question','places','achievements','private','settings']);
if(!validAdvancedTabs.has(advancedTab))advancedTab='home';
let advCache={memories:[],letters:[],dreams:[],challenges:[],dates:[],goals:[],places:[],ideas:[],privateNotes:[],expenses:[],recurring:[],notifications:[],dailyAnswers:[]};
let budgetSelectedMonth=new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0');
const advTables={memories:'memories',letters:'love_letters',dreams:'dreams',challenges:'challenges',dates:'important_dates',goals:'goals',places:'places',ideas:'activity_ideas',privateNotes:'private_notes',expenses:'shared_expenses',recurring:'budget_recurring_templates',notifications:'notifications',dailyAnswers:'daily_answers'};
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function money(v){return v==null||v===''?'—':new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(v));}
function dateES(v){if(!v)return 'Sin fecha'; const d=new Date(v+'T00:00:00'); return d.toLocaleDateString('es-CO',{day:'numeric',month:'long',year:'numeric'});}
function showAdvancedTab(tab,options={}){
 if(!validAdvancedTabs.has(tab))tab='home';
 const area=$('advancedArea'),content=$('advancedContent'),workspace=document.querySelector('.workspace'),hero=document.querySelector('.hero'),cards=document.querySelector('.cards');
 const previousTab=advancedTab;
 advancedTab=tab;
 animateNextModuleRender=previousTab!==tab&&!suppressTabAnimation&&!document.body.classList.contains('nc-resume-no-flash');
 try{localStorage.setItem('nc21_last_tab',tab);}catch(e){}
 document.querySelectorAll('.advTab').forEach(b=>b.classList.toggle('active',b.getAttribute('onclick')?.includes("'"+tab+"'")));
  const activeNavButton=Array.from(document.querySelectorAll('.advTab')).find(b=>b.getAttribute('onclick')?.includes("'"+tab+"'"));
  if(activeNavButton){const nav=$('advancedNav');if(nav&&window.matchMedia('(max-width: 800px)').matches){const targetLeft=activeNavButton.offsetLeft-nav.offsetLeft-(nav.clientWidth-activeNavButton.clientWidth)/2;nav.scrollTo({left:Math.max(0,targetLeft),behavior:options.skipScroll?'auto':'smooth'});}}
  const notificationBell=$('notificationsTab');if(notificationBell)notificationBell.classList.toggle('active',tab==='notifications');
 if(tab==='calendar'){
   area.classList.add('calendar-mode'); content.innerHTML='';
   if(workspace)workspace.classList.remove('tab-hidden','appTabHidden');
   if(hero)hero.classList.add('appTabHidden');
   if(cards)cards.classList.add('appTabHidden');
   if(!options.skipScroll)setTimeout(()=>workspace?.scrollIntoView({behavior:'smooth',block:'start'}),40);
 }else{
   area.classList.remove('calendar-mode');
   if(workspace)workspace.classList.add('tab-hidden');
   if(hero)hero.classList.add('appTabHidden');
   if(cards)cards.classList.add('appTabHidden');
   renderAdvanced();
   if(!options.skipScroll)setTimeout(()=>area?.scrollIntoView({behavior:'smooth',block:'start'}),40);
 }
}
function advHeader(title,sub,button,action){return `<div class="advHero"><div style="display:flex;justify-content:space-between;gap:18px;align-items:center;flex-wrap:wrap"><div><div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#a16a7d;font-weight:800">Nuestro espacio</div><h2 style="font:700 32px Georgia,serif;color:#653449;margin:5px 0">${title}</h2><p style="margin:0;color:#806572">${sub}</p></div>${button?`<button class="btn primary" onclick="${action}">${button}</button>`:''}</div></div>`}
function renderAdvanced(){const c=$('advancedContent');if(!c)return; const shouldAnimate=animateNextModuleRender;animateNextModuleRender=false;const map={home:renderAdvHome,story:renderAdvStory,memories:renderAdvMemories,letters:renderAdvLetters,dreams:renderAdvDreams,challenges:renderAdvChallenges,ideas:renderAdvIdeas,dates:renderAdvDates,goals:renderAdvGoals,budget:renderAdvBudget,notifications:renderAdvNotifications,question:renderAdvQuestion,places:renderAdvPlaces,achievements:renderAdvAchievements,private:renderAdvPrivate,settings:renderAdvSettings}; c.classList.remove('tab-enter','tab-leave');c.innerHTML=(map[advancedTab]||renderAdvHome)();if(shouldAnimate){void c.offsetWidth;c.classList.add('tab-enter');window.setTimeout(()=>c.classList.remove('tab-enter'),760);} updateNotificationBadge(); if(advancedTab==='home') setTimeout(()=>applyHomePhoto(),0);}
function cachedHomePhotoUrl(){
  const path=coupleSettings.home_photo_path;
  if(!path)return null;
  try{
    const cached=JSON.parse(localStorage.getItem('nc21_signed_photo_'+encodeURIComponent(path))||'null');
    if(cached?.url&&cached.expiresAt>Date.now()+10*60*1000)return cached.url;
  }catch(_){}
  return null;
}
function renderAdvHome(){
 const p=plans.length,m=advCache.memories.length,d=advCache.dreams.filter(x=>x.status==='cumplido').length,g=advCache.goals.length,ch=advCache.challenges.filter(x=>x.completed).length;
 const next=getNextUpcomingPlan();
 const together=Math.max(0,Math.floor((Date.now()-new Date('2026-01-21T00:00:00'))/86400000));
 const dating=Math.max(0,Math.floor((Date.now()-new Date('2026-04-21T00:00:00'))/86400000));
 return `<div class="homeIntro"><div class="homeWelcome" style="position:relative;overflow:hidden"><img data-home-photo src="${esc(cachedHomePhotoUrl()||'pareja.jpeg')}" alt="Nuestra foto" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:1;z-index:0"><div style="position:relative;z-index:1"><div class="homeWelcomeContent"><div class="homePill">❤️ Nuestro Calendario #21 · Ana María & Nicolás</div><h2>Este es nuestro lugar.<br>Esta es nuestra historia.</h2><p>Un pequeño rincón solo para nosotros: nuestros planes, recuerdos, sueños, cartas y todo lo que todavía nos falta vivir.</p><div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:18px"><button class="btn primary" onclick="showAdvancedTab('calendar')">🗓️ Entrar al calendario</button><button class="btn" style="background:rgba(255,255,255,.92)" onclick="openQuickCreate()">✨ Crear algo especial</button></div></div></div></div></div><div class="homeStats"><div class="homeStat"><strong>${together}</strong><span>días juntos ❤️</span></div><div class="homeStat"><strong>${dating}</strong><span>días de novios 💍</span></div><div class="homeStat"><strong>${p}</strong><span>planes guardados 🗓️</span></div><div class="homeStat"><strong>${m}</strong><span>recuerdos 📸</span></div></div><div class="homeNext"><div class="homeNextIcon">${next?categoryIcon(next.category):'♡'}</div><div style="flex:1"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#a16a7d;font-weight:900">Próximo capítulo</div><div class="homeNextTitle">${next?esc(next.title):'Todavía no hay un próximo plan'}</div><div class="homeNextMeta">${next?dateES(next._occurrenceDate)+(next.plan_time?' · '+formatTime(next.plan_time):''):'Creen uno y hagan que aparezca aquí ❤️'}</div>${next&&next.recurrence_enabled?'<span class="seriesBadge">🔁 Plan recurrente</span>':''}</div>${next?'<button class="btn" data-next-id="'+next.id+'" onclick="openPlanDetail(this.dataset.nextId)">Abrir</button>':''}</div>${dailyQuestionHomeCard()}<div class="advGrid"><div class="advCard"><h3>✨ Sueños cumplidos</h3><div class="advMetric">${d}</div><p>De ideas bonitas a cosas que realmente vivieron.</p></div><div class="advCard"><h3>💌 Cartas</h3><div class="advMetric">${advCache.letters.length}</div><p>Palabras para leer hoy o guardar para el futuro.</p></div><div class="advCard"><h3>🎯 Retos</h3><div class="advMetric">${ch}</div><p>Pequeños desafíos para hacer juntos.</p></div><div class="advCard"><h3>💰 Metas</h3><div class="advMetric">${g}</div><p>Lo que están construyendo paso a paso.</p></div></div>`;
}

function renderAdvStory(){
 const arr=advCache.memories.map(x=>({...x,date:x.memory_date,category:x.category,memory:true})).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
 return advHeader('Nuestra historia','Una línea de tiempo visual de los recuerdos que ustedes decidan guardar.','📸 Añadir recuerdo','openMemoryForm()')+`<div class="advList storyTimeline">${arr.length?arr.map(x=>`<div class="advItem storyMemoryItem" role="button" tabindex="0" onclick="openCalendarEvent('memory','${x.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openCalendarEvent('memory','${x.id}')}"><div class="storyThumbWrap">${x.photo_url?`<img class="storyThumb" src="${esc(x.photo_url)}" alt="Foto de ${esc(x.title)}" loading="lazy">`:'<div class="storyThumb storyNoPhoto">📸<span>Sin foto</span></div>'}</div><div class="storyMemoryText"><div class="advItemTitle">${x.favorite?'❤️ ':''}${esc(x.title)}</div><div class="advMeta">${dateES(x.date)} · ${esc(x.category||'momento')}</div><p>${esc(x.description||'')}</p><span class="storyOpenHint">Ver en Recuerdos ↗</span></div></div>`).join(''):'<div class="advEmpty">❤️ Aquí aparecerán los recuerdos que ustedes creen manualmente en Recuerdos.</div>'}</div>`;
}
function renderAdvMemories(){return advHeader('Nuestros recuerdos','Fotos, historias y pequeños momentos que merecen quedarse. Pulsa una foto para verla más grande.','📸 Nuevo recuerdo','openMemoryForm()')+`<div class="advList">${advCache.memories.length?advCache.memories.map(x=>`<div class="advItem" data-advanced-id="${x.id}"><div>${x.photo_url?`<img class="advPhoto" src="${esc(x.photo_url)}" alt="Foto de ${esc(x.title)}" role="button" tabindex="0" title="Pulsa para ampliar" onclick="openMemoryPhoto(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openMemoryPhoto(this)}" style="cursor:zoom-in">`:''}<div class="advItemTitle">${x.favorite?'❤️ ':''}${esc(x.title)}</div><div class="advMeta">${dateES(x.memory_date)} · ${esc(x.category)}${x.place_id&&advCache.places.find(p=>p.id===x.place_id)?' · 📍 '+placeLinkHtml(x.place_id,advCache.places.find(p=>p.id===x.place_id).name):(x.location?' · 📍 '+esc(x.location):'')}</div><p>${esc(x.description||'')}</p></div><div class="advActions"><button class="btn" onclick="toggleFavorite('memories','${x.id}',${!x.favorite})">${x.favorite?'💔 Quitar favorito':'❤️ Favorito'}</button><button class="btn" onclick="openAdvancedEdit('memories','${x.id}')">✏️ Editar</button><button class="btn danger" onclick="deleteAdvanced('memories','${x.id}')">🗑️</button></div></div>`).join(''):`<div class="advEmpty">📸 Todavía no hay recuerdos. El primero puede ser uno muy especial.</div>`}</div>`;}
function openMemoryPhoto(img){
 if(!img||!img.src)return;
 let overlay=document.getElementById('memoryPhotoLightbox');
 if(!overlay){  overlay=document.createElement('div');overlay.id='memoryPhotoLightbox';overlay.className='memoryLightbox';
  overlay.innerHTML='<button type="button" class="memoryLightboxClose" aria-label="Cerrar imagen" title="Cerrar">×</button><img class="memoryLightboxImage" alt=""><div class="memoryLightboxCaption"></div>';
  overlay.addEventListener('click',e=>{if(e.target===overlay||e.target.classList.contains('memoryLightboxClose'))closeMemoryPhoto();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMemoryPhoto();});
  document.body.appendChild(overlay);
 }
 overlay.querySelector('.memoryLightboxImage').src=img.src;
 overlay.querySelector('.memoryLightboxImage').alt=img.alt||'Recuerdo ampliado';
 overlay.querySelector('.memoryLightboxCaption').textContent=img.alt||'Nuestro recuerdo ❤️';
 overlay.classList.add('show');
 document.body.style.overflow='hidden';
}
function closeMemoryPhoto(){const overlay=document.getElementById('memoryPhotoLightbox');if(overlay)overlay.classList.remove('show');document.body.style.overflow='';}

function renderAdvLetters(){return advHeader('Cartas para nosotros','Escribe hoy algo que quizá quieras que el otro lea mañana.','💌 Nueva carta','openLetterForm()')+`<div class="advList">${advCache.letters.length?advCache.letters.map(x=>{const scheduled=x.unlock_at&&new Date(x.unlock_at)>new Date();const locked=!!x.is_locked;return `<div class="advItem letterItem" data-advanced-id="${x.id}"><div class="letterContent"><div class="advItemTitle">${locked?'🔒 ':scheduled?'🕒 ':'💌 '}${esc(x.title)}</div><div class="advMeta">${esc(x.category)}${x.place_id&&advCache.places.find(p=>p.id===x.place_id)?' · 📍 '+placeLinkHtml(x.place_id,advCache.places.find(p=>p.id===x.place_id).name):''} · ${scheduled?'Se desbloquea '+new Date(x.unlock_at).toLocaleString('es-CO'):'Disponible'} · ${locked?'Carta protegida':'Sin bloqueo'}</div><p>${scheduled?'Esta carta está guardada para el futuro. ❤️':esc(x.content)}</p></div><div class="advActions letterActions">${!scheduled&&x.opened_at?'✓ Leída':''}<button type="button" class="btn" onclick="openAdvancedEdit('letters','${x.id}')">✏️ Editar</button><button type="button" class="btn" onclick="toggleLetterLock('${x.id}')">${locked?'🔓 Desbloquear':'🔒 Bloquear'}</button><button type="button" class="btn danger" ${locked?'disabled title="Desbloquea la carta para poder eliminarla" aria-label="Eliminar carta bloqueada"':''} onclick="deleteAdvanced('letters','${x.id}')">🗑️ Eliminar</button></div></div>`}).join(''):`<div class="advEmpty">💌 Escriban su primera carta. Puede ser para hoy, para un aniversario o para un día difícil.</div>`}</div>`;}
function renderAdvDreams(){return advHeader('Nuestra lista de sueños','Todo lo que quieren vivir, conocer y conseguir juntos.','✨ Nuevo sueño','openDreamForm()')+`<div class="advList">${advCache.dreams.length?advCache.dreams.map(x=>`<div class="advItem" data-advanced-id="${x.id}"><div style="flex:1"><div class="advItemTitle">${x.status==='cumplido'?'✅ ':x.status==='planeando'?'🟡 ':'✨ '}${esc(x.title)}</div><div class="advMeta">${esc(x.category)}${x.target_date?' · '+dateES(x.target_date):''}${x.budget?' · '+money(x.budget):''}</div><p>${esc(x.description||'')}</p>${x.place_id&&advCache.places.find(p=>p.id===x.place_id)?`<div class="advMeta">📍 Lugar: ${placeLinkHtml(x.place_id,advCache.places.find(p=>p.id===x.place_id).name)}</div>`:''}</div><div class="advActions"><select class="btn" onchange="setDreamStatus('${x.id}',this.value)"><option value="pendiente" ${x.status==='pendiente'?'selected':''}>Pendiente</option><option value="planeando" ${x.status==='planeando'?'selected':''}>Planeando</option><option value="cumplido" ${x.status==='cumplido'?'selected':''}>Cumplido</option></select><button class="btn" onclick="openAdvancedEdit('dreams','${x.id}')">✏️ Editar</button><button class="btn danger" onclick="deleteAdvanced('dreams','${x.id}')">🗑️</button></div></div>`).join(''):`<div class="advEmpty">✨ ¿Qué quieren hacer algún día? Empiecen su lista.</div>`}</div>`;}
function renderAdvChallenges(){return advHeader('Retos de pareja','Pequeños desafíos para convertir días normales en recuerdos.','🎯 Nuevo reto','openChallengeForm()')+`<div class="advList">${advCache.challenges.length?advCache.challenges.map(x=>`<div class="advItem" data-advanced-id="${x.id}"><div><div class="advItemTitle">${x.completed?'🏆 ':'🎯 '}${esc(x.title)}</div><div class="advMeta">${x.start_date?dateES(x.start_date):''}${x.end_date?' → '+dateES(x.end_date):''} · ${x.points} puntos${x.place_id&&advCache.places.find(p=>p.id===x.place_id)?' · 📍 '+placeLinkHtml(x.place_id,advCache.places.find(p=>p.id===x.place_id).name):''}</div><p>${esc(x.description||'')}</p></div><div class="advActions"><button class="btn" onclick="toggleChallenge('${x.id}',${!x.completed})">${x.completed?'↩️ Reabrir':'✓ Completar'}</button><button class="btn" onclick="openAdvancedEdit('challenges','${x.id}')">✏️ Editar</button><button class="btn danger" onclick="deleteAdvanced('challenges','${x.id}')">🗑️</button></div></div>`).join(''):`<div class="advEmpty">🎯 Creen un reto para este mes: una cita diferente, una foto, cocinar juntos...</div>`}</div>`;}
function renderAdvIdeas(){return advHeader('¿Qué hacemos hoy?','Pulsen el botón y dejen que el azar elija una idea.','🎲 Sorpréndenos','randomIdea()')+`<div id="randomIdeaBox" class="advCard" style="margin-top:18px;text-align:center"><h3>🎲 ¿Qué hacemos hoy?</h3><p>La próxima actividad puede estar a un clic.</p></div><div class="advList">${advCache.ideas.length?advCache.ideas.map(x=>`<div class="advItem"><div><div class="advItemTitle">🎲 ${esc(x.title)}</div><div class="advMeta">${esc(x.category)}${x.estimated_budget?' · '+money(x.estimated_budget):''}${x.place_id&&advCache.places.find(p=>p.id===x.place_id)?' · 📍 '+placeLinkHtml(x.place_id,advCache.places.find(p=>p.id===x.place_id).name):''}</div><p>${esc(x.description||'')}</p></div><div class="advActions"><button class="btn" onclick="openAdvancedEdit('ideas','${x.id}')">✏️ Editar</button><button class="btn danger" onclick="deleteAdvanced('ideas','${x.id}')">🗑️</button></div></div>`).join(''):`<div class="advEmpty">Agreguen sus propias ideas para tener un botón de “sorpréndenos” realmente de ustedes.</div>`}</div>`;}
function renderAdvDates(){return advHeader('Fechas importantes','Aniversarios, cumpleaños y días que no quieren olvidar.','📅 Nueva fecha','openDateForm()')+`<div class="advList">${advCache.dates.length?advCache.dates.map(x=>`<div class="advItem" data-advanced-id="${x.id}"><div><div class="advItemTitle">📅 ${esc(x.title)}</div><div class="advMeta">${dateES(x.event_date)} · ${esc(x.category)}${x.place_id&&advCache.places.find(p=>p.id===x.place_id)?' · 📍 '+placeLinkHtml(x.place_id,advCache.places.find(p=>p.id===x.place_id).name):''}${x.recurrence_type==='monthly'?' · 🔁 Cada mes':x.recurrence_type==='yearly'||x.recurring?' · 🔁 Cada año':''}</div><p>${esc(x.description||'')}</p></div><div class="advActions"><button class="btn" onclick="openAdvancedEdit('dates','${x.id}')">✏️ Editar</button><button class="btn danger" onclick="deleteAdvanced('dates','${x.id}')">🗑️</button></div></div>`).join(''):`<div class="advEmpty">📅 Guarden aquí las fechas que hacen especial su historia.</div>`}</div>`;}
function renderAdvGoals(){return advHeader('Nuestras metas','Metas de ahorro, viajes, proyectos y cualquier cosa que quieran construir juntos.','💰 Nueva meta','openGoalForm()')+`<div class="advList">${advCache.goals.length?advCache.goals.map(x=>{const pct=x.target_amount?Math.min(100,Math.round(Number(x.current_amount||0)/Number(x.target_amount)*100)):0;return `<div class="advItem" data-advanced-id="${x.id}"><div style="flex:1"><div class="advItemTitle">${x.completed?'✅ ':'💰 '}${esc(x.title)}</div><div class="advMeta">${x.target_amount?money(x.current_amount)+' / '+money(x.target_amount):'Sin monto objetivo'}${x.target_date?' · '+dateES(x.target_date):''}</div>${x.target_amount?`<div class="progress"><span style="width:${pct}%"></span></div><div class="advMeta">${pct}% completado</div>`:''}<p>${esc(x.description||'')}</p>${x.place_id&&advCache.places.find(p=>p.id===x.place_id)?`<div class="advMeta">📍 Lugar: ${placeLinkHtml(x.place_id,advCache.places.find(p=>p.id===x.place_id).name)}</div>`:''}</div><div class="advActions"><button class="btn" onclick="advanceGoal('${x.id}','add')">＋ Aportar</button><button class="btn" onclick="advanceGoal('${x.id}','subtract')">− Retirar</button><button class="btn" onclick="toggleGoal('${x.id}',${!x.completed})">${x.completed?'↩️':'✓'}</button><button class="btn" onclick="openAdvancedEdit('goals','${x.id}')">✏️ Editar</button><button class="btn danger" onclick="deleteAdvanced('goals','${x.id}')">🗑️</button></div></div>`}).join(''):`<div class="advEmpty">💰 Pongan una meta en común y vean cómo crece.</div>`}</div>`;}
function renderAdvPlaces(){return advHeader('Nuestros lugares','Los puntos del mapa que guardan una historia.','📍 Nuevo lugar','openPlaceForm()')+`<div class="advList">${advCache.places.length?advCache.places.map(x=>`<div class="advItem" data-advanced-id="${x.id}"><div><div class="advItemTitle">📍 ${esc(x.name)}</div><div class="advMeta">${esc(x.category)}${x.visit_date?' · '+dateES(x.visit_date):''}${x.address?' · '+esc(x.address):''}</div><p>${esc(x.description||'')}</p>${x.latitude&&x.longitude?`<a class="btn" style="display:inline-block;text-decoration:none" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${x.latitude},${x.longitude}">🗺️ Abrir mapa</a>`:''}</div><div class="advActions"><button class="btn" onclick="openAdvancedEdit('places','${x.id}')">✏️ Editar</button><button class="btn danger" onclick="deleteAdvanced('places','${x.id}')">🗑️</button></div></div>`).join(''):`<div class="advEmpty">📍 Guarden aquí los lugares que algún día querrán volver a visitar.</div>`}</div>`;}
function renderAdvAchievements(){
 const daysTogether=Math.max(0,Math.floor((Date.now()-new Date('2026-01-21T00:00:00'))/86400000));
 const plansCount=plans.length, memoriesCount=advCache.memories.length, lettersCount=advCache.letters.length, dreamsCount=advCache.dreams.length, datesCount=advCache.dates.length, goalsCount=advCache.goals.length, placesCount=advCache.places.length;
 const milestones=[
  ['❤️','Empezó nuestra historia',true,'El comienzo de todo.'],['💍','Nos hicimos novios',true,'El día que eligieron caminar juntos.'],
  ['🌱','Primer plan juntos',plansCount>=1,'Su primera cita guardada.'],['🗓️','5 planes',plansCount>=5,'Cinco momentos planeados.'],['🌿','10 planes',plansCount>=10,'Diez planes para seguir viviendo.'],['🌳','25 planes',plansCount>=25,'Una colección de aventuras.'],
  ['📸','Primer recuerdo',memoriesCount>=1,'El primer momento guardado.'],['📸','10 recuerdos',memoriesCount>=10,'Diez recuerdos para volver a mirar.'],
  ['💌','Primera carta',lettersCount>=1,'Una carta escrita desde el corazón.'],['💌','5 cartas',lettersCount>=5,'Cinco mensajes para el futuro.'],
  ['✨','Primer sueño cumplido',advCache.dreams.some(x=>x.status==='cumplido'),'Un sueño dejó de ser solo un sueño.'],['✨','5 sueños',dreamsCount>=5,'Cinco cosas que quieren vivir.'],
  ['🎯','Primer reto completado',advCache.challenges.some(x=>x.completed),'El primer desafío superado.'],['🎯','5 retos completados',advCache.challenges.filter(x=>x.completed).length>=5,'Cinco retos vencidos juntos.'],
  ['📅','Primera fecha importante',datesCount>=1,'Una fecha que merece quedarse.'],['💰','Primera meta',goalsCount>=1,'El primer objetivo compartido.'],['💰','Primera meta cumplida',advCache.goals.some(x=>x.completed),'Una meta alcanzada juntos.'],
  ['📍','Primer lugar guardado',placesCount>0,'Un lugar que ahora forma parte de su historia.'],['🔥','100 días juntos',daysTogether>=100,'Más de cien días de historia.'],['💖','200 días juntos',daysTogether>=200,'Doscientos días construyendo recuerdos.'],
  ['🏆','365 días juntos',daysTogether>=365,'Un año entero de ustedes.'],['💎','500 días juntos',daysTogether>=500,'Quinientos días de historia.'],['👑','1000 días juntos',daysTogether>=1000,'Una historia que ya tiene mil días.'],['🌙','Plan recurrente',plans.some(x=>x.recurrence_enabled),'Crearon algo que vuelve una y otra vez.']
 ];
 return advHeader('Nuestros logros','Pequeños hitos que muestran cuánto han construido.','🎯 Ver retos','showAdvancedTab(\'challenges\')')+`<div class="achievementGrid">${milestones.map(x=>`<div class="achievementCard ${x[2]?'unlocked':'locked'}"><div class="achievementIcon">${x[2]?x[0]:'🔒'}</div><h3>${esc(x[1])}</h3><p>${x[2]?'Desbloqueado ❤️':esc(x[3])}</p></div>`).join('')}</div>`;
}
function renderAdvPrivate(){return advHeader('Mi rincón privado','Estas notas solo las puede ver la persona que las creó.','🔐 Nueva nota','openPrivateForm()')+`<div class="advList">${advCache.privateNotes.length?advCache.privateNotes.map(x=>`<div class="advItem"><div><div class="advItemTitle">🔐 ${esc(x.title)}</div><p>${esc(x.content)}</p></div><div class="advActions"><button class="btn" onclick="openAdvancedEdit('privateNotes','${x.id}')">✏️ Editar</button><button class="btn danger" onclick="deleteAdvanced('privateNotes','${x.id}')">🗑️</button></div></div>`).join(''):`<div class="advEmpty">🔐 Un espacio solo para ti. La otra persona no puede leer estas notas.</div>`}</div>`;}
async function advLoadAll(){
  if(!couple || !sb || !user) return;
  const settingsPromise=loadCoupleSettings();
  const entries=Object.entries(advTables);
  const results=await Promise.all(entries.map(async ([key,table])=>{
    let q=sb.from(table).select('*');
    if(key==='privateNotes') q=q.eq('user_id',user.id);
    else if(key==='notifications') q=q.eq('recipient_user_id',user.id).eq('couple_id',couple.id);
    else q=q.eq('couple_id',couple.id);
    const {data,error}=await q.order('created_at',{ascending:false});
    if(error)console.warn('No se pudo cargar '+table,error.message);
    return [key,error?[]:(data||[])];
  }));
  results.forEach(([key,data])=>{advCache[key]=data;});
  if(advancedTab==='budget'){
    await ensureRecurringBudgetMovements(budgetSelectedMonth);
    const {data,error}=await sb.from('shared_expenses').select('*').eq('couple_id',couple.id).order('created_at',{ascending:false});
    if(!error)advCache.expenses=data||[];
  }
  await settingsPromise;
  renderAdvanced();
  render();
}
const cachedCoupleSettings=window.__nc21ThemeBoot||{};
let coupleSettings={theme:cachedCoupleSettings.theme||'romance',accent_color:cachedCoupleSettings.accent_color||'#e64d78',background_color:cachedCoupleSettings.background_color||'#fff7fa',home_photo_path:cachedCoupleSettings.home_photo_path||null,logo_photo_path:cachedCoupleSettings.logo_photo_path||null};
let settingsDraft=null;
async function loadCoupleSettings(){
  const {data}=await sb.from('couple_settings').select('*').eq('couple_id',couple.id).maybeSingle();
  if(data) coupleSettings={...coupleSettings,...data};
  applyCoupleSettings();
}
function applyCoupleSettings(){
  const root=document.documentElement,body=document.body,theme=coupleSettings.theme||'romance',accent=coupleSettings.accent_color||'#e64d78';
  body.dataset.theme=theme;body.style.setProperty('--rose',accent);root.style.setProperty('--rose',accent);root.style.setProperty('--bodybg',coupleSettings.background_color||'');root.style.setProperty('--accent',accent);
  root.removeAttribute('data-nc-theme-boot');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',accent);
  try{
    const css=getComputedStyle(body);
    const palette={soft:css.getPropertyValue('--soft').trim(),ink:css.getPropertyValue('--ink').trim(),muted:css.getPropertyValue('--muted').trim(),line:css.getPropertyValue('--line').trim(),surface:css.getPropertyValue('--surface').trim(),bodybg:css.getPropertyValue('--bodybg').trim()};
    localStorage.setItem('nc21_couple_settings',JSON.stringify({...coupleSettings,palette}));
  }catch(_){}
  body.classList.add('nc-theme-ready');
}
let homePhotoApplyToken=0;
async function applyHomePhoto(){
  const token=++homePhotoApplyToken;
  const root=document.documentElement;
  const path=coupleSettings.home_photo_path;
  if(path)root.dataset.ncHomePhotoPending='1';
  let url=null;
  try{url=await signedPhoto(path);}catch(_){}
  if(token!==homePhotoApplyToken)return;
  const finalUrl=url||'pareja.jpeg';
  await new Promise(resolve=>{
    const preload=new Image();
    preload.decoding='async';
    preload.fetchPriority='high';
    preload.onload=resolve;
    preload.onerror=resolve;
    preload.src=finalUrl;
    if(preload.complete)resolve();
  });
  if(token!==homePhotoApplyToken)return;
  document.querySelectorAll('[data-home-photo]').forEach(img=>{
    img.style.objectPosition='center center';
    if(img.src!==finalUrl)img.src=finalUrl;
    const syncHeroFrame=()=>{
      const hero=img.closest('.homeWelcome');
      if(!hero||!img.naturalWidth||!img.naturalHeight)return;
      const content=hero.querySelector('.homeWelcomeContent');
      const ratio=img.naturalWidth/img.naturalHeight;
      const width=hero.clientWidth||hero.parentElement?.clientWidth||0;
      const contentHeight=(content?.scrollHeight||0)+56;
      const height=Math.max(380,Math.ceil(width/ratio),contentHeight);
      hero.style.minHeight='0';
      hero.style.height=Math.min(720,height)+'px';
    };
    if(img.complete)syncHeroFrame();else img.addEventListener('load',syncHeroFrame,{once:true});
  });
  root.removeAttribute('data-nc-home-photo-pending');
}

async function saveCoupleSettings(patch){
  const payload={...coupleSettings,...patch,couple_id:couple.id,updated_by:user.id};
  const {data,error}=await sb.from('couple_settings').upsert(payload,{onConflict:'couple_id'}).select().single();
  if(error){appAlert('No se pudo guardar la configuración: '+error.message);return false;}
  coupleSettings={...coupleSettings,...data}; applyCoupleSettings(); await applyHomePhoto(); return true;
}
async function uploadCouplePhoto(inputId,field){
  const f=$(inputId)?.files?.[0];if(!f)return;
  if(!f.type.startsWith('image/')){appAlert('Selecciona una imagen.');return;}
  if(f.size>8*1024*1024){appAlert('La imagen debe pesar menos de 8 MB.');return;}
  if(field==='home_photo_path'){openHomePhotoCropEditor(f);return;}
  const old=coupleSettings[field];
  const path=`${couple.id}/settings/${field}-${crypto.randomUUID()}-${f.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
  const up=await sb.storage.from('couple-media').upload(path,f,{upsert:false});
  if(up.error){appAlert('No se pudo subir la foto: '+up.error.message);return;}
  const ok=await saveCoupleSettings({[field]:path});
  if(!ok){await sb.storage.from('couple-media').remove([path]);return;}
  if(old&&old!==path)await sb.storage.from('couple-media').remove([old]);
  await renderSettingsPhotoPreviews();
}
async function signedPhoto(path){
  if(!path)return null;
  const cacheKey='nc21_signed_photo_'+encodeURIComponent(path);
  const now=Date.now();
  try{
    const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');
    if(cached?.url&&cached.expiresAt>now+10*60*1000)return cached.url;
  }catch(_){}
  const {data,error}=await sb.storage.from('couple-media').createSignedUrl(path,60*60*24*7);
  if(error||!data?.signedUrl)return null;
  try{localStorage.setItem(cacheKey,JSON.stringify({url:data.signedUrl,expiresAt:now+6*24*60*60*1000}));}catch(_){}
  return data.signedUrl;
}
let homePhotoCropState=null;
function openHomePhotoCropEditor(file){
  const objectUrl=URL.createObjectURL(file),image=new Image();
  homePhotoCropState={file,objectUrl,image,zoom:1,x:50,y:50};
  image.onload=()=>{
    if(!homePhotoCropState||homePhotoCropState.objectUrl!==objectUrl)return;
    openAdvModal('Ajustar foto de portada ❤️',`<p class="homePhotoCropHint">Mueve el encuadre con los controles y mira cómo quedará en Inicio. La imagen final se guardará ya ajustada para que se vea igual en todos sus dispositivos.</p>
      <canvas id="homePhotoCropCanvas" class="homePhotoCropPreview" width="1600" height="600" aria-label="Vista previa del recorte de la foto"></canvas>
      <div class="homePhotoCropControls">
        <div><label for="homePhotoZoom"><span>🔎 Zoom</span><output id="homePhotoZoomValue">1.00×</output></label><input id="homePhotoZoom" type="range" min="1" max="3" step="0.05" value="1" oninput="updateHomePhotoCrop('zoom',this.value)"></div>
        <div><label for="homePhotoX"><span>↔️ Encuadre horizontal</span><output id="homePhotoXValue">50%</output></label><input id="homePhotoX" type="range" min="0" max="100" step="1" value="50" oninput="updateHomePhotoCrop('x',this.value)"></div>
        <div><label for="homePhotoY"><span>↕️ Encuadre vertical</span><output id="homePhotoYValue">50%</output></label><input id="homePhotoY" type="range" min="0" max="100" step="1" value="50" oninput="updateHomePhotoCrop('y',this.value)"></div>
      </div>
      <div class="modalBtns"><button class="btn" onclick="cancelHomePhotoCrop()">Cancelar</button><button class="btn primary" id="saveHomePhotoCropBtn" onclick="saveHomePhotoCrop()">Guardar encuadre ❤️</button></div>`);
    const canvas=$('homePhotoCropCanvas');
    if(canvas){
      const mobile=window.matchMedia('(max-width: 600px)').matches;
      canvas.width=1200;
      canvas.height=mobile?1200:450;
      canvas.style.aspectRatio='auto';
    }
    drawHomePhotoCrop();
  };
  image.onerror=()=>{URL.revokeObjectURL(objectUrl);homePhotoCropState=null;appAlert('No se pudo abrir esa imagen. Prueba con otra foto.');};
  image.src=objectUrl;
}
function drawHomePhotoCrop(){
  const st=homePhotoCropState,canvas=$('homePhotoCropCanvas');if(!st||!canvas||!st.image.naturalWidth)return;
  const ctx=canvas.getContext('2d'),ratio=canvas.width/canvas.height;
  const baseW=Math.min(st.image.naturalWidth,st.image.naturalHeight*ratio),baseH=baseW/ratio;
  const cropW=baseW/st.zoom,cropH=baseH/st.zoom;
  const sx=(st.image.naturalWidth-cropW)*(st.x/100),sy=(st.image.naturalHeight-cropH)*(st.y/100);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(st.image,sx,sy,cropW,cropH,0,0,canvas.width,canvas.height);
  const zv=$('homePhotoZoomValue'),xv=$('homePhotoXValue'),yv=$('homePhotoYValue');
  if(zv)zv.textContent=st.zoom.toFixed(2)+'×';if(xv)xv.textContent=Math.round(st.x)+'%';if(yv)yv.textContent=Math.round(st.y)+'%';
}
function updateHomePhotoCrop(key,value){if(!homePhotoCropState)return;homePhotoCropState[key]=Number(value);drawHomePhotoCrop();}
function cancelHomePhotoCrop(){
  if(homePhotoCropState?.objectUrl)URL.revokeObjectURL(homePhotoCropState.objectUrl);
  homePhotoCropState=null;closeAdvModal();
  const input=$('settingsHomePhoto');if(input)input.value='';
}
async function saveHomePhotoCrop(){
  const st=homePhotoCropState,canvas=$('homePhotoCropCanvas'),button=$('saveHomePhotoCropBtn');
  if(!st||!canvas)return;
  if(button){button.disabled=true;button.textContent='Guardando foto…';}
  try{
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('No se pudo preparar la imagen')),'image/jpeg',.94));
    const old=coupleSettings.home_photo_path;
    const path=`${couple.id}/settings/home_photo_path-${crypto.randomUUID()}-encuadre.jpg`;
    const up=await sb.storage.from('couple-media').upload(path,blob,{contentType:'image/jpeg',upsert:false});
    if(up.error)throw up.error;
    const ok=await saveCoupleSettings({home_photo_path:path});
    if(!ok){await sb.storage.from('couple-media').remove([path]);if(button){button.disabled=false;button.textContent='Guardar encuadre ❤️';}return;}
    if(old&&old!==path)await sb.storage.from('couple-media').remove([old]);
    if(st.objectUrl)URL.revokeObjectURL(st.objectUrl);
    homePhotoCropState=null;
    closeAdvModal();
    const input=$('settingsHomePhoto');if(input)input.value='';
    await renderSettingsPhotoPreviews();renderAdvanced();
    appAlert('❤️ Foto de portada guardada con el encuadre elegido.');
  }catch(error){
    if(button){button.disabled=false;button.textContent='Guardar encuadre ❤️';}
    appAlert('No se pudo guardar la foto: '+(error?.message||error));
  }
}

async function renderSettingsPhotoPreviews(){
  const root=document.documentElement,home=$('settingsHomePreview'),logo=$('settingsLogoPreview');
  const hasHome=!!coupleSettings.home_photo_path;
  if(hasHome)root.dataset.ncSettingsPhotoPending='1';
  const [homeUrl,logoUrl]=await Promise.all([signedPhoto(coupleSettings.home_photo_path),signedPhoto(coupleSettings.logo_photo_path)]);
  if(home){home.src=homeUrl||'pareja.jpeg';home.onload=()=>{if(homeUrl)root.removeAttribute('data-nc-settings-photo-pending');};}
  if(logo)logo.src=logoUrl||'pareja.jpeg';
  if(!homeUrl)root.removeAttribute('data-nc-settings-photo-pending');
}

const dailyQuestionBank=[
 '¿Cuál es un recuerdo conmigo que te hace sonreír de inmediato?','¿Qué plan sencillo te gustaría que hiciéramos esta semana?','¿En qué momento te has sentido más amado/a por mí?','¿Qué lugar sueñas con conocer juntos?','¿Qué pequeña costumbre nuestra te gustaría conservar siempre?','¿Qué canción te recuerda a nosotros y por qué?','¿Qué te gustaría que celebráramos más a menudo?','¿Qué aprendiste de ti desde que estamos juntos?','¿Cuál sería para ti una cita perfecta sin importar el dinero?','¿Qué detalle pequeño te hace sentir especial?','¿Qué sueño personal quisieras que yo apoyara más?','¿Qué te gustaría aprender conmigo?','¿Qué comida te gustaría que preparáramos juntos?','¿Qué tradición te gustaría crear como pareja?','¿Qué momento difícil sientes que superamos como equipo?','¿Qué te da paz cuando estamos juntos?','¿Qué aventura te gustaría vivir antes de terminar el año?','¿Qué valor quieres que nunca falte en nuestro hogar?','¿Qué parte de nuestra historia te gustaría contar en el futuro?','¿Qué agradeces de nuestra relación hoy?','¿Qué hábito bonito podríamos empezar juntos?','¿Qué te gustaría que hiciéramos cuando uno de los dos tenga un día difícil?','¿Qué te gustaría que nunca dejáramos de decirnos?','¿Cuál es una meta que te emociona construir conmigo?','¿Qué significa para ti amar con paciencia?','¿Qué detalle de nuestra primera etapa recuerdas con cariño?','¿Qué te gustaría hacer en nuestro próximo aniversario?','¿Qué te hace sentir que somos un equipo?','¿Qué actividad nueva probarías conmigo?','¿Qué quisieras que recordáramos de este año?'];
function localISODate(d=new Date()){const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;}
function todayQuestion(){const today=localISODate();const seed=Number(today.replaceAll('-',''));return {date:today,text:dailyQuestionBank[seed%dailyQuestionBank.length]};}
function dailyQuestionHomeCard(){const q=todayQuestion();const mine=advCache.dailyAnswers.find(a=>a.user_id===user?.id&&a.question_date===q.date);const count=advCache.dailyAnswers.filter(a=>a.question_date===q.date&&a.answer?.trim()).length;return `<div class="advCard dailyQuestionCard"><div class="advMeta">💭 PREGUNTA DEL DÍA · ${dateES(q.date)}</div><h3>${esc(q.text)}</h3><p>${mine?'Tu respuesta ya está guardada. ❤️':'Tómense un minuto para responderse algo bonito.'}</p><div class="advActions"><button class="btn primary" onclick="showAdvancedTab('question')">${mine?'Ver respuestas':'Responder juntos'} · ${count}/2</button></div></div>`;}
function renderAdvQuestion(){const q=todayQuestion();const answers=advCache.dailyAnswers.filter(a=>a.question_date===q.date);const mine=answers.find(a=>a.user_id===user?.id);const partner=answers.find(a=>a.user_id!==user?.id);const myName=coupleProfiles.find(p=>p.user_id===user?.id)?.display_name||defaultDisplayName();const partnerName=coupleProfiles.find(p=>p.user_id!==user?.id)?.display_name||'Tu persona favorita';return advHeader('La pregunta de hoy','Una pregunta diaria para conversar, conocerse y cuidar lo que están construyendo.','Volver al inicio',"showAdvancedTab('home')")+`<div class="advCard dailyQuestionCard" style="margin-top:18px"><div class="advMeta">${dateES(q.date)} · PREGUNTA COMPARTIDA</div><h2 style="font:italic 30px Georgia,serif;color:#653449">${esc(q.text)}</h2><div class="field"><label>Tu respuesta · ${esc(myName)}</label><textarea id="dailyAnswerInput" rows="4" placeholder="Escribe con sinceridad ❤️">${esc(mine?.answer||'')}</textarea></div><button class="btn primary" onclick="saveDailyAnswer()">Guardar mi respuesta ❤️</button><div class="advList" style="margin-top:18px">${mine?`<div class="advItem"><div><div class="advItemTitle">💗 ${esc(myName)} · Tu respuesta</div><p>${esc(mine.answer)}</p></div></div>`:''}${partner?`<div class="advItem"><div><div class="advItemTitle">💞 ${esc(partnerName)}</div><p>${esc(partner.answer)}</p></div></div>`:`<div class="advEmpty">La respuesta de tu pareja aparecerá aquí cuando la guarde. No hay afán. ❤️</div>`}</div></div>`;}
async function saveDailyAnswer(){const answer=$('dailyAnswerInput')?.value.trim();if(!answer)return appAlert('Escribe tu respuesta antes de guardarla ❤️');const q=todayQuestion();const {error}=await sb.from('daily_answers').upsert({couple_id:couple.id,user_id:user.id,question_date:q.date,question_text:q.text,answer,updated_at:new Date().toISOString()},{onConflict:'couple_id,user_id,question_date'});if(error)return appAlert('No se pudo guardar la respuesta: '+error.message);await advLoadAll();appAlert('Tu respuesta quedó guardada ❤️');}
function updateNotificationBadge(){const b=$('notificationsTab'),badge=$('notificationBadge');if(!b||!badge)return;const n=advCache.notifications.filter(x=>!x.read_at).length;badge.hidden=!n;badge.textContent=n>99?'99+':String(n);b.setAttribute('aria-label',n?`Notificaciones, ${n} sin leer`:'Notificaciones');b.title=n?`${n} notificación(es) sin leer`:'Notificaciones';}
function renderAdvNotifications(){const arr=advCache.notifications;const unread=arr.filter(x=>!x.read_at).length;const names=new Map(coupleProfiles.map(p=>[p.user_id,p.display_name||'Tu pareja']));return advHeader('Notificaciones','Aquí aparecen las novedades que tu pareja comparte en el calendario, recuerdos, sueños y metas.',unread?'✓ Marcar todo leído':'🔄 Actualizar',unread?'markAllNotificationsRead()':'advLoadAll()')+`<div class="advList">${arr.length?arr.map(n=>`<div class="advItem ${n.read_at?'notificationRead':'notificationUnread'}"><div style="flex:1"><div class="advItemTitle">${n.read_at?'':'🔴 '}${esc(n.title)}</div><div class="advMeta">${esc(names.get(n.actor_user_id)||'Tu pareja')} · ${new Date(n.created_at).toLocaleString('es-CO')}</div><p>${esc(n.body||'Hay una novedad en su espacio compartido.')}</p></div><div class="advActions">${n.target_tab?`<button class="btn" onclick="openNotificationTarget('${n.id}','${n.target_tab}')">Ver</button>`:''}${!n.read_at?`<button class="btn" onclick="markNotificationRead('${n.id}')">Marcar leído</button>`:''}</div></div>`).join(''):`<div class="advEmpty">💌 Todavía no hay avisos. Cuando alguno de los dos agregue algo nuevo, aparecerá aquí.</div>`}</div><div class="advCard" style="margin-top:18px"><h3>🔔 Notificaciones del navegador</h3><p>Permite que el navegador muestre avisos mientras usas la aplicación. Los avisos push cuando la app está cerrada requieren una configuración adicional del servidor.</p><button class="btn primary" onclick="enableBrowserNotifications()">Activar notificaciones del navegador</button></div>`;}
async function createPartnerNotification({event_type,title,body,target_tab,target_id}){const partner=(coupleProfiles||[]).find(p=>p.user_id&&p.user_id!==user?.id);if(!partner||!user?.id||!couple?.id)return;const {error}=await sb.from('notifications').insert({couple_id:couple.id,recipient_user_id:partner.user_id,actor_user_id:user.id,event_type,title,body,target_tab:target_tab||null,target_id:target_id||null});if(error){console.warn('No se pudo guardar la notificación:',error.message);return;}try{const {data,error:pushError}=await sb.functions.invoke('send-push-notification',{body:{couple_id:couple.id,recipient_user_id:partner.user_id,title,body:body||'Tienes una novedad de pareja. ❤️',target_tab:target_tab||'notifications',event_type}});if(pushError)console.warn('No se pudo enviar la notificación push:',pushError.message);else if(data?.error)console.warn('El servidor push no pudo enviar la notificación:',data.error);}catch(e){console.warn('No se pudo contactar al servidor de notificaciones push:',e?.message||e);}}
async function markNotificationRead(id){const {error}=await sb.from('notifications').update({read_at:new Date().toISOString()}).eq('id',id).eq('recipient_user_id',user.id);if(error)return appAlert('No se pudo marcar como leído: '+error.message);await advLoadAll();}
async function markAllNotificationsRead(){const ids=advCache.notifications.filter(n=>!n.read_at).map(n=>n.id);if(!ids.length)return;const {error}=await sb.from('notifications').update({read_at:new Date().toISOString()}).in('id',ids).eq('recipient_user_id',user.id);if(error)return appAlert('No se pudieron actualizar los avisos: '+error.message);await advLoadAll();}
async function openNotificationTarget(id,tab){await markNotificationRead(id);if(validAdvancedTabs.has(tab))showAdvancedTab(tab);}
function reminderWasSent(key){try{return localStorage.getItem('nc21_reminder_'+key)==='1';}catch(e){return false;}}
function markReminderSent(key){try{localStorage.setItem('nc21_reminder_'+key,'1');}catch(e){}}
async function sendLocalReminder(title,body,key,targetTab){if(reminderWasSent(key))return;if(!('Notification'in window)||Notification.permission!=='granted')return;try{const reg=await navigator.serviceWorker.ready;await reg.showNotification(title,{body,icon:'/icon-192.png',badge:'/icon-192.png',tag:key,data:{url:'/?tab='+encodeURIComponent(targetTab||'home')}});markReminderSent(key);}catch(e){console.warn('No se pudo mostrar el recordatorio:',e);}}
function checkLocalReminders(){if(!user||!couple||!('Notification'in window)||Notification.permission!=='granted')return;const now=new Date();for(const p of plans){if(!p.plan_date)continue;const when=new Date(p.plan_date+'T'+(p.plan_time||'09:00:00'));const mins=(when-now)/60000;if(mins>=0&&mins<=15){const key='plan_'+p.id+'_'+p.plan_date+'_'+(p.plan_time||'09');sendLocalReminder('Próximo plan ❤️',p.title+' comienza en '+Math.max(1,Math.ceil(mins))+' min.',key,'calendar');}}
const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());for(const d of advCache.dates){if(!d.event_date)continue;const parts=d.event_date.split('-').map(Number);let target=new Date(parts[0],parts[1]-1,parts[2]);const recurring=!!d.recurring||d.recurrence_type==='yearly';if(recurring&&target<today)target=new Date(now.getFullYear()+1,parts[1]-1,parts[2]);if(!recurring&&target<today)continue;const days=Math.round((target-today)/86400000);if(days===Number(d.reminder_days||0)){const dateKey=localISODate(target);sendLocalReminder(days===0?'Hoy es una fecha especial ❤️':'Se acerca una fecha especial ❤️',d.title+(days===0?' es hoy.':' es en '+days+' día(s).'),'date_'+d.id+'_'+dateKey,'dates');}}
}
const PUSH_VAPID_PUBLIC_KEY='BB0iqrnyRyEHM5I3OVVs5ZmRiDvDHkqHfGha7wG9QcqaGmpR4jO3KBxtQjQZ99sMjbPLjDX8bqrvzsTNI_xlumI';
function pushBase64UrlToBytes(value){const pad='='.repeat((4-value.length%4)%4);const base64=(value+pad).replace(/-/g,'+').replace(/_/g,'/');const raw=atob(base64);return Uint8Array.from(raw,c=>c.charCodeAt(0));}
async function enableBrowserNotifications(){if(!('Notification'in window))return appAlert('Este navegador no admite notificaciones. Prueba Chrome en Android o PC.');if(!('serviceWorker'in navigator)||!('PushManager'in window))return appAlert('Este navegador no admite notificaciones push. Prueba Chrome actualizado o instala la PWA.');if(!user?.id||!couple?.id||!sb)return appAlert('Primero inicia sesión en vuestro espacio.');const permission=await Notification.requestPermission();if(permission!=='granted')return appAlert('No se concedió permiso. Puedes cambiarlo desde los ajustes del navegador.');try{const reg=await navigator.serviceWorker.ready;let subscription=await reg.pushManager.getSubscription();if(!subscription)subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:pushBase64UrlToBytes(PUSH_VAPID_PUBLIC_KEY)});const json=subscription.toJSON();const {error}=await sb.from('push_subscriptions').upsert({couple_id:couple.id,user_id:user.id,endpoint:subscription.endpoint,p256dh:json.keys?.p256dh,auth:json.keys?.auth,user_agent:navigator.userAgent.slice(0,300)},{onConflict:'endpoint'});if(error)throw error;checkLocalReminders();const {data,error:pushError}=await sb.functions.invoke('send-push-notification',{body:{couple_id:couple.id,recipient_user_id:user.id,title:'Nuestro Calendario #21 ❤️',body:'¡Las notificaciones push de este dispositivo están activas!',target_tab:'notifications',test:true}});if(pushError)throw pushError;if(data?.error)throw new Error(data.error);appAlert('¡Notificaciones push activadas! Se envió una prueba real a este dispositivo. Cuando tu pareja agregue un plan, recibirás un aviso aunque la PWA no esté abierta, siempre que el dispositivo tenga conexión. ❤️');}catch(e){console.error('Error activando push:',e);appAlert('No pudimos activar las notificaciones push: '+(e?.message||'error desconocido')+'. Verifica que el servidor push esté configurado y vuelve a intentarlo.');}}
let deferredInstallPrompt=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;});
async function installCalendarApp(){if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;return;}appAlert('En Android abre este sitio en Chrome, toca el menú ⋮ y elige “Instalar aplicación” o “Añadir a pantalla de inicio”. En PC, busca el icono de instalación en la barra de direcciones.');}
function budgetProfiles(){const ps=coupleProfiles||[];const ana=ps.find(p=>(p.display_name||'').toLowerCase().includes('ana'))||ps[0];const nico=ps.find(p=>(p.display_name||'').toLowerCase().includes('nicol'))||ps.find(p=>p.user_id!==ana?.user_id)||ps[1];return [{id:ana?.user_id,name:ana?.display_name||'Ana María',key:'ana'},{id:nico?.user_id,name:nico?.display_name||'Nicolás',key:'nicolas'}].filter((p,i,a)=>p.id&&a.findIndex(q=>q.id===p.id)===i);}
function budgetPersonStats(uid,items){const mine=items.filter(e=>e.owner_user_id===uid);const income=mine.filter(e=>e.entry_type==='income').reduce((s,e)=>s+Number(e.amount||0),0);const expenses=mine.filter(e=>e.entry_type!=='income').reduce((s,e)=>s+Number(e.amount||0),0);return {income,expenses,liquidity:income-expenses,count:mine.length};}
function budgetBar(label,value,max,kind){const pct=max>0?Math.max(0,Math.min(100,value/max*100)):0;return '<div class="budgetBarRow"><div class="budgetBarLabel"><span>'+esc(label)+'</span><strong>'+money(value)+'</strong></div><div class="budgetBarTrack"><span class="budgetBarFill '+(kind||'')+'" style="width:'+pct+'%"></span></div></div>';}
function renderAdvBudget(){
 const expenses=advCache.expenses.slice().sort((a,b)=>(b.spent_on||'').localeCompare(a.spent_on||''));
 const month=budgetSelectedMonth;
 const monthItems=expenses.filter(e=>(e.spent_on||'').slice(0,7)===month);
 const people=budgetProfiles();
 const stats=people.map(p=>Object.assign({},p,budgetPersonStats(p.id,monthItems)));
 const totalIncome=stats.reduce((s,p)=>s+p.income,0),totalExpenses=stats.reduce((s,p)=>s+p.expenses,0),liquidity=totalIncome-totalExpenses;
 const max=Math.max(1,...stats.flatMap(p=>[p.income,p.expenses]),totalIncome,totalExpenses);
 const names=new Map(people.map(p=>[p.id,p.name]));
 const categories=monthItems.filter(e=>e.entry_type!=='income').reduce((o,e)=>(o[e.category||'otros']=(o[e.category||'otros']||0)+Number(e.amount||0),o),{});
 const peopleCards=stats.map(p=>'<div class="advCard budgetPersonCard"><div class="budgetPersonHeading"><div class="budgetAvatar">'+(p.key==='ana'?'🌷':'🧑🏻')+'</div><div><h3>Presupuesto '+esc(p.name)+'</h3><div class="advMeta">Resumen de '+esc(month)+'</div></div></div><div class="budgetMetricRow"><span>Ingresos</span><strong class="incomeText">'+money(p.income)+'</strong></div><div class="budgetMetricRow"><span>Gastos</span><strong class="expenseText">'+money(p.expenses)+'</strong></div><div class="budgetLiquidity"><span>Liquidez</span><strong class="'+(p.liquidity<0?'expenseText':'incomeText')+'">'+money(p.liquidity)+'</strong></div><div class="advMeta">'+p.count+' movimiento(s) este mes</div></div>').join('');
 const categoryRows=Object.entries(categories).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'<p class="budgetCategoryRow"><span>'+esc(k)+'</span><strong>'+money(v)+'</strong></p>').join('');
 const movementRows=monthItems.map(e=>'<div class="advItem"><div class="budgetMovementIcon '+(e.entry_type==='income'?'incomeIcon':'expenseIcon')+'">'+(e.entry_type==='income'?'↗':'↘')+'</div><div style="flex:1;min-width:0"><div class="advItemTitle">'+esc(e.title)+'</div><div class="advMeta">'+dateES(e.spent_on)+' · '+esc(e.category||'otros')+' · '+esc(names.get(e.owner_user_id)||'Integrante')+' · '+(e.entry_type==='income'?'Ingreso':'Gasto')+(e.recurring_template_id?' · 🔁 Recurrente':'')+'</div>'+(e.notes?'<p>'+esc(e.notes)+'</p>':'')+'</div><div class="advActions"><strong class="'+(e.entry_type==='income'?'incomeText':'expenseText')+'">'+(e.entry_type==='income'?'+':'−')+money(e.amount)+'</strong>'+(e.owner_user_id===user.id?'<button class="btn danger" aria-label="Eliminar movimiento" onclick="deleteExpense(\''+e.id+'\')">🗑️</button>':'')+'</div></div>').join('');
 const monthLabel=new Date(month+'-01T00:00:00').toLocaleDateString('es-CO',{month:'long',year:'numeric'});
 const recurringRows=advCache.recurring.map(t=>'<div class="advItem"><div style="flex:1;min-width:0"><div class="advItemTitle">🔁 '+esc(t.title)+(t.active?'':' <span class="advMeta">· Pausado</span>')+'</div><div class="advMeta">'+esc(names.get(t.owner_user_id)||'Integrante')+' · '+(t.entry_type==='income'?'Ingreso':'Gasto')+' · Día '+t.day_of_month+' · '+money(t.amount)+'</div></div><div class="advActions">'+(t.owner_user_id===user.id?'<button class="btn" onclick="toggleRecurringTemplate(\''+t.id+'\','+(!t.active)+')">'+(t.active?'Pausar':'Reactivar')+'</button>':'')+'</div></div>').join('');
 return advHeader('Presupuesto familiar','Controlen por separado las finanzas de Ana y Nicolás y consulten el total de ambos.','＋ Registrar movimiento','openExpenseForm()')+'<div class="budgetMonthPicker"><button class="btn" onclick="changeBudgetMonth(-1)" aria-label="Mes anterior">‹</button><div><label for="budgetMonth">Mes del presupuesto</label><input id="budgetMonth" type="month" value="'+month+'" onchange="setBudgetMonth(this.value)"><strong>'+esc(monthLabel)+'</strong></div><button class="btn" onclick="changeBudgetMonth(1)" aria-label="Mes siguiente">›</button></div><div class="budgetSummaryGrid"><div class="budgetSummaryCard"><span>Ingresos conjuntos · mes</span><strong class="incomeText">'+money(totalIncome)+'</strong></div><div class="budgetSummaryCard"><span>Gastos conjuntos · mes</span><strong class="expenseText">'+money(totalExpenses)+'</strong></div><div class="budgetSummaryCard"><span>Liquidez conjunta · mes</span><strong class="'+(liquidity<0?'expenseText':'incomeText')+'">'+money(liquidity)+'</strong></div></div><div class="budgetPeopleGrid">'+peopleCards+'</div><div class="advGrid"><div class="advCard"><h3>📊 Ingresos vs. gastos</h3><p>Comparación del mes seleccionado en pesos colombianos.</p>'+budgetBar('Ingresos',totalIncome,max,'incomeFill')+budgetBar('Gastos',totalExpenses,max,'expenseFill')+'</div><div class="advCard"><h3>👫 Liquidez por persona</h3><p>Lo que queda después de restar los gastos a los ingresos.</p>'+stats.map(p=>budgetBar(p.name,p.liquidity>0?p.liquidity:0,Math.max(1,...stats.map(s=>Math.max(0,s.liquidity))),'incomeFill')).join('')+(stats.some(p=>p.liquidity<0)?'<div class="advMeta">Saldo negativo: '+stats.filter(p=>p.liquidity<0).map(p=>esc(p.name)+' '+money(p.liquidity)).join(' · ')+'</div>':'')+'</div><div class="advCard"><h3>🧾 Gastos por categoría</h3>'+(categoryRows||'<p>Aún no hay gastos este mes.</p>')+'</div></div><div class="advCard" style="margin-top:16px"><div class="budgetListHeading"><div><h3>Movimientos del mes</h3><p>Los ingresos y gastos se muestran separados por persona.</p></div><button class="btn primary" onclick="openExpenseForm()">＋ Añadir</button></div><div class="advList">'+(movementRows||'<div class="advEmpty">💗 No hay movimientos en este mes todavía.</div>')+'</div></div><div class="advCard" style="margin-top:16px"><div class="budgetListHeading"><div><h3>🔁 Ingresos y gastos repetitivos</h3><p>Se registran automáticamente al consultar cada mes, sin duplicar movimientos.</p></div><button class="btn primary" onclick="openRecurringForm()">＋ Crear recurrente</button></div><div class="advList">'+(recurringRows||'<div class="advEmpty">Aún no han configurado movimientos recurrentes.</div>')+'</div></div>';
}
function openExpenseForm(){const people=budgetProfiles();const me=people.find(p=>p.id===user.id);openAdvModal('Nuevo movimiento de dinero','<div class="moneyModalIntro"><span>💸</span><div><strong>Organicen sus finanzas</strong><p>Este movimiento se guardará en el presupuesto de '+esc(me?.name||myProfile.display_name||'tu perfil')+' y en el resumen conjunto.</p></div></div><div class="field"><label>Tipo de movimiento</label><div class="moneyTypeChoices"><button type="button" id="budgetIncomeChoice" class="moneyTypeChoice" onclick="setBudgetEntryType(\'income\')">↗ Ingreso</button><button type="button" id="budgetExpenseChoice" class="moneyTypeChoice active" onclick="setBudgetEntryType(\'expense\')">↘ Gasto</button></div></div><input type="hidden" id="adv_entry_type" value="expense">'+input('title','Concepto del movimiento')+input('amount','Valor en pesos colombianos','number','min="1" step="1" placeholder="Ej. 150000"')+input('spent_on','Fecha','date')+select('category','Categoría',[['salario','Salario'],['extra','Ingreso extra'],['citas','Citas'],['comida','Comida'],['transporte','Transporte'],['viajes','Viajes'],['hogar','Hogar'],['servicios','Servicios'],['regalos','Regalos'],['ahorro','Ahorro'],['deuda','Deuda / cuota'],['otros','Otros']])+textarea('notes','Notas (opcional)','Un detalle para recordar...')+moneyModalActions('saveExpense()'));$('adv_spent_on').value=budgetSelectedMonth===localISODate().slice(0,7)?localISODate():budgetSelectedMonth+'-01';setBudgetEntryType('expense');$('adv_title')?.focus();}
function setBudgetEntryType(type){$('adv_entry_type').value=type;$('budgetIncomeChoice')?.classList.toggle('active',type==='income');$('budgetExpenseChoice')?.classList.toggle('active',type==='expense');const category=$('adv_category');if(category&&type==='income')category.value='salario';else if(category&&['salario','extra'].includes(category.value))category.value='otros';}
async function saveExpense(){const title=$('adv_title').value.trim(),amount=Number($('adv_amount').value),spent_on=$('adv_spent_on').value,entry_type=$('adv_entry_type').value;if(!title)return moneyFormError('Escribe el concepto del movimiento.');if(!Number.isFinite(amount)||amount<=0)return moneyFormError('Ingresa un valor válido mayor que cero.');if(!spent_on)return moneyFormError('Selecciona la fecha del movimiento.');if(!user?.id||!couple?.id)return moneyFormError('Tu sesión no está lista. Vuelve a iniciar sesión.');const {error}=await sb.from('shared_expenses').insert({couple_id:couple.id,created_by:user.id,paid_by:user.id,owner_user_id:user.id,entry_type,title,amount,spent_on,category:$('adv_category').value,notes:$('adv_notes').value.trim()||null});if(error)return moneyFormError('No se pudo guardar: '+error.message);closeAdvModal();await advLoadAll();showAppToast('Movimiento guardado correctamente ❤️');}
function deleteExpense(id){const safeId=String(id).replace(/\\/g,'\\\\').replace(/'/g,"\\\\'");openConfirmModal('Eliminar movimiento','¿Quieres eliminar este movimiento del presupuesto? Esta acción no se puede deshacer.','Eliminar',"confirmDeleteExpense('"+safeId+"')");}
async function confirmDeleteExpense(id){const {data,error}=await sb.from('shared_expenses').delete().eq('id',id).eq('couple_id',couple.id).eq('owner_user_id',user.id).select('id');if(error)return moneyFormError('No se pudo eliminar: '+error.message);if(!data||!data.length)return moneyFormError('No se eliminó el movimiento. Solo puedes eliminar tus propios ingresos y gastos; actualiza el presupuesto e inténtalo de nuevo.');closeAdvModal();await advLoadAll();showAppToast('Movimiento eliminado.');}
function changeBudgetMonth(delta){const [y,m]=budgetSelectedMonth.split('-').map(Number);const d=new Date(y,m-1+delta,1);budgetSelectedMonth=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');advLoadAll();}
function setBudgetMonth(value){if(!/^\d{4}-\d{2}$/.test(value))return;budgetSelectedMonth=value;advLoadAll();}
async function ensureRecurringBudgetMovements(monthKey){if(!couple||!user||!monthKey)return;const [year,month]=monthKey.split('-').map(Number);const monthStart=monthKey+'-01';const daysInMonth=new Date(year,month,0).getDate();const rows=advCache.recurring.filter(t=>t.active&&t.start_date&&t.start_date.slice(0,7)<=monthKey&&(!t.end_date||t.end_date.slice(0,7)>=monthKey)).map(t=>{const spent_on=monthKey+'-'+String(Math.min(Number(t.day_of_month||1),daysInMonth)).padStart(2,'0');return {couple_id:couple.id,created_by:t.created_by,paid_by:t.owner_user_id,owner_user_id:t.owner_user_id,entry_type:t.entry_type,title:t.title,amount:t.amount,spent_on,category:t.category||'otros',notes:t.notes||null,recurring_template_id:t.id,recurrence_month:monthStart};}).filter(row=>row.spent_on>= (advCache.recurring.find(t=>t.id===row.recurring_template_id)?.start_date||monthStart)&&(!advCache.recurring.find(t=>t.id===row.recurring_template_id)?.end_date||row.spent_on<=advCache.recurring.find(t=>t.id===row.recurring_template_id).end_date));if(!rows.length)return;const {error}=await sb.from('shared_expenses').upsert(rows,{onConflict:'recurring_template_id,recurrence_month',ignoreDuplicates:true});if(error)console.warn('No se pudieron generar movimientos recurrentes:',error.message);}
function openRecurringForm(){openAdvModal('Nuevo ingreso o gasto recurrente','<div class="moneyModalIntro"><span>🔁</span><div><strong>Regístralo una sola vez</strong><p>La aplicación creará el movimiento en cada mes que corresponda, usando el día elegido. Si el mes es más corto, usará su último día.</p></div></div>'+input('recurring_title','Concepto','text','maxlength="120" placeholder="Ej. Salario, arriendo, recibo de luz"')+input('recurring_amount','Valor en pesos colombianos','number','min="1" step="1" placeholder="Ej. 150000"')+select('recurring_type','Tipo de movimiento',[['expense','Gasto'],['income','Ingreso']])+select('recurring_category','Categoría',[['salario','Salario'],['extra','Ingreso extra'],['hogar','Hogar'],['servicios','Servicios'],['deuda','Deuda / cuota'],['transporte','Transporte'],['comida','Comida'],['ahorro','Ahorro'],['otros','Otros']])+input('recurring_day','Día del mes','number','min="1" max="31" value="1"')+input('recurring_start','Primer mes / fecha de inicio','date')+input('recurring_end','Última fecha (opcional)','date')+textarea('recurring_notes','Notas (opcional)','Detalle del movimiento')+moneyModalActions('saveRecurringTemplate()'));$('adv_recurring_start').value=localISODate();$('adv_recurring_day').value=String(new Date().getDate());}
async function saveRecurringTemplate(){const title=$('adv_recurring_title').value.trim(),amount=Number($('adv_recurring_amount').value),start_date=$('adv_recurring_start').value,end_date=$('adv_recurring_end').value||null,day_of_month=Number($('adv_recurring_day').value),entry_type=$('adv_recurring_type').value;if(!title)return moneyFormError('Escribe el concepto.');if(!Number.isFinite(amount)||amount<=0)return moneyFormError('Ingresa un valor mayor que cero.');if(!start_date)return moneyFormError('Selecciona la fecha de inicio.');if(!Number.isInteger(day_of_month)||day_of_month<1||day_of_month>31)return moneyFormError('El día debe estar entre 1 y 31.');if(end_date&&end_date<start_date)return moneyFormError('La fecha final no puede ser anterior al inicio.');const {error}=await sb.from('budget_recurring_templates').insert({couple_id:couple.id,created_by:user.id,owner_user_id:user.id,entry_type,title,amount,category:$('adv_recurring_category').value,day_of_month,start_date,end_date,notes:$('adv_recurring_notes').value.trim()||null,active:true});if(error)return moneyFormError('No se pudo guardar el recurrente: '+error.message);closeAdvModal();await advLoadAll();showAppToast('Movimiento recurrente guardado ❤️');}
async function toggleRecurringTemplate(id,active){const {error}=await sb.from('budget_recurring_templates').update({active}).eq('id',id).eq('couple_id',couple.id).eq('owner_user_id',user.id);if(error)return showAppToast('No se pudo actualizar: '+error.message,'error');await advLoadAll();showAppToast(active?'Movimiento recurrente reactivado.':'Movimiento recurrente pausado.');}
function renderAdvSettings(){
 if(!settingsDraft) settingsDraft={theme:coupleSettings.theme||'romance',accent_color:coupleSettings.accent_color||'#e64d78',background_color:coupleSettings.background_color||'#fff7fa'};
 const themes=[['romance','🌹 Romance','#e64d78','#fff7fa'],['night','🌙 Noche','#d78aa7','#1d151b'],['lavender','🌸 Lavanda','#9a78c7','#f7f3ff'],['sunset','🌅 Atardecer','#d96b48','#fff6ef'],['ocean','🌊 Océano','#4b8fb4','#f1fbff'],['cherry','🍒 Cereza','#d7265e','#ffe3eb'],['emerald','🌿 Esmeralda','#2f8f73','#e0f4ec'],['coffee','☕ Café','#a56a43','#f3e3d5'],['sakura','🌸 Sakura','#e58cab','#ffe9f1'],['royal','👑 Royal','#7255b5','#ece5fb'],['forest','🌲 Bosque','#557a55','#e4efe2'],['wine','🍷 Vino','#9d3d58','#f4dfe6'],['sky','☁️ Cielo','#4c8ec4','#e3f1fb'],['mint','🍃 Menta','#4a9b88','#dff4ee'],['peach','🍑 Durazno','#e58b62','#ffeadf'],['gold','✨ Dorado','#b48a2d','#f8efd2'],['plum','🪻 Ciruela','#8d4f91','#f1e3f1'],['midnight','🌌 Medianoche','#8ca8ff','#252c47'],['charcoal','🖤 Carbón','#d9a7b8','#34343a'],['blush','🌷 Blush','#c95f87','#f7dce7'],['ice','🧊 Hielo','#639eb7','#e2f3f8'],['rosewood','🌹 Rosewood','#a74d62','#f1dfe4'],['aurora','🌌 Aurora','#65a6a4','#dff1ee'],['sage','🌱 Salvia','#64856a','#e5efe4'],['blueberry','🫐 Arándano','#6476c8','#e9edff'],['terracotta','🏺 Terracota','#b85f48','#f7e4db'],['butter','🌼 Vainilla','#a98527','#fff4cf'],['lagoon','🩵 Laguna','#258e95','#dff4f2'],['rosegold','✨ Oro rosa','#b76e79','#f5e1e4']];
 const active=settingsDraft.theme||coupleSettings.theme||'romance';
 return advHeader('Configuración','Hagan que Nuestro Calendario #21 se sienta todavía más de ustedes.','💾 Guardar','saveSettingsFromUI()')+`<div class="settingsCard" style="margin-bottom:16px"><h3>📲 Instalar en este dispositivo</h3><p>Abre Nuestro Calendario #21 como una aplicación en Android o PC, usando la misma cuenta y los mismos datos.</p><button class="btn primary" onclick="installCalendarApp()">Instalar / añadir a pantalla de inicio</button></div><div class="settingsGrid">
 <div class="settingsCard"><h3>🎨 Tema de la aplicación</h3><p>Elige el estilo general. Se guarda para los dos.</p><div class="themeChoices">${themes.map(t=>`<button type="button" class="themeChoice ${active===t[0]?'active':''}" onclick="selectTheme('${t[0]}')"><div class="themeSwatch" style="background:linear-gradient(135deg,${t[2]},${t[3]})"></div><b>${t[1]}</b><div class="advMeta">${({romance:'Romántico y cálido',night:'Elegante y nocturno',lavender:'Suave y delicado',sunset:'Atardecer cálido',ocean:'Fresco y sereno',cherry:'Intenso y romántico',emerald:'Natural y equilibrado',coffee:'Tonos tierra acogedores',sakura:'Rosa suave y delicado',royal:'Violeta elegante',forest:'Verde natural',wine:'Clásico y profundo',sky:'Azul claro y limpio',mint:'Fresco y relajante',peach:'Cálido y luminoso',gold:'Dorado suave',plum:'Ciruela sofisticada',midnight:'Oscuro con acentos azules',charcoal:'Minimalista y oscuro',blush:'Rosa empolvado',ice:'Azul hielo',rosewood:'Rosa madera',aurora:'Verde agua sereno',sage:'Verde salvia natural',blueberry:'Azul violeta delicado',terracotta:'Arcilla cálida',butter:'Amarillo crema suave',lagoon:'Turquesa tranquilo',rosegold:'Rosa dorado elegante'})[t[0]]||'Una combinación equilibrada'}</div></button>`).join('')}</div>
 <div class="colorRow"><input id="settingsAccent" type="color" value="${esc(settingsDraft.accent_color||coupleSettings.accent_color||'#e64d78')}" onchange="previewAccent(this.value)"><div><b>Color principal</b><div class="advMeta">Personaliza botones, detalles y acentos.</div></div></div></div>
 <div class="settingsCard"><h3>📸 Fotos de la aplicación</h3><p>Pueden reemplazar la foto principal sin modificar el código.</p>
 <div class="photoSetting"><img id="settingsHomePreview" class="photoPreview" src="pareja.jpeg" alt="Portada"><div><b>Foto de portada</b><div class="advMeta">Es la imagen grande de Inicio.</div><input id="settingsHomePhoto" type="file" accept="image/*" style="margin-top:10px" onchange="uploadCouplePhoto('settingsHomePhoto','home_photo_path')"></div></div>
 <div class="photoSetting"><img id="settingsLogoPreview" class="photoPreview" src="pareja.jpeg" alt="Foto secundaria"><div><b>Foto secundaria</b><div class="advMeta">Podremos usarla en tarjetas, perfil y futuras pantallas.</div><input id="settingsLogoPhoto" type="file" accept="image/*" style="margin-top:10px" onchange="uploadCouplePhoto('settingsLogoPhoto','logo_photo_path')"></div></div>
 <div class="settingsNote">🔒 Las fotos se guardan en el almacenamiento privado de su pareja. No se hacen públicas.</div></div>
 <div class="settingsCard"><h3>✨ Vista de Inicio</h3><p>La portada puede usar su foto actual o la que carguen arriba.</p><div class="settingsActions"><button class="btn primary" onclick="useDefaultCouplePhoto()">↩️ Volver a la foto original</button><button class="btn" onclick="showAdvancedTab('home')">🏠 Ver Inicio</button></div></div>
 <div class="settingsCard"><h3>💡 Próximamente</h3><p>Desde aquí también podremos controlar notificaciones, sonidos, vibración, animaciones, privacidad y preferencias individuales cuando pasemos a la app móvil.</p></div>
 </div><div id="settingsSaveMsg" class="settingsNote hidden"></div>`;
}
function selectTheme(theme){
 if(!settingsDraft) settingsDraft={theme:coupleSettings.theme||'romance',accent_color:coupleSettings.accent_color||'#e64d78',background_color:coupleSettings.background_color||'#fff7fa'};
 const themeAccents={romance:'#e64d78',night:'#d78aa7',lavender:'#9a78c7',sunset:'#d96b48',ocean:'#4b8fb4',cherry:'#d7265e',emerald:'#2f8f73',coffee:'#a56a43',sakura:'#e58cab',royal:'#7255b5',forest:'#557a55',wine:'#9d3d58',sky:'#4c8ec4',mint:'#4a9b88',peach:'#e58b62',gold:'#b48a2d',plum:'#8d4f91',midnight:'#8ca8ff',charcoal:'#d9a7b8',blush:'#c95f87',ice:'#639eb7',rosewood:'#a74d62',aurora:'#65a6a4',sage:'#64856a',blueberry:'#6476c8',terracotta:'#b85f48',butter:'#a98527',lagoon:'#258e95',rosegold:'#b76e79'};
 settingsDraft.theme=theme;
 settingsDraft.accent_color=themeAccents[theme]||themeAccents.romance;
 const accentInput=$('settingsAccent');if(accentInput)accentInput.value=settingsDraft.accent_color;
 document.querySelectorAll('.themeChoice').forEach(b=>b.classList.toggle('active',b.getAttribute('onclick')?.includes(`'${theme}'`)));
}
function previewAccent(v){
 if(!settingsDraft) settingsDraft={theme:coupleSettings.theme||'romance',accent_color:coupleSettings.accent_color||'#e64d78',background_color:coupleSettings.background_color||'#fff7fa'};
 settingsDraft.accent_color=v;
}
async function saveSettingsFromUI(){
 const accent=$('settingsAccent')?.value||settingsDraft?.accent_color||coupleSettings.accent_color||'#e64d78';
 const theme=settingsDraft?.theme||coupleSettings.theme||'romance';
 const ok=await saveCoupleSettings({theme,accent_color:accent,background_color:settingsDraft?.background_color||coupleSettings.background_color||'#fff7fa'});
 if(ok){settingsDraft=null;await renderSettingsPhotoPreviews();renderAdvanced();appAlert('✅ Configuración guardada para los dos ❤️');}
}
async function useDefaultCouplePhoto(){
  const old=coupleSettings.home_photo_path;
  const ok=await saveCoupleSettings({home_photo_path:null});
  if(!ok)return;
  if(old)await sb.storage.from('couple-media').remove([old]);
  await renderSettingsPhotoPreviews();renderAdvanced();
}
function openAdvModal(title,body){const modal=$('advModal');modal.classList.remove('is-closing');$('advModalTitle').textContent=title;$('advModalBody').innerHTML=body;modal.classList.add('show');}
function moneyModalActions(action,label='Guardar'){return '<div class="moneyModalActions"><button class="btn" onclick="closeAdvModal()">Cancelar</button><button class="btn primary" onclick="'+action+'">'+label+'</button></div><div id="moneyFormError" class="moneyFormError" role="alert" hidden></div>';}
function moneyFormError(message){const e=$('moneyFormError');if(e){e.textContent=message;e.hidden=false;}else showAppToast(message,'error');}
function openConfirmModal(title,message,confirmLabel,action){openAdvModal(title,'<div class="moneyModalIntro"><span>💗</span><div><strong>'+esc(message)+'</strong></div></div><div class="moneyModalActions"><button class="btn" onclick="closeAdvModal()">Cancelar</button><button class="btn danger" onclick="'+action+'">'+esc(confirmLabel)+'</button></div>');}
function showAppToast(message,type='success'){let toast=$('appToast');if(!toast){toast=document.createElement('div');toast.id='appToast';toast.className='appToast';toast.setAttribute('role','status');document.body.appendChild(toast);}toast.className='appToast '+(type==='error'?'toastError':'toastSuccess');toast.textContent=message;toast.classList.add('show');clearTimeout(window.nc21ToastTimer);window.nc21ToastTimer=setTimeout(()=>toast.classList.remove('show'),3200);}
function openGoalMovement(id,mode='add'){const x=advCache.goals.find(g=>g.id===id);if(!x)return;const adding=mode==='add';openAdvModal(adding?'Aportar a la meta ❤️':'Retirar dinero de la meta','<div class="moneyModalIntro"><span>'+(adding?'🌱':'↘️')+'</span><div><strong>'+esc(x.title)+'</strong><p>Saldo actual: <b>'+money(x.current_amount||0)+'</b>'+(x.target_amount?' · Objetivo: '+money(x.target_amount):'')+'</p></div></div><div class="field"><label>'+(adding?'Valor que vas a aportar':'Valor que vas a retirar')+'</label><input id="goalMovementAmount" type="number" min="1" step="1" placeholder="Ej. 50000" inputmode="numeric"></div><div class="field"><label>Nota (opcional)</label><input id="goalMovementNote" type="text" maxlength="120" placeholder="'+(adding?'Ahorro del mes':'Retiro de la meta')+'"></div>'+moneyModalActions('saveGoalMovement(\''+id+'\',\''+mode+'\')',adding?'Registrar aporte':'Registrar retiro'));}
async function saveGoalMovement(id,mode){const x=advCache.goals.find(g=>g.id===id);const amount=Number($('goalMovementAmount')?.value);if(!x)return;if(!Number.isFinite(amount)||amount<=0)return moneyFormError('Ingresa un valor mayor que cero.');const current=Number(x.current_amount||0),adding=mode==='add';if(!adding&&amount>current)return moneyFormError('No puedes retirar más dinero del que tiene la meta.');const next=adding?current+amount:current-amount;const completed=!!x.target_amount&&next>=Number(x.target_amount);const note=$('goalMovementNote')?.value.trim();const {error}=await sb.from('goals').update({current_amount:next,completed}).eq('id',id).eq('couple_id',couple.id);if(error)return moneyFormError('No se pudo actualizar la meta: '+error.message);closeAdvModal();await advLoadAll();showAppToast((adding?'Aporte registrado: ':'Retiro registrado: ')+money(amount)+(note?' · '+note:''));}
function closeAdvModal(){const modal=$('advModal');if(!modal||!modal.classList.contains('show'))return;if(homePhotoCropState?.objectUrl){URL.revokeObjectURL(homePhotoCropState.objectUrl);homePhotoCropState=null;}modal.classList.add('is-closing');window.setTimeout(()=>{if(modal.classList.contains('is-closing'))modal.classList.remove('show','is-closing');},210);}
function formShell(fields,submit){return `<div class="advForm">${fields}</div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:18px"><button class="btn" onclick="closeAdvModal()">Cancelar</button><button class="btn primary" onclick="${submit}">Guardar ❤️</button></div>`;}
function input(id,label,type='text',extra=''){return `<div class="field"><label>${label}</label><input id="adv_${id}" type="${type}" ${extra}></div>`}
function textarea(id,label,ph=''){return `<div class="field"><label>${label}</label><textarea id="adv_${id}" placeholder="${ph}"></textarea></div>`}
function select(id,label,opts){return `<div class="field"><label>${label}</label><select id="adv_${id}">${opts.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join('')}</select></div>`}
function openQuickCreate(){openAdvModal('Crear algo nuevo ✨',`<div class="advGrid"><button class="btn" onclick="closeAdvModal();openMemoryForm()">📸 Recuerdo</button><button class="btn" onclick="closeAdvModal();openLetterForm()">💌 Carta</button><button class="btn" onclick="closeAdvModal();openDreamForm()">✨ Sueño</button><button class="btn" onclick="closeAdvModal();openChallengeForm()">🎯 Reto</button><button class="btn" onclick="closeAdvModal();openDateForm()">📅 Fecha</button><button class="btn" onclick="closeAdvModal();openGoalForm()">💰 Meta</button><button class="btn" onclick="closeAdvModal();openPlaceForm()">📍 Lugar</button><button class="btn" onclick="closeAdvModal();openIdeaForm()">🎲 Idea</button></div>`)}
function openMemoryForm(isEdit=false){if(!isEdit)advancedEditState={key:null,id:null};openAdvModal('Nuevo recuerdo 📸',formShell(input('title','Título')+`<div class="advFormGrid">${input('memory_date','Fecha','date')}${select('category','Categoría',[['momento','Momento'],['cita','Cita'],['viaje','Viaje'],['celebracion','Celebración'],['divertido','Divertido'],['favorito','Favorito']])}</div>`+textarea('description','Descripción','¿Qué hizo especial este momento?')+`<div class="field"><label>Foto</label><input id="adv_photo" type="file" accept="image/*"></div>`,`saveMemory()`));$('adv_memory_date').value=new Date().toISOString().slice(0,10);}
async function saveMemory(){if(advancedEditState.key==='memories'&&advancedEditState.id)return saveAdvancedEdit();const title=$('adv_title').value.trim();if(!title)return appAlert('Escribe un título ❤️');let photo_url=null;const f=$('adv_photo')?.files?.[0];if(f){const path=`${couple.id}/${user.id}/${crypto.randomUUID()}-${f.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const up=await sb.storage.from('couple-media').upload(path,f,{upsert:false});if(up.error)return appAlert('No se pudo subir la foto: '+up.error.message);const signed=await sb.storage.from('couple-media').createSignedUrl(path,60*60*24*365);photo_url=signed.data?.signedUrl||null;}const {error}=await sb.from('memories').insert({couple_id:couple.id,created_by:user.id,title,memory_date:$('adv_memory_date').value,category:$('adv_category').value,description:$('adv_description').value,location:(selectedPlaceById($('adv_place_id')?.value)?.name||null),place_id:$('adv_place_id')?.value||null,photo_url});if(error)return appAlert(error.message);closeAdvModal();await advLoadAll();}
function openLetterForm(isEdit=false){if(!isEdit)advancedEditState={key:null,id:null};openAdvModal('Nueva carta 💌',formShell(input('title','Título')+select('category','Tipo',[['libre','Para cualquier día'],['triste','Para cuando estés triste'],['extraño','Para cuando me extrañes'],['feliz','Para cuando estés feliz'],['aniversario','Para nuestro aniversario'],['futuro','Para el futuro']])+textarea('content','Carta','Escribe todo lo que quieras decir...')+input('unlock_at','Desbloquear el','datetime-local'),`saveLetter()`));}
async function saveLetter(){if(advancedEditState.key==='letters'&&advancedEditState.id)return saveAdvancedEdit();const title=$('adv_title').value.trim(),content=$('adv_content').value.trim();if(!title||!content)return appAlert('Completa el título y la carta ❤️');const unlock=$('adv_unlock_at').value;const {error}=await sb.from('love_letters').insert({couple_id:couple.id,created_by:user.id,title,content,category:$('adv_category').value,place_id:$('adv_place_id')?.value||null,unlock_at:unlock?new Date(unlock).toISOString():null});if(error)return appAlert(error.message);closeAdvModal();await advLoadAll();}
function openDreamForm(isEdit=false){if(!isEdit)advancedEditState={key:null,id:null};openAdvModal('Nuevo sueño ✨',formShell(input('title','Sueño')+select('category','Categoría',[['viaje','Viaje'],['hogar','Hogar'],['experiencia','Experiencia'],['personal','Personal'],['pareja','Pareja']])+textarea('description','Descripción')+`<div class="advFormGrid">${input('target_date','Fecha objetivo','date')}${input('budget','Presupuesto','number','min="0"')}</div>`,`saveDream()`));}
async function saveDream(){if(advancedEditState.key==='dreams'&&advancedEditState.id)return saveAdvancedEdit();const title=$('adv_title').value.trim();if(!title)return appAlert('Escribe el sueño ❤️');const {error}=await sb.from('dreams').insert({couple_id:couple.id,created_by:user.id,title,description:$('adv_description').value,category:$('adv_category').value,place_id:$('adv_place_id')?.value||null,target_date:$('adv_target_date').value||null,budget:$('adv_budget').value||null});if(error)return appAlert(error.message);closeAdvModal();await advLoadAll();}
function openChallengeForm(isEdit=false){if(!isEdit)advancedEditState={key:null,id:null};openAdvModal('Nuevo reto 🎯',formShell(input('title','Nombre del reto')+textarea('description','Descripción','¿Qué tienen que hacer?')+`<div class="advFormGrid">${input('start_date','Desde','date')}${input('end_date','Hasta','date')}</div>`+input('points','Puntos','number','value="10" min="1"'),`saveChallenge()`));}
async function saveChallenge(){if(advancedEditState.key==='challenges'&&advancedEditState.id)return saveAdvancedEdit();const title=$('adv_title').value.trim();if(!title)return appAlert('Escribe el nombre del reto');const {error}=await sb.from('challenges').insert({couple_id:couple.id,created_by:user.id,title,description:$('adv_description').value,place_id:$('adv_place_id')?.value||null,start_date:$('adv_start_date').value||null,end_date:$('adv_end_date').value||null,points:Number($('adv_points').value||10)});if(error)return appAlert(error.message);closeAdvModal();await advLoadAll();}
function openDateForm(isEdit=false){if(!isEdit)advancedEditState={key:null,id:null};openAdvModal('Nueva fecha importante 📅',formShell(input('title','Nombre')+`<div class="advFormGrid">${input('event_date','Fecha','date')}${select('category','Categoría',[['especial','Especial'],['aniversario','Aniversario'],['cumpleanos','Cumpleaños'],['viaje','Viaje'],['familia','Familia']])}</div>`+textarea('description','Descripción')+select('recurrence_type','Repetición',[['none','No se repite'],['monthly','Cada mes'],['yearly','Cada año']])+input('recurrence_interval','Cada cuántos periodos','number','min="1" max="12" value="1"'),`saveDate()`));}
async function saveDate(){if(advancedEditState.key==='dates'&&advancedEditState.id)return saveAdvancedEdit();const title=$('adv_title').value.trim(),eventDate=$('adv_event_date').value,recurrenceType=$('adv_recurrence_type').value||'none',recurrenceInterval=Math.max(1,Number($('adv_recurrence_interval').value||1));if(!title)return appAlert('Escribe el nombre');if(!eventDate)return appAlert('Selecciona una fecha');const {error}=await sb.from('important_dates').insert({couple_id:couple.id,created_by:user.id,title,event_date:eventDate,category:$('adv_category').value,description:$('adv_description').value,place_id:$('adv_place_id')?.value||null,recurring:recurrenceType!=='none',recurrence_type:recurrenceType,recurrence_interval:recurrenceInterval});if(error)return appAlert(error.message);closeAdvModal();await advLoadAll();render();}
function openGoalForm(isEdit=false){if(!isEdit)advancedEditState={key:null,id:null};openAdvModal('Nueva meta 💰',formShell(input('title','Meta')+textarea('description','Descripción')+`<div class="advFormGrid">${input('target_amount','Monto objetivo','number','min="0"')}${input('target_date','Fecha objetivo','date')}</div>`,`saveGoal()`));}
async function saveGoal(){if(advancedEditState.key==='goals'&&advancedEditState.id)return saveAdvancedEdit();const title=$('adv_title').value.trim();if(!title)return moneyFormError('Escribe el nombre de la meta.');const target=$('adv_target_amount').value;if(target!==''&&(!Number.isFinite(Number(target))||Number(target)<0))return moneyFormError('El monto objetivo debe ser cero o un valor positivo.');const {error}=await sb.from('goals').insert({couple_id:couple.id,created_by:user.id,title,description:$('adv_description').value,place_id:$('adv_place_id')?.value||null,target_amount:target||null,target_date:$('adv_target_date').value||null});if(error)return moneyFormError('No se pudo guardar la meta: '+error.message);closeAdvModal();await advLoadAll();showAppToast('Meta guardada ❤️');}
function openPlaceForm(isEdit=false){if(!isEdit)advancedEditState={key:null,id:null};openAdvModal('Nuevo lugar 📍',formShell(input('title','Nombre del lugar')+textarea('description','Qué significa para ustedes')+`<div class="advFormGrid">${input('address','Dirección')}${input('visit_date','Fecha','date')}</div>`+`<div class="advFormGrid">${input('latitude','Latitud','number','step="any"')}${input('longitude','Longitud','number','step="any"')}</div>`+select('category','Categoría',[['especial','Especial'],['cita','Cita'],['viaje','Viaje'],['restaurante','Restaurante'],['hogar','Hogar']]),`savePlace()`));}
async function savePlace(){if(advancedEditState.key==='places'&&advancedEditState.id)return saveAdvancedEdit();const title=$('adv_title').value.trim();if(!title)return appAlert('Escribe el nombre del lugar');const {error}=await sb.from('places').insert({couple_id:couple.id,created_by:user.id,name:title,description:$('adv_description').value,address:$('adv_address').value,visit_date:$('adv_visit_date').value||null,latitude:$('adv_latitude').value||null,longitude:$('adv_longitude').value||null,category:$('adv_category').value});if(error)return appAlert(error.message);closeAdvModal();await advLoadAll();}
function openIdeaForm(isEdit=false){if(!isEdit)advancedEditState={key:null,id:null};openAdvModal('Nueva idea 🎲',formShell(input('title','Actividad')+textarea('description','Descripción')+`<div class="advFormGrid">${select('category','Categoría',[['cita','Cita'],['casa','En casa'],['aventura','Aventura'],['comida','Comida'],['romantico','Romántico']])}${input('estimated_budget','Presupuesto aproximado','number','min="0"')}</div>`,`saveIdea()`));}
async function saveIdea(){if(advancedEditState.key==='ideas'&&advancedEditState.id)return saveAdvancedEdit();const title=$('adv_title').value.trim();if(!title)return appAlert('Escribe la actividad');const {error}=await sb.from('activity_ideas').insert({couple_id:couple.id,created_by:user.id,title,description:$('adv_description').value,category:$('adv_category').value,place_id:$('adv_place_id')?.value||null,estimated_budget:$('adv_estimated_budget').value||null});if(error)return appAlert(error.message);closeAdvModal();await advLoadAll();}
function openPrivateForm(isEdit=false){if(!isEdit)advancedEditState={key:null,id:null};openAdvModal('Nueva nota privada 🔐',formShell(input('title','Título')+textarea('content','Nota','Solo tú podrás verla.'),`savePrivate()`));}
async function savePrivate(){if(advancedEditState.key==='privateNotes'&&advancedEditState.id)return saveAdvancedEdit();const title=$('adv_title').value.trim(),content=$('adv_content').value.trim();if(!title||!content)return appAlert('Completa la nota');const {error}=await sb.from('private_notes').insert({couple_id:couple.id,user_id:user.id,title,content});if(error)return appAlert(error.message);closeAdvModal();await advLoadAll();}
let advancedEditState={key:null,id:null};
function localDateTimeValue(v){if(!v)return '';const d=new Date(v);if(Number.isNaN(d.getTime()))return '';const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;}
function setAdvField(id,value){const el=$(id);if(el)el.value=value??'';}
function prepareEditButton(){const b=$('#advModalBody .btn.primary');if(b){b.textContent='Guardar cambios ❤️';b.setAttribute('onclick','saveAdvancedEdit()');}}
function openAdvancedEdit(key,id){const x=(advCache[key]||[]).find(i=>i.id===id);if(!x)return appAlert('No encontramos este elemento.');advancedEditState={key,id};const fn={memories:openMemoryForm,letters:openLetterForm,dreams:openDreamForm,challenges:openChallengeForm,dates:openDateForm,goals:openGoalForm,places:openPlaceForm,ideas:openIdeaForm,privateNotes:openPrivateForm}[key];if(!fn)return;fn(true);$('advModalTitle').textContent=({memories:'Editar recuerdo 📸',letters:'Editar carta 💌',dreams:'Editar sueño ✨',challenges:'Editar reto 🎯',dates:'Editar fecha importante 📅',goals:'Editar meta 💰',places:'Editar lugar 📍',ideas:'Editar idea 🎲',privateNotes:'Editar nota privada 🔐'})[key];setAdvField('adv_title',key==='places'?x.name:x.title);setAdvField('adv_description',x.description||'');if(key==='memories'){setAdvField('adv_memory_date',x.memory_date);setAdvField('adv_category',x.category||'momento');setAdvField('adv_location',x.location||'');}else if(key==='letters'){setAdvField('adv_category',x.category||'libre');setAdvField('adv_content',x.content||'');setAdvField('adv_unlock_at',localDateTimeValue(x.unlock_at));}else if(key==='dreams'){setAdvField('adv_category',x.category||'viaje');setAdvField('adv_target_date',x.target_date||'');setAdvField('adv_budget',x.budget??'');}else if(key==='challenges'){setAdvField('adv_start_date',x.start_date||'');setAdvField('adv_end_date',x.end_date||'');setAdvField('adv_points',x.points||10);}else if(key==='dates'){setAdvField('adv_event_date',x.event_date);setAdvField('adv_category',x.category||'especial');setAdvField('adv_recurrence_type',x.recurrence_type||(x.recurring?'yearly':'none'));setAdvField('adv_recurrence_interval',x.recurrence_interval||1);}else if(key==='goals'){setAdvField('adv_target_amount',x.target_amount??'');setAdvField('adv_target_date',x.target_date||'');}else if(key==='places'){setAdvField('adv_address',x.address||'');setAdvField('adv_visit_date',x.visit_date||'');setAdvField('adv_latitude',x.latitude??'');setAdvField('adv_longitude',x.longitude??'');setAdvField('adv_category',x.category||'especial');}else if(key==='ideas'){setAdvField('adv_category',x.category||'cita');setAdvField('adv_estimated_budget',x.estimated_budget??'');}else if(key==='privateNotes'){setAdvField('adv_content',x.content||'');}if(key==='goals'&&!$('#adv_current_amount')){const f=document.createElement('div');f.className='field';f.innerHTML='<label>Ahorrado actualmente</label><input id="adv_current_amount" type="number" min="0">';const form=$('#advModalBody .advForm');if(form)form.insertBefore(f,form.lastElementChild);setAdvField('adv_current_amount',x.current_amount??'');}prepareEditButton();}
async function saveAdvancedEdit(){const {key,id}=advancedEditState;if(!key||!id)return;let patch={};if(key==='memories'){patch={title:$('adv_title').value.trim(),memory_date:$('adv_memory_date').value,category:$('adv_category').value,description:$('adv_description').value,location:(selectedPlaceById($('adv_place_id')?.value)?.name||null),place_id:$('adv_place_id')?.value||null};const f=$('adv_photo')?.files?.[0];if(f){const path=`${couple.id}/memories/${crypto.randomUUID()}-${f.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const up=await sb.storage.from('couple-media').upload(path,f,{upsert:false});if(up.error)return appAlert('No se pudo subir la nueva foto: '+up.error.message);patch.photo_url=path;}}else if(key==='letters'){patch={title:$('adv_title').value.trim(),content:$('adv_content').value.trim(),category:$('adv_category').value,place_id:$('adv_place_id')?.value||null,unlock_at:$('adv_unlock_at').value?new Date($('adv_unlock_at').value).toISOString():null};}else if(key==='dreams'){patch={title:$('adv_title').value.trim(),description:$('adv_description').value,category:$('adv_category').value,place_id:$('adv_place_id')?.value||null,target_date:$('adv_target_date').value||null,budget:$('adv_budget').value||null};}else if(key==='challenges'){patch={title:$('adv_title').value.trim(),description:$('adv_description').value,place_id:$('adv_place_id')?.value||null,start_date:$('adv_start_date').value||null,end_date:$('adv_end_date').value||null,points:Number($('adv_points').value||10)};}else if(key==='dates'){const rt=$('adv_recurrence_type').value||'none';patch={title:$('adv_title').value.trim(),event_date:$('adv_event_date').value,category:$('adv_category').value,description:$('adv_description').value,place_id:$('adv_place_id')?.value||null,recurring:rt!=='none',recurrence_type:rt,recurrence_interval:Math.max(1,Number($('adv_recurrence_interval').value||1))};}else if(key==='goals'){patch={title:$('adv_title').value.trim(),description:$('adv_description').value,place_id:$('adv_place_id')?.value||null,target_amount:$('adv_target_amount').value||null,current_amount:Number($('adv_current_amount')?.value||0),target_date:$('adv_target_date').value||null};}else if(key==='places'){patch={name:$('adv_title').value.trim(),description:$('adv_description').value,address:$('adv_address').value,visit_date:$('adv_visit_date').value||null,latitude:$('adv_latitude').value===''?null:Number($('adv_latitude').value),longitude:$('adv_longitude').value===''?null:Number($('adv_longitude').value),google_maps_url:$('adv_google_maps_url').value.trim()||null,category:$('adv_category').value};}else if(key==='ideas'){patch={title:$('adv_title').value.trim(),description:$('adv_description').value,category:$('adv_category').value,place_id:$('adv_place_id')?.value||null,estimated_budget:$('adv_estimated_budget').value||null};}else if(key==='privateNotes'){patch={title:$('adv_title').value.trim(),content:$('adv_content').value.trim()};}if(!(key==='places'?patch.name:patch.title))return appAlert('El título es obligatorio.');if((key==='letters'||key==='privateNotes')&&!patch.content)return appAlert('El contenido no puede quedar vacío.');const {error}=await sb.from(advTables[key]).update(patch).eq('id',id);if(error)return appAlert('No se pudo guardar: '+error.message);closeAdvModal();advancedEditState={key:null,id:null};await advLoadAll();}

async function toggleLetterLock(id){const letter=advCache.letters.find(x=>x.id===id);if(!letter)return appAlert('No encontramos esta carta.');const nextLocked=!letter.is_locked;const prompt=nextLocked?'¿Bloquear esta carta para evitar que se elimine por accidente?':'¿Desbloquear esta carta? Al desbloquearla podrás eliminarla.';if(!await appConfirm(prompt))return;const {error}=await sb.from('love_letters').update({is_locked:nextLocked}).eq('id',id);if(error)return appAlert('No se pudo '+(nextLocked?'bloquear':'desbloquear')+' la carta: '+error.message);await advLoadAll();}
async function deleteAdvanced(key,id){if(key==='letters'){const letter=advCache.letters.find(x=>x.id===id);if(letter?.is_locked)return appAlert('Esta carta está bloqueada 🔒. Desbloquéala antes de eliminarla.');}if(!await appConfirm('¿Eliminar este elemento?'))return;const {error}=await sb.from(advTables[key]).delete().eq('id',id);if(error)return appAlert(error.message);await advLoadAll();}
async function toggleFavorite(key,id,val){const {error}=await sb.from(advTables[key]).update({favorite:val}).eq('id',id);if(error)return appAlert(error.message);await advLoadAll();}
async function setDreamStatus(id,status){const {error}=await sb.from('dreams').update({status,completed_at:status==='cumplido'?new Date().toISOString():null}).eq('id',id);if(error)return appAlert(error.message);await advLoadAll();}
async function toggleChallenge(id,val){const {error}=await sb.from('challenges').update({completed:val,completed_at:val?new Date().toISOString():null}).eq('id',id);if(error)return appAlert(error.message);await advLoadAll();}
async function toggleGoal(id,val){const {error}=await sb.from('goals').update({completed:val}).eq('id',id);if(error)return appAlert(error.message);await advLoadAll();}
function advanceGoal(id,mode='add'){openGoalMovement(id,mode);}
function randomIdea(){const arr=advCache.ideas;if(!arr.length){openIdeaForm();return;}const x=arr[Math.floor(Math.random()*arr.length)];const box=$('randomIdeaBox');if(box)box.innerHTML=`<div style="font-size:50px">🎲</div><h3>${esc(x.title)}</h3><p>${esc(x.description||'')}</p>${x.estimated_budget?`<div class="advMeta">Presupuesto aproximado: ${money(x.estimated_budget)}</div>`:''}<button class="btn primary" onclick="randomIdea()" style="margin-top:12px">🎲 Otra idea</button>`;sb.from('activity_ideas').update({used_count:(x.used_count||0)+1}).eq('id',x.id);}

let myProfile={user_id:null,display_name:'',avatar_path:null,bio:''};
let coupleProfiles=[];
function defaultDisplayName(){
  const e=(user?.email||'').toLowerCase();
  if(e.includes('anamariagarciazapata3')) return 'Ana María';
  if(e.includes('nickolasmorales82')||e.includes('nickodavid')) return 'Nicolás';
  return (user?.email||'').split('@')[0]||'Usuario';
}
async function loadProfiles(){
  if(!user||!couple)return;
  let {data}=await sb.from('user_profiles').select('*').eq('user_id',user.id).maybeSingle();
  if(!data){
    const {data:created}=await sb.from('user_profiles').upsert({user_id:user.id,display_name:defaultDisplayName()},{onConflict:'user_id'}).select().single();
    data=created;
  }
  myProfile={...myProfile,...(data||{}),display_name:data?.display_name||defaultDisplayName()};
  const {data:members}=await sb.from('couple_members').select('user_id,display_name').eq('couple_id',couple.id);
  const ids=(members||[]).map(x=>x.user_id);
  if(ids.length){const r=await sb.from('user_profiles').select('*').in('user_id',ids);coupleProfiles=r.data||[];}
  const chip=$('profileChipName');if(chip)chip.textContent=myProfile.display_name||defaultDisplayName();
}
async function profileAvatarUrl(path){return signedPhoto(path);}
function activityCountsFor(uid){
  const sources={
    plans:plans||[],
    memories:advCache.memories||[],
    love_letters:advCache.letters||[],
    dreams:advCache.dreams||[],
    challenges:advCache.challenges||[],
    important_dates:advCache.dates||[],
    goals:advCache.goals||[],
    places:advCache.places||[],
    activity_ideas:advCache.ideas||[]
  };
  const out={};
  Object.entries(sources).forEach(([table,rows])=>{out[table]=rows.filter(row=>row.created_by===uid).length;});
  return out;
}
function renderProfileActivitySummary(){
  const target=$('coupleActivitySummary');
  if(!target)return;
  const others=(coupleProfiles||[]).filter(p=>p.user_id!==user?.id);
  target.innerHTML=others.length?others.map(p=>{
    const c=activityCountsFor(p.user_id),n=Object.values(c).reduce((a,b)=>a+b,0);
    return '<div class="advItem"><div><div class="advItemTitle">'+esc(p.display_name||'Tu persona ❤️')+'</div><div class="advMeta">'+c.plans+' planes · '+c.memories+' recuerdos · '+c.love_letters+' cartas · '+n+' aportaciones</div></div></div>';
  }).join(''):'<div class="advEmpty">Aún no hay otro perfil vinculado.</div>';
}
function refreshProfilePanelFromCache(){
  if(!$('profileModal')?.classList.contains('show'))return;
  const name=myProfile.display_name||defaultDisplayName();
  const heading=$('profileDisplayNameHeading');if(heading)heading.textContent=name;
  const nameInput=$('profileName');if(nameInput&&document.activeElement!==nameInput)nameInput.value=name;
  const bioInput=$('profileBio');if(bioInput&&document.activeElement!==bioInput)bioInput.value=myProfile.bio||'';
  const bioText=$('profileBioPreview');if(bioText)bioText.textContent=myProfile.bio||'Sin biografía todavía.';
  const counts=activityCountsFor(user.id),total=Object.values(counts).reduce((a,b)=>a+b,0);
  const values={plans:counts.plans,memories:counts.memories,letters:counts.love_letters,total};
  Object.entries(values).forEach(([key,value])=>{const el=$('profileCount'+key[0].toUpperCase()+key.slice(1));if(el)el.textContent=String(value);});
  renderProfileActivitySummary();
}
function openProfilePanel(){
  if(!user||!couple)return;
  const body=$('profileModalBody'),modal=$('profileModal');
  if(!body||!modal)return;
  const counts=activityCountsFor(user.id),total=Object.values(counts).reduce((a,b)=>a+b,0);
  body.innerHTML=`<div class="profileHero"><img id="profileAvatarPreview" class="profileAvatar" src="pareja.jpeg" alt="Foto de perfil" loading="lazy"><div><h3 id="profileDisplayNameHeading" style="margin:0;color:var(--ink)">${esc(myProfile.display_name||defaultDisplayName())}</h3><p style="margin:5px 0;color:var(--muted)">${esc(user.email||'')}</p><p id="profileBioPreview" style="margin:8px 0 0;color:var(--muted)">${esc(myProfile.bio||'Sin biografía todavía.')}</p></div></div>
  <div class="profileGrid"><div class="profileStat"><strong id="profileCountPlans">${counts.plans}</strong><span>planes creados</span></div><div class="profileStat"><strong id="profileCountMemories">${counts.memories}</strong><span>recuerdos</span></div><div class="profileStat"><strong id="profileCountLetters">${counts.love_letters}</strong><span>cartas</span></div><div class="profileStat"><strong id="profileCountTotal">${total}</strong><span>aportaciones a nuestro espacio</span></div></div>
  <div class="settingsCard" style="margin-top:16px"><h3>👤 Mis datos</h3><div class="advFormGrid"><div class="field"><label>Nombre</label><input id="profileName" value="${esc(myProfile.display_name||'')}"></div><div class="field"><label>Correo</label><input value="${esc(user.email||'')}" disabled></div></div><div class="field"><label>Sobre mí</label><textarea id="profileBio" placeholder="Una frase, apodo o lo que quieras...">${esc(myProfile.bio||'')}</textarea></div><div class="field"><label>Foto de perfil</label><input id="profilePhotoInput" type="file" accept="image/*"></div><div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button class="btn" onclick="changePassword()">🔐 Cambiar contraseña</button><button class="btn primary" onclick="saveMyProfile()">Guardar perfil ❤️</button><button class="btn danger" onclick="logout()">🚪 Cerrar sesión</button></div><div id="profileMsg" class="settingsNote hidden"></div></div>
  <div class="settingsCard" style="margin-top:16px"><h3>👩‍❤️‍👨 Nuestra actividad</h3><div id="coupleActivitySummary" class="advList"><div class="advEmpty">Cargando...</div></div></div>`;
  modal.classList.remove('is-closing');
  modal.classList.add('show');
  renderProfileActivitySummary();
  if(myProfile.user_id!==user.id){
    loadProfiles().then(()=>refreshProfilePanelFromCache()).catch(err=>console.warn('No se pudo actualizar el perfil:',err));
  }
  if(myProfile.avatar_path){
    profileAvatarUrl(myProfile.avatar_path).then(url=>{
      const img=$('profileAvatarPreview');
      if(url&&img&&modal.classList.contains('show'))img.src=url;
    }).catch(()=>{});
  }
}function closeProfilePanel(){const modal=$('profileModal');if(!modal||!modal.classList.contains('show'))return;modal.classList.add('is-closing');window.setTimeout(()=>{if(modal.classList.contains('is-closing'))modal.classList.remove('show','is-closing');},210);}
async function saveMyProfile(){
  const name=$('profileName')?.value.trim()||defaultDisplayName(),bio=$('profileBio')?.value.trim()||null;
  let avatar_path=myProfile.avatar_path; const f=$('profilePhotoInput')?.files?.[0];
  if(f){if(!f.type.startsWith('image/'))return appAlert('Selecciona una imagen válida.');if(f.size>8*1024*1024)return appAlert('La foto debe pesar menos de 8 MB.');const path=`${couple.id}/profiles/${user.id}-${crypto.randomUUID()}-${f.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const up=await sb.storage.from('couple-media').upload(path,f,{upsert:false});if(up.error)return appAlert('No se pudo subir la foto: '+up.error.message);if(avatar_path)await sb.storage.from('couple-media').remove([avatar_path]);avatar_path=path;}
  const {data,error}=await sb.from('user_profiles').upsert({user_id:user.id,display_name:name,bio,avatar_path},{onConflict:'user_id'}).select().single();
  if(error)return appAlert('No se pudo guardar el perfil: '+error.message);myProfile={...myProfile,...data};const chip=$('profileChipName');if(chip)chip.textContent=name;const msg=$('profileMsg');if(msg){msg.textContent='✅ Perfil guardado.';msg.classList.remove('hidden');}await loadProfiles();await renderAdvanced();
}
async function changePassword(){
  const pass = await appPrompt('Escribe tu nueva contraseña (mínimo 6 caracteres):');if(pass===null)return;if(pass.length<6)return appAlert('La contraseña debe tener al menos 6 caracteres.');const {error}=await sb.auth.updateUser({password:pass});if(error)return appAlert('No se pudo cambiar la contraseña: '+error.message);appAlert('✅ Contraseña actualizada correctamente.');
}

async function initAdvanced(){if(!couple)return;await loadProfiles();await advLoadAll();if(!window.advancedRealtime){const tables=['memories','love_letters','dreams','challenges','important_dates','goals','places','activity_ideas','private_notes','couple_settings','shared_expenses','budget_recurring_templates','notifications','daily_answers'];window.advancedRealtime=sb.channel('advanced-live-'+couple.id);tables.forEach(table=>{window.advancedRealtime.on('postgres_changes',{event:'*',schema:'public',table,filter:'couple_id=eq.'+couple.id},payload=>{if(table==='notifications'&&payload.eventType==='INSERT'&&payload.new?.recipient_user_id===user?.id){const note=payload.new;if(document.visibilityState==='visible')showAppToast(note.title||'Nueva notificación de tu pareja ❤️');if('Notification'in window&&Notification.permission==='granted'&&document.visibilityState!=='visible'){navigator.serviceWorker?.ready.then(reg=>reg.showNotification(note.title||'Nuestro Calendario #21',{body:note.body||'Tu pareja compartió algo contigo.',icon:'/icon-192.png',badge:'/icon-192.png',tag:note.id,data:{url:'/?tab='+encodeURIComponent(note.target_tab||'notifications')}})).catch(()=>{});}}advLoadAll();});});window.advancedRealtime.subscribe();}}
$('advModal')?.addEventListener('click',e=>{if(e.target===$('advModal'))closeAdvModal();});$('profileModal')?.addEventListener('click',e=>{if(e.target===$('profileModal'))closeProfilePanel();});


/* Exponer acciones a los botones HTML y evitar problemas de alcance en navegadores */

// Conserva la pestaña elegida al volver al navegador y evita animaciones que parpadeen al reanudar.
window.addEventListener('pagehide',()=>{try{localStorage.setItem('nc21_last_tab',advancedTab);}catch(e){}});
let lastResumeRestoreAt=0;
function restoreLastTabOnResume(){
 if(document.visibilityState!=='visible'||!user||!couple)return;
 const now=Date.now();
 if(now-lastResumeRestoreAt<1500)return;
 lastResumeRestoreAt=now;
 let saved=advancedTab;
 try{saved=localStorage.getItem('nc21_last_tab')||advancedTab;}catch(e){}
 if(!validAdvancedTabs.has(saved)||saved===advancedTab)return;
 suppressTabAnimation=true;
 document.body.classList.add('nc-resume-no-flash');
 showAdvancedTab(saved,{skipScroll:true});
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  document.body.classList.remove('nc-resume-no-flash');
  suppressTabAnimation=false;
 }));
}
window.addEventListener('pageshow',restoreLastTabOnResume);
document.addEventListener('visibilitychange',restoreLastTabOnResume);

Object.assign(window,{showAdvancedTab,openQuickCreate,openMemoryForm,openLetterForm,openDreamForm,openChallengeForm,openDateForm,openGoalForm,openPlaceForm,openIdeaForm,openPrivateForm,openAdvancedEdit,saveAdvancedEdit,saveMemory,saveLetter,saveDream,saveChallenge,saveDate,saveGoal,savePlace,saveIdea,savePrivate,deleteAdvanced,toggleFavorite,setDreamStatus,toggleChallenge,toggleGoal,advanceGoal,randomIdea,selectTheme,previewAccent,saveSettingsFromUI,useDefaultCouplePhoto,uploadCouplePhoto,openProfilePanel,closeProfilePanel,saveMyProfile,changePassword,openMemoryPhoto,closeMemoryPhoto,openExpenseForm,saveExpense,deleteExpense,changeBudgetMonth,setBudgetMonth,openRecurringForm,saveRecurringTemplate,toggleRecurringTemplate,saveDailyAnswer,markNotificationRead,markAllNotificationsRead,openNotificationTarget,enableBrowserNotifications,installCalendarApp});

/* =====================================================
   INICIO
===================================================== */

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});

window.addEventListener('error', e => {
  console.error('Nuestro Calendario #21:', e.error || e.message);
});

window.addEventListener('load',init);
window.addEventListener('focus',checkLocalReminders);
setInterval(checkLocalReminders,60000);


let appDialogResolver=null,appDialogMode='alert';
function appDialogClose(value){const el=$('appDialog');if(!el)return;if(!el.classList.contains('show'))return;el.classList.add('is-closing');window.setTimeout(()=>{if(el.classList.contains('is-closing'))el.classList.remove('show','is-closing');},210);const resolve=appDialogResolver;appDialogResolver=null;if(resolve)resolve(value);}
function appDialogSubmit(){if(appDialogMode==='prompt'){const input=$('appDialogInput');const value=input?.value??'';appDialogClose(value);}else if(appDialogMode==='confirm'){appDialogClose(true);}else appDialogClose(true);}
function appDialogOpen({title='Nuestro espacio ❤️',message='',mode='alert',label='Continuar ❤️',inputLabel='Respuesta',defaultValue='',placeholder='',icon='♡',danger=false}){return new Promise(resolve=>{if(appDialogResolver)appDialogClose(null);$('appDialog').classList.remove('is-closing');appDialogResolver=resolve;appDialogMode=mode;$('appDialogTitle').textContent=title;$('appDialogMessage').textContent=String(message??'');$('appDialogIcon').textContent=icon;$('appDialogInputWrap').hidden=mode!=='prompt';$('appDialogInputLabel').textContent=inputLabel;$('appDialogInput').value=defaultValue;$('appDialogInput').placeholder=placeholder;$('appDialogError').hidden=true;$('appDialogCancel').hidden=mode==='alert';$('appDialogOk').textContent=label;$('appDialogOk').className='btn '+(danger?'danger':'primary');$('appDialog').classList.add('show');requestAnimationFrame(()=>{if(mode==='prompt')$('appDialogInput').focus();else $('appDialogOk').focus();});});}
function appAlert(message,title='Nuestro espacio ❤️'){return appDialogOpen({title,message,mode:'alert',label:'Entendido ❤️',icon:'💗'});}
function appConfirm(message,title='¿Confirmamos?',danger=true){return appDialogOpen({title,message,mode:'confirm',label:danger?'Sí, continuar':'Confirmar ❤️',icon:danger?'🩷':'💗',danger});}
function appPrompt(message,title='Un dato para nosotros',defaultValue='',inputLabel='Respuesta',placeholder=''){return appDialogOpen({title,message,mode:'prompt',label:'Guardar ❤️',inputLabel,defaultValue,placeholder,icon:'💌'});}
