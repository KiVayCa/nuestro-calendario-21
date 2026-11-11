# Auditoría técnica y de seguridad — 2026-11-10

## Alcance y límites
- Revisión de código `app.js`, `index.html`, `sw.js`, políticas RLS, triggers, funciones `SECURITY DEFINER`, Storage y Edge Function `send-push-notification`.
- Proyecto Supabase revisado en modo lectura.
- No se ejecutaron migraciones en la base de datos, no se desplegaron Edge Functions y no se hizo deploy de frontend.
- No se modificó la lógica de notificaciones porque el usuario confirma que actualmente funciona.

## Cambios preparados en esta rama
### Protección de cartas bloqueadas
Migración `20261110000000_protect_locked_love_letters.sql`:
- Reemplaza la política DELETE de `love_letters`.
- Limita la política a `authenticated`.
- Permite borrar únicamente si el usuario pertenece a la pareja y `is_locked = false`.
- La interfaz ya bloquea la eliminación; esta migración añade el mismo control en la base de datos.

**Pendiente:** probar la migración en un proyecto Supabase aislado antes de aplicarla a producción.

## Hallazgos de seguridad
1. **Políticas RLS con rol `public`:** varias tablas compartidas mantienen políticas `public` con condición `is_couple_member(couple_id)` y, en inserciones, validación de `created_by = auth.uid()`. La función devuelve falso sin usuario autenticado. No se cambiaron en bloque porque se debe verificar el flujo de registro/unión y el comportamiento de cada tabla antes de estrechar roles.
2. **Funciones privilegiadas:** `get_or_create_our_couple()` y `join_couple(...)` son `SECURITY DEFINER` y ejecutables por `authenticated`; esto parece intencional para crear/unirse al espacio y ambas verifican sesión y correo permitido. `is_couple_member(uuid)` también es `SECURITY DEFINER`, ejecutable por `authenticated`, y se usa desde políticas RLS. No revocar permisos sin reemplazar primero su uso en políticas.
3. **Función de notificaciones de actividad:** `create_couple_activity_notification()` es `SECURITY DEFINER` y no está concedida a `authenticated` ni a `PUBLIC`; se ejecuta como trigger. Mantenerla como función interna.
4. **Protección de contraseñas filtradas:** Supabase Advisor reporta desactivada la protección contra contraseñas comprometidas. Revisar y habilitar en Auth Dashboard durante una ventana controlada.
5. **Edge Function push:** requiere JWT, valida al usuario y confirma que actor y destinatario pertenezcan a la pareja. Sin embargo, `test:true` omite la validación de una notificación reciente y permite enviar un push de prueba al otro miembro. El cliente actual la usa para probar el propio dispositivo. Recomendación: limitar el modo test a `recipient_user_id = user.id`, añadir rate limit y no eliminar el flujo actual de prueba hasta tener un reemplazo probado.
6. **Información personal en código:** el fallback de `VAPID_SUBJECT` contiene un correo personal. El valor debería ser obligatorio por variable de entorno y no tener fallback personal en el código.

## Notificaciones — preservar funcionamiento
- Hay triggers de base de datos que insertan notificaciones de actividad en `notifications` para planes, ideas, retos, sueños, metas, fechas, cartas, recuerdos, lugares y gastos.
- El frontend también ejecuta `createPartnerNotification()` para generar mensajes personalizados y solicitar el push.
- Para eventos cubiertos por ambos mecanismos puede haber dos registros en la bandeja (uno genérico por trigger y otro personalizado por frontend). Esto no demuestra que el sistema esté fallando; es un punto a verificar con una prueba controlada de creación de cada tipo.
- Los planes además activan `queue_plan_created_notification()` para insertar en `notification_events`.
- No se cambiaron triggers, Edge Function, Service Worker, tablas ni flujos de notificación.

## Hallazgos de datos y rendimiento
1. **Fotos de recuerdos:** `saveMemory()` almacena en `photo_url` una URL firmada con vencimiento de 365 días. El código también tiene un helper de URL firmada temporal para otros recursos, pero el render de recuerdos utiliza directamente `photo_url`. Conviene migrar a guardar el path de Storage y generar URLs firmadas al mostrar la foto. Antes de hacerlo se requiere migración compatible que convierta URLs existentes a paths y prueba de todas las fotos actuales.
2. **Índices:** Supabase Advisor informa 29 claves foráneas sin índice de cobertura. Deben revisarse contra índices existentes y consultas reales antes de crear índices; no se agregaron índices a ciegas.
3. **Service Worker:** la instalación precachea `pareja.jpeg` junto con recursos esenciales. Si la portada es grande puede retrasar la instalación inicial; evaluar carga diferida y caché separada sin quitar la portada ni afectar el modo offline.
4. **Arquitectura:** `app.js` sigue siendo un archivo monolítico de aproximadamente 166 KB. Modularizar es recomendable, pero debe hacerse por etapas y con pruebas de regresión, no como una reescritura completa.

## Estado de validación
- RLS habilitado en las 23 tablas públicas revisadas en auditoría previa.
- Storage bucket `couple-media`: políticas limitadas a `authenticated` y membresía de pareja.
- Supabase Security Advisor: 3 avisos por funciones `SECURITY DEFINER` ejecutables por usuarios autenticados y 1 aviso de protección contra contraseñas filtradas desactivada.
- Supabase Performance Advisor: 29 avisos de claves foráneas sin índice de cobertura.
- Health Advisor: sin avisos.
- No se pudo confirmar todavía la asociación del proyecto Vercel con el repositorio desde la integración; no se ha iniciado ningún despliegue.

## Plan de trabajo siguiente
1. Crear/identificar un proyecto Supabase de staging y validar la migración de cartas bloqueadas con dos usuarios de prueba.
2. Corregir la exposición del modo `test` del push y retirar el fallback personal de VAPID solo después de verificar variables y probar el flujo actual de notificaciones.
3. Diseñar la migración compatible de fotos de recuerdos, sin perder objetos ni URLs existentes.
4. Revisar las 29 claves foráneas contra los índices actuales y añadir únicamente los índices que falten.
5. Hacer pruebas de regresión en staging: login, unión de pareja, calendario, cartas bloqueadas, recuerdos, Storage, notificaciones in-app, push, PWA y navegación.
6. Resolver el vínculo Vercel/preview y probar allí. Producción solo después de aprobación expresa.
