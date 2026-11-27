# Estado de Nuestro Calendario #21

Actualizado: 17 de noviembre de 2026, Colombia.

## Fuentes que deben verificarse al retomar

- Repositorio: https://github.com/KiVayCa/nuestro-calendario-21 (rama principal `main`).
- Web: https://nuestrocalendario21.vercel.app.
- Versión Android realmente publicada: descriptor `/android-release.json`; no deducirla únicamente de Gradle.
- Vercel: proyecto `nuestro_calendario_21`, enlazado a este repositorio.
- Supabase producción `vmvfcdtohzdhqatxhxdb`; TEST `jjxtugzzvtigmjcqnofq`.

## Funciones existentes

Calendario con recurrencias y estado por fecha, cancelación visible y reprogramación individual; recordatorios personales y pendientes por plan; álbum por salida; recuerdos, cartas, sueños, retos, metas con movimientos y proyecciones, presupuesto, lugares, ideas, pregunta diaria, análisis con gráficas y detalle, resumen semanal/mensual y cuenta regresiva compartida.

Android reutiliza la web mediante TWA. Cinco widgets: próximo plan, cuenta regresiva, calendario mensual, historia y semana. Fechas: juntos desde 2026-01-21; novios desde 2026-04-21. Actualizador de APK con tamaño/hash/paquete/versión/firma verificados, permiso y confirmación del instalador Android.

## Entrega de widgets v4

- Calendario mensual con títulos por día, más eventos al ampliar, indicador de eventos adicionales y resumen del día seleccionado. Tocar un título abre el registro y fecha correspondientes.
- Paletas generadas desde `styles.css`: 34 temas. Opción predeterminada «Igual que la app»; texto contrastado tanto en temas claros como oscuros. Regeneración: `node scripts/build-widget-themes.mjs` (también la ejecuta el build web).
- Vínculo desde ⚙ → «Vincular desde la app · sin contraseña»: aprobación con la cuenta abierta, código de un uso de 90 segundos, prueba criptográfica del dispositivo y permiso de lectura de 90 días. No se exportan tokens de sesión web. Se puede revocar desde Configuración → Widgets vinculados; retirada de membresía también corta futuras lecturas.
- Sigue funcionando el acceso antiguo por correo como alternativa. Al revincular se revoca el permiso anterior cuando hay conexión.
- Sincronización automática al abrir la app, periódica solicitada cada 15 minutos por WorkManager y botón ↻. Android puede retrasarla; no hay push nativo de cambios ni tiempo real continuo. La revocación se detecta al sincronizar; caché privada cifrada se oculta tras 24 horas sin validación al redibujar.

## Verificación y publicación

Web compilada y 17 pruebas aprobadas; Android: 20 pruebas JVM, lintDebug y assembleRelease aprobados. Contraste principal/eventos verificado en las 34 paletas. Prueba SQL en TEST aprobada para proof/state, código de un uso, aislamiento de pareja, caducidad, RLS, retirada de membresía y revocación.
Migración aplicada también a producción y verificadas las restricciones de acceso y el rechazo de códigos/tokens inválidos.
APK v4 firmado y alojado con descarga/hash verificados: https://vz4dp1vu2kie6kny.public.blob.vercel-storage.com/android/nuestro-calendario-21-v4.apk.
SHA-256: `228eb43e64fd31ced0c7af5bb252280deb823aae6a4d07f5050249667251af50` (4.055.743 bytes).
El descriptor de esta entrega anuncia v4. Comprobar que producción sirve ese descriptor y el commit de esta entrega antes de asumir que el despliegue terminó.
Migración: `supabase/migrations/20261117230000_widget_link.sql`.

## Pendientes de aceptación

Comprobar en los teléfonos de Nicolás y Ana: instalación encima de v3, vínculo con sesión existente, apertura de planes desde widgets, tamaño/legibilidad del calendario, cambio de tema y sincronización con ahorro de batería. Las pruebas automatizadas no sustituyen esta aceptación.
Siguen pendientes de anteriores entregas: recepción push real en ambos celulares y restauración de base de datos/fotos desde respaldo en un entorno de prueba.

## Decisiones del usuario

Aplicación privada de pareja; evitar convertir los gastos en deudas entre los dos. Mantener instalación por APK y actualizaciones ofrecidas dentro de la app. Ideas para citas y rutinas compartidas fueron elegidas; verificar implementación real antes de prometer desarrollos pendientes. No se debe asumir que una función mencionada como propuesta ya existe.

