# Avance de mejoras — 2026-11-13

## Rama
- `audit/phase-1-preparation`
- Base: `main`
- Sin cambios en `main`, sin despliegues y sin operaciones sobre Supabase.

## Cambios realizados en esta rama

### 1. Retirar correos personales del frontend
- Se eliminó la lista de correos permitidos embebida en `app.js`.
- Se eliminaron las comprobaciones locales de correo en login, registro y recuperación.
- Se eliminó la comparación del correo personal del creador para decidir quién crea el espacio.
- El flujo ahora llama a `get_or_create_our_couple()` cuando el usuario autenticado aún no pertenece a una pareja.
- La autorización de creación/unión continúa dependiendo de las funciones de Supabase y de `allowed_emails`, no de una lista modificable en el navegador.

**Limitación:** el repositorio es público y los correos pueden permanecer en commits históricos. Este cambio retira su exposición de la versión actual de `app.js`, pero no borra el historial. Para retirar también el historial habría que evaluar hacer privado el repositorio o reescribirlo, considerando la integración de Vercel.

### 2. Precarga de PWA
- Se cambió la caché del Service Worker de `calendario21-v33` a `calendario21-v34`.
- Se retiró `pareja.jpeg` de la lista de recursos obligatorios durante la instalación.
- La imagen seguirá solicitándose normalmente y podrá entrar en caché cuando se cargue mediante el manejador de solicitudes existente.

## Validaciones realizadas
- Se volvió a leer `app.js` desde la rama después de los cambios.
- Búsqueda estática: no quedan correos personales ni referencias a la lista `allowed` en el frontend.
- Se confirmó que el flujo contiene una llamada a `get_or_create_our_couple()` y otra a `join_couple()`.
- Se comparó la rama con `main`: los cambios están solo en la rama de auditoría.

## Pendiente antes de producción
- Prueba real con las dos cuentas autorizadas en un entorno aislado.
- Confirmar que el usuario creador puede generar el espacio y que la segunda persona puede unirse con el código.
- Confirmar recuperación de contraseña.
- Probar instalación PWA, carga de portada y funcionamiento offline.
- Verificar configuración de `VAPID_SUBJECT` antes de retirar el fallback de correo en la Edge Function.
- No desplegar migraciones ni Edge Functions hasta validar en staging.

## No realizado
- No se ejecutaron migraciones SQL.
- No se modificó Supabase.
- No se cambió la configuración de Vercel.
- No se abrió PR ni se hizo merge.
- No se publicó a producción.
