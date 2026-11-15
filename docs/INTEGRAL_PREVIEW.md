# Versión integral para TEST

## Cambios incluidos

- Organización del frontend en 18 archivos fuente y compilación reproducible con dependencias fijadas.
- Recursos Supabase y Leaflet servidos desde el propio sitio.
- Rutas de fotos persistentes, renovación de enlaces antiguos y limpieza del archivo recién subido si falla el guardado del recuerdo.
- Búsqueda de recuerdos por texto, año y favoritos.
- Conversión de una idea en plan conservando título, descripción, presupuesto y lugar.
- Historial de aportes y retiros con saldo inicial, bloqueo de fila y clave de reintento.
- Acceso a cartas programadas controlado por PostgreSQL.
- Reutilización del aviso creado por el trigger, enlaces al elemento exacto y mismo identificador para los avisos push y realtime.
- Protección ante clics repetidos al guardar.
- Conservación de datos ante consultas fallidas, consultas paginadas y recarga por módulo en realtime.
- Conservación de campos durante actualizaciones, limpieza de la sesión y mensajes de conectividad.
- Nombre de instalación propio de TEST, caché generada por contenido, CSS de autenticación precargado y navegación de notificaciones limitada al sitio.
- Acceso por teclado y respeto de la preferencia de movimiento reducido.

## Pruebas de aceptación en el preview

1. Ingresar con ambas cuentas de TEST y recorrer todas las pestañas.
2. Crear un recuerdo con foto, reemplazarla y abrirla desde Historia y Recuerdos.
3. Buscar recuerdos por texto, año y favoritos y limpiar los filtros.
4. Agendar una idea que tenga un lugar y comprobar los campos del plan antes de guardarlo.
5. Aportar a la misma meta desde ambos dispositivos. Revisar el saldo y el historial. Intentar retirar más del saldo disponible.
6. Crear una carta programada. Verificar el acceso del autor y del destinatario antes y después de su fecha.
7. Crear contenido compartido y comprobar una sola entrada en la bandeja. Abrir el aviso hasta su elemento.
8. Escribir una respuesta del día mientras la otra cuenta agrega contenido. Comprobar que el texto se conserva.
9. Probar una interrupción de red, la recuperación y el cierre de sesión.
10. Instalar TEST en Android y comprobar las notificaciones con la aplicación cerrada.

Las pruebas automatizadas del DOM usan datos simulados. Las pruebas SQL se ejecutan en Supabase TEST con transacciones revertidas. La aceptación de Android y las sesiones de las cuentas reales se registra después de la prueba del usuario.