## Retomar desde otro chat

Indicación breve recomendada: «Continúa Nuestro Calendario #21. Lee AGENTS.md y docs/PROJECT_STATE.md del repositorio; verifica main y la versión publicada antes de editar. La nueva tarea es: …».
El historial del chat ayuda con decisiones; Git y este archivo conservan el estado técnico verificable. Actualizar este documento con cada entrega.

## Android v5 en pruebas

Los cinco proveedores se crean sin actividad de configuración. Al abrir la aplicación, un canal postMessage de la TWA validado con Digital Asset Links autoriza la lectura desde la sesión activa mediante el intercambio de un solo uso. La v4 conserva el vínculo manual. Un dispositivo desconectado o revocado no se vincula otra vez de forma automática. Pendiente prueba de instalación release y aceptación en teléfono. El descriptor público sigue en v4.

Validación de la v5: build web y 19 pruebas aprobadas. GitHub Actions completó pruebas JVM, lintDebug, assembleDebug y assembleRelease. El APK release se firmó y se verificó con el certificado de la v4. Pendientes publicación coordinada de web y APK, y aceptación en dispositivo.

Publicación v5: APK firmado de 4.106.190 bytes, SHA-256 bc47a04e5caff89b336835c4e0045d749da64098b3c39eb3059902d8bc453acb. El descriptor adjunto anuncia v5. La web comprueba la versión al cargar y al volver al primer plano y distingue actualización disponible, versión actual y fallo de conexión. Build web y 20 pruebas aprobadas. Verificar producción tras el despliegue y los widgets en dispositivo.

## Corrección de Android v6

Chrome entrega primero el puerto y envía el desafío después por ese canal. El calendario escucha ambos pasos. La actividad que abre el navegador conserva la conexión durante la sesión y recurre al inicio normal si el navegador no está disponible. Pendiente validar arranque y vínculo automático en Android físico.

El descriptor anuncia la v6 con APK firmado y SHA-256 verificado. Pasaron las 20 pruebas web y las pruebas unitarias, lint y compilación de Android en GitHub Actions (ejecución 44315850054). Queda pendiente validar la apertura y el vínculo automático en los teléfonos.

## Reacciones en Cartas

Cada persona puede elegir, cambiar o quitar su reacción en una carta abierta. Los dos ven los conteos. Se incorporó la migración original de TEST y se añadieron controles de apertura y una prueba SQL de permisos.

## Android v7 RC2 · canal de actualización

El descriptor anuncia la v7 RC2 (`1.0.0-preview.7`) para probar el arranque desde el icono. El APK alojado tiene 4.102.038 bytes y SHA-256 `24cc328ed1b37c453ad3172cd3ddb0072dd72d75c7ad38e24c77a0e35e69f433`. Se verificaron la descarga, la firma existente y el paquete. Queda pendiente confirmar la apertura y el resultado de Play Protect en el Motorola. Este cambio activa el descriptor del APK RC2 ya alojado.

Nicolás confirmó en su teléfono que la RC2 abre desde el icono y que Play Protect dejó de mostrar el aviso.

## Apertura de avisos push

Al tocar un aviso, el service worker prioriza una instancia abierta desde el APK y conserva la información de versión al abrir el destino. Si la instancia ya se cerró, el navegador decide dónde abrir el enlace web. Pendiente comprobar la apertura en el teléfono con la app en segundo plano y estudiar el arranque en frío.

## Android v8 · registro de teléfonos en preparación

La configuración de Android ofrece vincular y revocar teléfonos para avisos. El vínculo requiere permiso Android, una cuenta autenticada en la web y un código de un uso de 90 segundos ligado a un verificador privado del teléfono. El permiso de envío dura 90 días. La migración y las funciones de envío con FCM están en revisión y requieren validación. No se han registrado teléfonos reales con este cambio. El descriptor público sigue ofreciendo v7. Pasaron las 21 pruebas web. La compilación local de Android se detuvo al descargar Gradle por un fallo de red. Quedan pendientes la prueba en TEST, la firma, el despliegue y la prueba de apertura desde una notificación con la app cerrada.
## Instalación en Configuración

Se retiró la tarjeta «Instalar en este dispositivo». «Aplicación Android y widgets» sigue disponible para instalar y consultar actualizaciones del APK.

La migración se aplicó en TEST. Una prueba SQL con reversión verificó el vínculo válido, el rechazo de un verificador ajeno, el rechazo de un código reutilizado y la protección del token FCM frente al rol autenticado.

