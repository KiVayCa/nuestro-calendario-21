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
- La fase inicial se integró mediante el PR #31 en main el 13 de noviembre de 2026 (merge commit 3624e8e1a259ecb9b9dbbaff8cfd8868d8bec4ba). Ese merge es anterior a los cambios de configuración descritos en la sección 3.
- Los cambios de configuración de la sección 3 se añadieron después a esta rama de auditoría; no se han integrado en main mediante un nuevo PR.
## 3. Separación de configuración entre Production y Preview
- Se retiraron del frontend la URL y la clave publishable de Supabase escritas directamente en app.js.
- Se agregó api/config.js, una función de Vercel que entrega al navegador únicamente la URL y una clave publishable/anon válida.
- El endpoint solo admite GET, responde sin caché y devuelve HTTP 503 si faltan variables o la clave no es de tipo publishable/anon.
- El endpoint no consulta ni devuelve SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SECRET_KEY ni SUPABASE_JWT_SECRET.
- app.js solicita la configuración al endpoint antes de inicializar el cliente Supabase. Si no existe configuración, muestra un mensaje y no inicializa ninguna conexión.
- El Service Worker se actualizó a calendario21-v35 y deja pasar /api/config sin interceptarlo ni guardarlo en caché.

### Configuración requerida en Vercel
- Production ya tiene SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY; el endpoint utiliza esas variables.
- Preview no tiene variables, por lo que debe responder 503 y permanecer desconectado.
- Para habilitar pruebas posteriormente, se deben agregar a Preview únicamente SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY del proyecto Supabase de pruebas independiente. No copiar los valores de Production.
- Development también necesitará sus variables si se desea ejecutar el sitio localmente mediante un endpoint compatible.

### Validación y limitaciones
- Se inspeccionó el flujo de inicialización y el orden de carga de app.js.
- Se verificó estáticamente que las constantes ya no contienen URL ni clave de Supabase.
- Se verificó estáticamente que el endpoint solo lee SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY o, como compatibilidad, SUPABASE_ANON_KEY; las claves heredadas se aceptan únicamente si el JWT declara role=anon.
- No se ha ejecutado todavía una prueba desplegada de la función Vercel ni se ha confirmado el comportamiento de runtime.
- No se han añadido variables en Vercel ni se ha creado un proyecto Supabase de pruebas.
- No se han ejecutado pruebas funcionales ni se han realizado escrituras en Supabase.

**Estado:** cambio preparado únicamente en esta rama de auditoría. No hacer merge ni desplegar a Production hasta revisar el Preview y confirmar el endpoint con un entorno de pruebas independiente.
