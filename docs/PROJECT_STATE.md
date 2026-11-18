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