GitHub Actions completó la compilación Android de la primera revisión (44381359810). Para generar un APK con Firebase configurado, el flujo lee el secreto de GitHub Actions `FIREBASE_ANDROID_CONFIG` con el contenido de `google-services.json`. La cuenta de servicio de FCM permanece en Supabase.

## Canal de publicación de APK

El flujo `publish-android.yml` prepara el APK y el descriptor desde ramas
`release/android-v<N>`. Requiere configurar en GitHub Actions el respaldo de
firma y el acceso de escritura al almacén Blob actual. La v7 sigue anunciada
en producción mientras se valida la primera publicación automatizada.

GitHub Actions validó la primera publicación automatizada en la ejecución 44387420011. El APK v8 quedó alojado en el mismo Blob que la v7. Se verificaron la descarga de 5.413.570 bytes, el SHA-256 `4abc5f8e563aa820cbe3d51689b370a0e634dd0272cdd5c9b29a7322440a1719` y el certificado existente. El descriptor verificado está disponible como artefacto de la ejecución. El actualizador sigue anunciando v7 hasta activar el registro y el envío de notificaciones en producción.

La entrega de v8 incorpora el descriptor verificado al sitio de producción.
Registro y funciones push desplegados en Supabase producción.
Pendiente validar en los teléfonos el vínculo y la apertura desde un aviso
con el calendario fuera de Recientes.

## Retirada de Android v8

Se restauró v7 en producción tras el reporte de cierre al abrir v8 y el aviso de Play Protect. Se verificó el descriptor público. La rama `release/android-v9` prepara la corrección del lanzador y elimina el permiso de instalación de paquetes.

Nicolás confirmó que la v9 de prueba corrigió el problema reportado.
La lista de teléfonos vinculados retira el indicador de carga al mostrar
resultados y permite asignar un nombre a cada teléfono. Los vínculos existentes
conservan su vencimiento de 90 días. Se probó el cambio web (21 pruebas) y se
aplicó la migración de nombres en TEST y producción.

## Cartas, vínculo anual y temas de widget

Los vínculos activos de avisos se amplían a un año desde el último registro.
El proceso de recordatorios intenta enviar un aviso nativo durante los siete
días anteriores al vencimiento y registra la entrega aceptada por FCM.
Las cartas admiten fondos, formato básico sanitizado y audio privado. Una
carta programada conserva bloqueados el texto y el audio para su destinatario
hasta la fecha de apertura. Los widgets de Android v10 usan un color de fondo
visible en las paletas claras. La prueba de Android físico queda pendiente.

Se desplegaron Cartas y el vínculo anual en producción. GitHub Actions compiló, firmó y alojó el APK v10 en la ejecución 44393155987. Se verificó la descarga, la firma y el descriptor antes de publicar la actualización. Falta aceptación en teléfonos reales.

Las reacciones de Cartas se muestran en un selector plegado por defecto, con la reacción propia y el total visibles en su resumen.

La edición del nombre de un teléfono se hace dentro de la lista, con confirmación al guardar. El guardado usa una función que solo actualiza el nombre de un dispositivo de la cuenta autenticada. Verificados el guardado y el aislamiento en TEST y las 21 pruebas web.

El total del selector de reacciones cuenta únicamente emojis activos, incluidas las cartas con registros de reacciones retiradas.

Cartas incorpora la tipografía manuscrita del dispositivo y seis fondos con
motivos diferenciados. Android v11 refuerza el color de fondo de los temas
claros de widgets y conserva los fondos oscuros. Pendiente prueba visual en
el Motorola.

Se verificaron la firma y la descarga de la v11 generada en la ejecución 44396524319. El descriptor de esta entrega anuncia la v11.

Cartas añade cinco fuentes manuscritas y seis fondos. El color del papel se
aplica también al texto interno del editor. Los comandos de formato conservan
el tipo de letra al alternar negrita o cursiva. El servidor rechaza cambios al
contenido de cartas bloqueadas hasta que se desbloqueen.

Los avisos Web Push se limitan a navegadores de escritorio. Al iniciar sesión
desde un teléfono se cancela su suscripción web local si existe. Las
notificaciones nativas de Android usan un icono monocromo de corazón en v12.

Se desplegaron las dos funciones push en TEST y producción. Las 21 pruebas web pasaron y se verificaron firma, descarga e icono del APK v12 generado por la ejecución 44401152204. Pendiente prueba de entrega en el Motorola.

