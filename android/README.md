# Nuestro Calendario #21 · Android preview

## Widgets · preview 4

Nuestro mes muestra nombres de planes y fechas especiales en cada día. Al ampliar aparecen hasta tres títulos por día; los adicionales se indican con +N. Tocar el día muestra su resumen; tocar un título abre ese registro en la web.

Los cinco widgets usan las 34 paletas generadas de `styles.css`. Elegir **Igual que la app** para seguir su tema compartido. Al actualizar desde v3 esta opción se activa automáticamente. El cambio llega en la siguiente sincronización.

**⚙ → Vincular desde la app · sin contraseña** abre la web con un desafío criptográfico. Con la sesión abierta solo se aprueba el vínculo y se toca Continuar en Android. Si la sesión web venció hay que iniciar sesión allí. El código dura 90 segundos y es de un uso, ligado a un verificador que no abandona el almacén cifrado nativo. El permiso de dispositivo dura 90 días y permite leer únicamente títulos/fechas/estado de planes, fechas importantes y ajustes de tema/cuenta regresiva. No comparte contraseñas ni sesiones web y no permite escribir datos. Configuración → Widgets vinculados permite revocar permisos; ⚙ → Desconectar también lo intenta en el servidor y siempre limpia los datos locales.

Sincronización automática al abrir la app y mediante WorkManager cada 15 minutos solicitados, además de ↻ manual. No hay sincronización push nativa de cambios; Android puede aplazar los trabajos por batería/Doze. No prometer tiempo real permanente.

La migración `supabase/migrations/20261117230000_widget_link.sql` es necesaria en cada backend que use esta versión. Los RPC de claim/read/revoke son puntos de entrada de capacidades: su ejecución por anon es deliberada y requieren códigos/verificadores o tokens aleatorios de 256 bits. Nunca conceder acceso directo a los hashes. Las alertas de SECURITY DEFINER del asesor deben evaluarse con esta autorización explícita; las pruebas SQL cubren sus límites.

## Actualizaciones desde la app · preview 3

El APK estable está alojado en el almacén público de versiones Android de Vercel Blob. Únicamente se publican instaladores; la sesión, las fotos y los datos de la pareja mantienen su acceso privado en Supabase.

Android → Configuración → **Aplicación Android y widgets** permite descargar el último APK. A partir de preview 3, al entrar desde el icono o un widget se consulta `/android-release.json` y se compara con la versión que devuelve Android PackageManager. Si existe una versión superior, se ofrecen **Actualizar** y **Más tarde**. El calendario continúa abriendo cuando no hay conexión o falla el servidor de versiones. Las versiones 1 y 2 necesitan esta primera actualización manual para incorporar el actualizador.

El actualizador descarga un archivo inmutable por `versionCode`, comprueba tamaño y SHA-256 y valida el paquete, la versión y la firma contra la aplicación instalada. No admite enlaces a otros servidores ni redirecciones. Después abre el instalador oficial: Android solicita permiso para instalar desde esta aplicación y la confirmación del usuario. No hay instalación silenciosa. El FileProvider solo comparte el directorio de caché `updates/`; no expone sesiones ni preferencias. No se desinstala la app ni se borran sus datos.

El acceso directo original `MainActivity` se conserva. La web abierta por Android recibe la versión instalada como parámetro informativo para mostrar un aviso al volver al primer plano y un botón para abrir el actualizador. El parámetro no autoriza descargas ni instalaciones: la comprobación nativa siempre usa PackageManager y la firma del APK. El instalador se ofrece en la web únicamente en dispositivos Android.

### Publicar la siguiente versión

1. Incrementar `versionCode` y `versionName`, compilar y probar `assembleRelease` con la misma firma privada.
2. Actualizar `android/release-notes.json` con las novedades.
3. Con `ANDROID_HOME` y `BLOB_READ_WRITE_TOKEN` disponibles **solo en el entorno de publicación**, ejecutar:

```sh
node scripts/publish-android-release.mjs android/app/build/outputs/apk/release/app-release.apk android/release-notes.json
```

El script verifica certificado y paquete, aloja el APK sin sobrescribir archivos previos, descarga y comprueba el archivo remoto y solo entonces genera `android-release.json`. Impide retroceder de versión o cambiar el binario de una versión ya publicada. El token de escritura no se añade al repositorio, la web ni el APK.

4. Ejecutar el build web y sus pruebas; subir los cambios a Git para que Vercel publique el descriptor. Verificar que la URL pública devuelve la versión esperada y que el APK coincide con su hash. No modificar a mano el descriptor para anunciar un APK que aún no está publicado.

El descriptor usa `Cache-Control: no-store` y queda fuera del service worker. Los APK con nombres por versión se pueden almacenar en caché sin confundir versiones. La primera publicación de preview 3 y una futura actualización real deben verificarse también en el celular: las pruebas de código no sustituyen la confirmación de instalación del sistema.

Android 8.0+ (`minSdk 26`). La interfaz sigue siendo la web publicada; Android Browser Helper la abre como Trusted Web Activity con el navegador compatible del dispositivo. Esto conserva sesiones web, service worker, avisos push y descargas existentes. Si falla la asociación de dominio o el navegador no soporta TWA, puede aparecer la barra del navegador como alternativa segura. No usamos WebView ni un puente que exponga tokens a JavaScript.

## Uso

1. Instalar el APK release firmado entregado para pruebas. Abrir el icono del calendario.
2. Mantener pulsada la pantalla de inicio → Widgets → Nuestro Calendario #21.
3. Arrastrar **Próximo plan**, **Cuenta regresiva**, **Nuestro mes**, **Nuestra historia** o **Nuestra semana** y conectar la misma cuenta del calendario. Esta autenticación de widgets es independiente de la sesión de Chrome: puede requerir iniciar sesión una vez adicional.
4. Elegir marco rosa, noche azul o salvia. El marco y la sesión se comparten entre todos los widgets de la instalación.
5. Tocar el cuerpo para abrir el calendario (el plan abre su fecha y detalle), ↻ para solicitar actualización o ⚙ para cambiar marco/desconectar.