El aviso de actualización Android usa los colores de superficie y texto del
tema activo. Pacifico reemplaza la opción Manuscrita del selector. Los textos
guardados con la manuscrita anterior conservan su formato.

La sección de recurrencia del editor de planes usa los colores del tema
activo, incluidos el fondo del aviso y los días de la semana.

El calendario avisa a la otra persona al añadir o asignar un pendiente, así
como al completarlo, reabrirlo o eliminarlo. También avisa si se completa,
reabre, cancela, reactiva o mueve una fecha de un plan. El enlace conserva la
fecha exacta de la ocurrencia. Se verificaron el destinatario y la fecha en
TEST y pasaron las 21 pruebas web.

Las fechas importantes requieren nombre y fecha antes del guardado. Los
diálogos de validación quedan accesibles aunque haya un guardado pendiente.
La pregunta diaria usa la fecha de Bogotá, una respuesta por persona y una
edición explícita. El servidor guarda el antes, el después y la fecha de cada
edición. Se verificaron la interfaz, la unicidad y el historial en TEST.
## Android v13 · sincronización de widgets

Se solicita trabajo prioritario al tocar refrescar; una nueva solicitud reemplaza
la anterior pendiente. Al guardar un cambio de apariencia, la web solicita una
señal FCM silenciosa a los teléfonos registrados de ambos miembros. Es una señal
sin datos privados; cada widget sigue consultando su permiso de lectura vigente.
Se solicita actualización también al recibir avisos nativos. Se conserva la
sincronización periódica para dispositivos sin FCM o con entrega demorada por Android.
CI 45033354541 completó las 22 pruebas web, pruebas JVM, lint y compilación release. La firma coincide con v12 y se verificaron la descarga, tamaño y SHA-256. La función FCM se desplegó en TEST y producción; en ambos rechaza solicitudes sin sesión. El descriptor de esta entrega anuncia v13. Se verificó el descriptor público de producción anunciando v13. Pendiente comprobar la sincronización automática y manual en los teléfonos de Nicolás y Ana.
## Android v14 · colección y previsualización de widgets

Se amplía de cinco a ocho tarjetas: Nuestro día muestra los eventos de hoy,
incluidas fechas importantes y planes realizados; Próxima fecha especial muestra
la cuenta regresiva de la siguiente fecha importante recurrente o individual;
Balance del mes cuenta ocurrencias de planes realizadas y pendientes, sin contar
cancelaciones o fechas reprogramadas. Se reutilizan la sesión de lectura y la
sincronización de v13. No se amplían las autorizaciones de lectura.
Cada proveedor cuenta con una vista de ejemplo propia (`previewLayout`) y una
imagen PNG de respaldo (`previewImage`) para otros lanzadores. Son datos ficticios
en la paleta Romance; los widgets colocados usan sus datos y el tema activo.
Regenerar con `python scripts/build-widget-previews.py` (Pillow). Pasaron 22
pruebas web. CI 45034359196 completó pruebas JVM, lint, compilación release, firma y alojamiento. Se comprobó firma idéntica a v13, descarga, SHA-256, tamaño y versión del APK. El descriptor anuncia v14; se verificó el descriptor público de producción anunciando v14. Pendiente aceptación de las vistas previas y datos reales en el Motorola.
## Categorías de planes del calendario

Se amplía el selector de 6 a 22 categorías, agrupadas en Momentos juntos,
Experiencias y Vida compartida. Los iconos y nombres se centralizan en
`src/utils.js`; se conservan las claves anteriores. El calendario mensual
permite filtrar por categoría (sin filtro muestra todos los eventos).
La restricción `plans_category_check` se amplió en TEST y producción,
con migración registrada en ambos entornos. Una prueba transaccional en TEST
guardó las 22 categorías con rol autenticado y editó una de ellas; se revirtió
la prueba. Pasaron 22 pruebas web, incluida creación, edición y filtro.
No requiere otro APK; se mantiene Android v14. Se verificó en producción el selector y las nuevas categorías del bundle.
## Sincronización automática de planes en widgets

Confirmado por Nicolás: el cambio de temas de v13 funciona automáticamente.
Se reutiliza esa señal FCM silenciosa al crear, editar, eliminar, completar,
reabrir, cancelar, reactivar o reprogramar un plan. La solicitud se envía a
los dispositivos vigentes de ambos miembros tras registrar el aviso de calendario,
independientemente del envío visible. El servidor valida la sesión, pertenencia
y el aviso reciente del actor y admite únicamente los ocho tipos de evento.
El mecanismo de temas permanece intacto. La función se desplegó en TEST y
producción; 23 pruebas web pasaron, incluida la cobertura de los ocho eventos.
No requiere APK nuevo. Se verificó el bundle público de producción; pendiente confirmar entrega en ambos celulares.
## Calendario · navegación mensual y festivos de Colombia

Encabezado vertical: agregar plan, filtro, mes/año centrado seleccionable y
controles anterior/Hoy/siguiente centrados. El selector permite saltar a mes y
año (1984–2199). Las flechas conservan el mes correcto incluso desde el día 31.
Domingos y festivos resaltan sus números con la paleta activa; los festivos
incluyen nombre y no son planes ni desaparecen al aplicar filtros.
El calendario calcula fechas fijas, traslados al lunes y Semana Santa según la
Ley 51 de 1983 y el artículo 6 de la Ley 2578 de 2026 (Virgen de Chiquinquirá).
Fuentes normativas: https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=4954
y https://lector.ramajudicial.gov.co/SIDN/NORMATIVA/TEXTOS_COMPLETOS/7_LEYES/LEYES%202026/Ley%202578%20de%202026.pdf.
Se verificaron ejemplos 2026–2030, 24 pruebas web y selector/estilos de fuentes.
La comprobación visual en Chromium local no fue posible por restricciones de
ejecución; pendiente aceptación en teléfonos. Se verificaron HTML, JS y CSS publicados en producción.
No requiere nuevo APK: se mantiene v14.
## Selector nativo de mes y año

El título centrado del calendario activa un `input type=month` mediante
`showPicker`, sin formulario propio. Se usa `type=date` como alternativa nativa
si el navegador no admite meses, y se ignora el día elegido. El cambio navega
al mes seleccionado y las flechas/Hoy mantienen el valor sincronizado.
Pasaron 24 pruebas web, incluida la selección y la alternativa. Pendiente
comprobar el diálogo nativo en el Motorola. HTML y JS del cambio verificados en producción. Se mantiene v14.
## Calendario · espacio móvil y orientación horizontal

Agregar plan y filtro comparten una fila compacta, con etiqueta accesible sin
ocupar espacio adicional. Mes/año nativo y anterior/Hoy/siguiente permanecen
centrados. La cuadrícula usa siempre siete columnas de ancho igual y limita
el texto largo. En móviles (incluidos los horizontales que superan 800 px),
el calendario ocupa todo el ancho y la tarjeta de próximo plan queda debajo;
se reducen márgenes y rellenos, se respetan zonas seguras y se conserva scroll
vertical en vez de forzar el mes a una pantalla de poca altura.
Pasaron 25 pruebas web, incluida estructura de 42 celdas y reglas responsive.
HTML y CSS verificados en producción. Pendiente comprobar visualmente la rotación en el Motorola.
Se mantiene APK v14.

## Nuestro vínculo · fase 1

Nueva pestaña compartida: corazón, abrazo, pienso en ti, seis estados de ánimo
y buzón de cumplidos con historial reciente. Realtime sincroniza el contenido
sin recargar la página. Los avisos push contienen texto genérico, no el estado
ni el cumplido privado, y abren el módulo. La tabla couple_connection aplica
RLS de pertenencia y solo permite insertar como el usuario autenticado.
El nuevo widget Android v15 abre el módulo autenticado para enviar un gesto
con un toque adicional; no amplía las credenciales de lectura de widgets.
Prueba SQL de aislamiento, identidad y validación superada en TEST.
Migración y función de avisos desplegadas en TEST y producción. Web en
producción verificada. APK v15 compilado con pruebas y lint, firmado con
el certificado anterior y verificado por SHA-256, tamaño y versionCode.
Pendiente confirmar recepción push y apariencia física en ambos teléfonos.
## Calendario · información de festivos y fluidez del editor

Nicolás confirmó que el calendario responsive se ve bien. Los números de
domingos/festivos ahora tienen una insignia circular contrastada con la paleta
activa. Tocar un festivo abre una ficha con nombre, fecha, celebración y botón
para agregar un plan en esa fecha; las 19 celebraciones tienen descripción.
Se conserva la creación directa al tocar días no festivos. Se elimina el
autofoco de inputs al crear/editar planes, se enfoca el encabezado y se limpia
la selección del calendario. Se suprime el resaltado táctil azul solo en las
celdas y se simplifican las animaciones móviles a traslación/opacidad sin blur.
Pasaron 25 pruebas web, incluidas fichas de festivos y ausencia de autofoco.
JS y CSS publicados verificados en producción. Pendiente comprobar fluidez y resaltado en Android físico; APK v14.
## Animaciones de formularios y ventanas