### Novedades de preview 2

- Instalar como actualización del primer APK: mismo paquete y misma firma, `versionCode 2`. No desinstalar la versión anterior; así se conservan sesión y widgets existentes.
- Mantener pulsado un widget y arrastrar los bordes para cambiar tamaño. Se redibuja al cambiar dimensiones y ofrece variantes para orientación vertical/horizontal. En versiones compactas se reducen etiquetas y líneas secundarias para dar prioridad al contenido principal.
- ⚙ → Texto principal: Destacado, Grande o Extra grande. La preferencia se guarda por widget. Los números tienen mayor tamaño que los títulos; los textos secundarios mantienen su tamaño menor. El espacio disponible limita el tamaño máximo.
- **Nuestro mes:** calendario de lunes a domingo con 42 celdas, hoy destacado y puntos en días con planes o fechas importantes. Mantiene planes completados como parte del calendario y omite cancelaciones/reprogramaciones. Flechas para navegar hasta 24 meses hacia cada lado; tocar el nombre del mes vuelve al actual. Tocar un día abre ese mes en la app. No se abre automáticamente el formulario para crear un plan.
- **Nuestra historia:** dos contadores con las mismas fechas de Inicio: juntos desde 21/01/2026 y novios desde 21/04/2026. Días transcurridos según la fecha de Bogotá, sin sumar un día artificialmente. Se recalculan cuando Android actualiza el widget.
- **Nuestra semana:** planes pendientes de hoy y los siguientes seis días, ordenados por fecha/hora, con más filas al ampliar la tarjeta. Omite planes pasados, completados, cancelados y fechas reprogramadas.
- Los nuevos widgets también respetan cifrado, desconexión y validación de acceso de la primera versión. El calendario no muestra información de una caché que supere 24 horas al redibujarse.

La PWA instalada puede coexistir durante la prueba. El icono Android permite usar el mismo calendario sin mantener dos bases de datos. No eliminar ni desactivar todavía las notificaciones de la PWA: validar primero que el navegador usado por la TWA comparte su sesión y suscripción push.

## Datos y actualización

- Consultas HTTPS directas a Supabase con la clave pública obtenida en `/api/config` y el JWT del usuario. Se fija el proyecto de producción esperado; no se usan claves de servicio.
- RLS controla la pertenencia a la pareja. No se modifica ningún plan desde el widget.
- Credenciales de sesión y datos privados cifrados con AES-GCM y una clave de Android Keystore. Contraseña usada únicamente durante login; copias de seguridad Android deshabilitadas.
- Una sesión de widgets por instalación, independiente de la web. Cerrar sesión en la web no desconecta los widgets: usar ⚙ → Desconectar los widgets. La revocación del acceso se valida al sincronizar y los datos guardados se ocultan tras 24 h sin validación.
- Renovación de tokens serializada; peticiones paginadas, timeouts y caché para conexión intermitente. Un error temporal mantiene los últimos datos e indica su hora de sincronización.
- WorkManager solicita refresco cada 15 minutos con conexión; el proveedor Android también solicita actualización cada 30 minutos. Android puede retrasar ambos por batería/Doze. No se promete actualización exacta al minuto ni notificaciones nativas adicionales.
- Próximo plan: mismo horizonte de 730 días y zona `America/Bogota` que la web. Incluye hoy con hora futura, trata planes sin hora como vigentes hasta fin del día y excluye fechas completadas, canceladas o reprogramadas. Recurrencia diaria/semanal/mensual/anual, intervalos, fin de serie y último día del mes.
- Cuenta regresiva: configuración compartida de Inicio, con actualización del título/fecha de planes y fechas importantes vinculadas. La cuenta continúa indicando cuánto hace de la fecha cuando ya pasó.

## Compilación

Instalar JDK 17+, Android SDK 36 y Build Tools 35.0.0. Establecer `ANDROID_HOME` o `android/local.properties`. Compilamos con API 36 y conservamos `targetSdk 35` durante esta primera prueba.

```sh
cd android
./gradlew testDebugUnitTest lintDebug assembleDebug
```

Los APK debug tienen otra firma: pueden mostrar barra del navegador y no actualizan el APK release. Para actualizaciones instalables conservar el respaldo privado de firma y usar:

```sh
export ANDROID_KEYSTORE=/ruta/calendario21-release.jks
export ANDROID_STORE_PASSWORD='contraseña-del-respaldo'
export ANDROID_KEY_PASSWORD='contraseña-del-respaldo'
./gradlew testDebugUnitTest lintDebug assembleRelease
```

No guardar el keystore ni contraseñas en GitHub. La huella pública release en `assetlinks.json` debe coincidir con el certificado del APK. El build web publica ese archivo en `/.well-known/assetlinks.json` para validar la TWA.

CI construye y comprueba un APK de desarrollo sin claves privadas. Para distribuir otra versión release incrementar `versionCode` y firmar con la misma clave.

## Validación pendiente en dispositivos

Antes de sustituir la instalación PWA: comprobar instalación y apertura sin barra de direcciones; ambas cuentas; login y desconexión de widgets; marcos y tamaños; cita hoy y mañana; cancelación/completado/reprogramación; cuenta regresiva y paso de medianoche de Bogotá; modo avión/recuperación; ahorro de batería; descargas PDF/collage y recepción real de push. Las pruebas de JVM y lint no reemplazan estas comprobaciones.