Los seis modales principales comparten entrada de 380 ms con desplazamiento,
escala suave y rebote leve, y salida de 190 ms. Se animan opacidad y transform
sin desenfoque dinámico; se conserva el brillo de la barra de módulos intacto.
Las transiciones de módulos se agilizan sin reiniciar durante actualizaciones
realtime. Se respeta la preferencia de movimiento reducido. Se evita enfocar
campos de escritura al abrir planes, presupuesto y diálogos de texto.
Pasaron 25 pruebas web, incluidas reapertura durante cierre y foco sin teclado.
CSS y JS verificados en producción. Pendiente comprobar visualmente en Android físico.
Se mantiene APK v14.

## Nuestras aventuras · fase 2

Pestaña compartida con ruleta de citas (ideas incorporadas y de la pareja),
experiencias por vivir, sorpresas con detalles privados hasta que su autor
los revele, cupones con canje único por la otra persona y pasaporte con sellos
por experiencia vivida. Las experiencias pueden agendarse o vincularse a un
plan existente y guardar o vincular un recuerdo después de completarse.
Se reutilizan los formularios, temas, Realtime y avisos de la aplicación.
Los detalles privados se almacenan en una tabla separada con RLS; no se
incluyen en los avisos ni en el contenido público de una cita sorpresa.
Se verificó en TEST mediante transacción revertida el aislamiento, revelado,
canje único, estados y vínculos. No necesita APK nuevo: Android v15.
Migración y función de avisos desplegadas en TEST y producción; 27 pruebas
web aprobadas. Pendiente comprobación de entrega push y visual en teléfonos.

## Experiencias y Recuerdos · formulario compartido

Nueva experiencia reutiliza el formulario de Recuerdos con foto y lugar del
mapa, tipo de experiencia y estado por vivir/vivida. Un RPC transaccional
crea y vincula ambos registros; la foto se almacena una sola vez. Los datos
visibles de la experiencia se leen del recuerdo vinculado, incluso al editar
el recuerdo, y los dos módulos ofrecen navegación recíproca. Las experiencias
anteriores pueden crear o vincular un recuerdo también mientras están pendientes.
Las sorpresas privadas conservan sus restricciones. Prueba SQL en TEST de
vínculos, permisos, estado y lugares aprobada con reversión. Sin nuevo APK.
Migración aplicada en TEST y producción. 27 pruebas web superadas, incluido
el recorrido de creación con foto y lugar y navegación en ambos sentidos.

## Nuestra fe · fase 3

Nuevo módulo compartido con 21 lecturas bíblicas rotativas por fecha de Bogotá,
meditaciones originales y preguntas para conversar. Registro diario de lectura
por cada miembro, historial, peticiones de oración con acompañamiento diario
y estado respondida, diario de gratitud y reflexiones. Crea un plan de oración
en el calendario desde el devocional usando el editor existente.
La tabla couple_faith tiene RLS por membresía y edición/borrado solo del autor;
las lecturas y acompañamientos tienen unicidad diaria. Avisos genéricos sin
contenido de las peticiones o del diario. Prueba transaccional de aislamiento,
unicidad y permisos aprobada en TEST. No requiere nuevo APK.
Migración y avisos desplegados en TEST y producción. 28 pruebas web
aprobadas, incluidas las 20 pestañas y creación de una petición.
Pendiente validación visual y de push en los teléfonos.

## Devocionales ampliados

63 estudios originales de pareja, cada uno con pasaje bíblico, enseñanza
en dos párrafos, pregunta de diálogo, práctica concreta y oración escrita.
Incluyen comunicación, perdón, confianza, noviazgo, fidelidad, preparación
matrimonial, hogar, finanzas y vida espiritual. Biblioteca por tres grupos
para consultar cualquier estudio y relectura desde el historial. Se conserva
la asignación por fecha de las 21 lecturas anteriores hasta el 26/11/2026;
desde el 27/11/2026 se recorre el catálogo de 63 sin repeticiones por ciclo.
Los registros de lectura no se reinician al abrir la biblioteca.
Sin cambio en la base de datos ni nueva APK.
28 pruebas web superadas, incluida la biblioteca, el ciclo completo sin
duplicados y la conservación de las fechas registradas.

## Nuestro futuro · fase 4

Nuevo módulo con siete plantillas de proyectos (matrimonio, vivienda, viaje y
luna de miel, familia, fe, crecimiento y otros), fecha objetivo, estado,
checklist de pasos sugeridos o personalizados y porcentaje de avance.
Línea de tiempo ordenada y filtros corto/mediano/largo plazo. Se vinculan
metas de ahorro y sueños existentes, sin duplicar saldos ni movimientos.
Cada paso puede vincularse a un plan existente o agendar uno nuevo con el
formulario original; la fecha vinculada se lee del calendario. Ambos miembros
pueden gestionar los proyectos; eliminar un proyecto no elimina planes,
metas o sueños vinculados. Avisos y sincronización Realtime.
Migración en TEST y producción. Prueba SQL de atomicidad, permisos, vínculos
y conservación de datos aprobada en TEST; 28 pruebas web superadas (21
pestañas, creación, checklist, aporte vinculado y agendamiento).
Sin nuevo APK. Pendiente aceptación visual y recepción push en teléfonos.

## Nuestra historia · fase 5

Se amplía la pestaña Historia existente con una línea de tiempo agrupada por
mes, galería de fotografías, búsqueda, filtros por tipo/mes/favoritos y orden
cronológico. Resumen del capítulo mensual, recuerdos de la misma fecha o día
de otro mes y recuerdo destacado rotativo. Contadores de hitos del 21/01/2026
y 21/04/2026. Acceso directo a la exportación de álbum y collage existente.
Se combinan recuerdos, aventuras vividas, planes completados, fechas,
sueños y retos cumplidos, cartas abiertas. No se repiten planes/aventuras
con recuerdo vinculado ni se muestran cartas bloqueadas o su contenido.
Cada tarjeta abre su módulo y registro original. Realtime y temas conservados.
29 pruebas web aprobadas, incluida deduplicación, privacidad y galería.
No hay nueva tabla ni APK. Pendiente aceptación visual en teléfonos.

## Personalización avanzada · fase 6

Configuración incorpora preferencias individuales sincronizadas por cuenta:
reordenar módulos, ocultar módulos no obligatorios (sin borrar datos), hasta
seis accesos rápidos en Inicio, mostrar u ocultar las siete secciones de Inicio,
espaciado cómodo/compacto, texto normal/grande y reducción de animaciones.
Inicio, Calendario y Configuración permanecen accesibles; el botón ☰ abre todos
los módulos, incluso los ocultos. Los avisos y enlaces siguen abriendo el módulo
destino. Por separado, título y frase de portada compartidos y editables.
Se conservan los 34 temas, las fotos, el efecto normal de la barra y la
sincronización de los widgets; no se cambia la APK v15. RLS restringe la tabla
couple_personalization a la cuenta actual y su pareja autorizada; la portada
se guarda en couple_settings. Migración en TEST y producción, prueba SQL de
aislamiento y guardado aprobada. 30 pruebas web superadas, incluida la edición
de la portada, navegación, accesos y preferencias. Pendiente prueba visual
en teléfonos.

## Integración y encuadre · fase 7

Nuestras aventuras integra ¿Qué hacemos?, ruleta, ideas, experiencias, sorpresas,
cupones y pasaporte. Sueños y metas integra sueños y metas de ahorro, con vínculo
opcional y progreso compartido; Nuestro futuro conserva sus proyectos.
Se mantienen los registros y las rutas antiguas para notificaciones y accesos.
El encuadre reversible de recuerdos, experiencias y portada permite arrastrar,
ampliar y restablecer sin reemplazar la imagen almacenada. Las fotos nuevas de
portada conservan su original. La galería y la historia respetan el encuadre.
Migración aditiva aplicada en TEST y producción; pruebas SQL de aislamiento,
vínculos y conservación aprobadas en TEST. 31 pruebas web aprobadas. Sin nueva
APK; pendiente validación visual en teléfonos.

## Nuestro futuro · alineación de pasos sugeridos

El checkbox de creación de proyecto deja de heredar el ancho de los campos de
texto. Se alinea a la izquierda del texto, con la lista sugerida debajo y
colores del tema. Toda la etiqueta permite activarlo o desactivarlo.
31 pruebas web aprobadas; sin cambios en datos, vínculos ni APK v15.

## Identidad visual unificada · encabezados de módulos

Los módulos anteriores adoptan el encabezado centrado de Nuestro vínculo y
Nuestra fe: icono propio, frase breve, título, descripción, gradiente del tema
y acciones originales. Análisis mantiene su filtro; Sueños y metas usa un
único encabezado principal y subtítulos para sus dos secciones. Calendario
incorpora una variante compacta que conserva los controles, la cuadrícula y
la orientación horizontal. Inicio conserva la portada fotográfica y la barra
de navegación conserva el brillo. 31 pruebas web aprobadas, incluida la
presencia de encabezados en todas las rutas. Sin cambios en datos ni APK v15.

## Conociéndonos · fase 8

Dentro de Nuestro vínculo, 30 conversaciones por relación, gustos, matrimonio
y familia, gratitud y admiración. Cuestionario de ocho situaciones sobre cinco
lenguajes del amor, con resultados orientativos individuales y comparables.
Cada pregunta se responde una vez; solo se revela la respuesta ajena al guardar
la propia. La tabla couple_knowing_answers usa RLS por pareja y respuesta propia,
sin edición ni borrado desde el cliente. Avisos genéricos sin contenido personal;
Realtime, acceso recíproco desde Pregunta diaria y sin cambios en los widgets.
Prueba SQL en TEST de privacidad, revelado bilateral, identidad, unicidad y
validación aprobada. Migración aplicada a TEST y producción. 32 pruebas web
aprobadas. APK v15 intacto; pendiente aceptación visual y push en teléfonos.

## Bancos de preguntas ampliados

365 preguntas diarias (30 originales + 335 nuevas) y 150 conversaciones de
Conociéndonos (30 originales + 120 nuevas en seis categorías). El cuestionario
de lenguajes del amor conserva sus ocho situaciones y resultados existentes.
La pregunta diaria usa el día de Bogotá y el historial compartido: excluye
preguntas respondidas por ambos incluso si se contestaron en fechas distintas,
conserva la respuesta anterior de quien ya respondió y permite contestar solo
a quien falta. Si ya hay una respuesta del día, se mantiene su enunciado.
Cuando se completa el banco se muestra el mensaje de finalización e historial.
Se conservan textos y claves originales, historial de edición, vínculos y
avisos. Sin cambios de esquema ni APK v15. 33 pruebas web aprobadas.

## Conociéndonos en Pregunta diaria

Se traslada desde Nuestro vínculo a Pregunta diaria, conservando las 150
preguntas, sus claves y todas las respuestas. La sección muestra una pregunta
compartida al día (Bogotá); rota categorías, omite las completadas antes de hoy
y mantiene la selección aunque ambos respondan durante el día. Las respuestas
de un solo miembro no cambian la selección ni revelan datos a la pareja.
Historial muestra únicamente preguntas ya respondidas por la cuenta; Lenguajes
del amor sigue disponible por separado. Avisos nuevos y enlaces internos de
avisos anteriores abren Pregunta diaria. 34 pruebas web aprobadas. Sin cambios
de esquema ni APK v15.

## Cuenta regresiva en vivo y estados de ánimo ampliados

Inicio muestra días, horas, minutos y segundos, con actualización de los
números cada segundo sin repintar la página. Fecha sin hora: medianoche de
Bogotá; plan vinculado: hora del plan si existe. Al llegar al objetivo queda
en cero. Historial de detalles separa título y fecha/hora, y Nuestro vínculo
amplía de seis a 24 emociones y ofrece historial plegable de ambos miembros,
por lotes de 30 registros. Se preservan estados y notificaciones existentes.
Restricción ampliada en TEST y producción; prueba SQL de validación y
aislamiento aprobada en TEST; 36 pruebas web aprobadas. Widget sin cambios,
APK v15 intacto.

Selector de ánimo compacto: seis opciones iniciales, botón «··· Más emociones»
para las 18 adicionales, cierre al compartir y estado seleccionado visible
en el resumen. Historial independiente intacto. 37 pruebas web aprobadas.

## Próximas fases

9 Juegos de pareja; 10 Cápsulas del tiempo; 11 Nuestra banda sonora;
12 Nuestro matrimonio; 13 Recuerdos inteligentes; 14 Libro de nuestra vida;
15 Experiencia Android. **Antes de iniciar fase 15, recordar a Nicolás que
quiere revisar y proponer mejoras adicionales de Android.** No iniciar esa
fase sin conversar esos ajustes con él.
