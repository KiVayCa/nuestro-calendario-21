# Nuestro Calendario #21

Aplicación compartida para planes, recuerdos, cartas, metas y presupuesto.

## Continuidad entre conversaciones

Leer primero [AGENTS.md](AGENTS.md) y [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md). El estado publicado se comprueba en Git y en el descriptor Android; no depende de recordar una conversación.

## Desarrollo

Requiere Node.js 22 o posterior.

```sh
npm ci
npm run build
npm test
```

`npm run build` compila los archivos de `src/` en `public/app.js`, copia los recursos y las versiones fijadas de Supabase y Leaflet y genera la versión de caché a partir del contenido. Vercel sirve `public/` y ejecuta `api/config.js` como función del servidor.

Los archivos de `src/` se organizan por funcionalidad. `runtime.js` conserva el estado compartido y la inicialización. El resultado es un script clásico para mantener los manejadores HTML y los puntos de integración de `places-map.js`. El orden explícito está en `scripts/build.mjs`. Editar los archivos fuente y regenerar `public/` con el comando de compilación.

## Entornos

Configurar `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` por entorno en Vercel. Preview usa el proyecto Supabase TEST y genera el nombre de instalación `Nuestro Calendario #21 TEST`. La función de configuración devuelve únicamente valores públicos.

La versión integral depende de `supabase/migrations/20261114215052_integral_test_improvements.sql`. Se validó y aplicó mediante SQL en el proyecto TEST. La publicación futura en otro entorno requiere aplicar y registrar esa migración y desplegar la Edge Function de esta versión.

La función `send-push-notification` utiliza `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` del entorno Supabase. Comprobar las suscripciones y la entrega física en cada dispositivo durante la aceptación.

## Validación

- `npm test` ejecuta pruebas de regresión y los recorridos de las 17 pestañas mediante JSDOM con un cliente de datos simulado.
- `tests/database-regression.sql` verifica permisos, saldo, reintentos, cartas programadas y avisos duplicados en PostgreSQL. Ejecutar en TEST. Crea datos temporales dentro de una transacción que termina con `ROLLBACK`.
- La instalación Android, las notificaciones con la app cerrada y el inicio de sesión de las dos cuentas requieren la prueba de aceptación en el preview.

## Decisiones de esta versión

- Los recuerdos almacenan rutas de Storage. Las URLs antiguas se resuelven de forma compatible al mostrarse.
- Los saldos de metas cambian mediante `record_goal_movement`, que bloquea la fila y registra cada movimiento. La edición de metadatos de la meta no modifica el saldo.
- El destinatario recibe acceso a una carta programada cuando llega su fecha. El autor conserva acceso a su borrador.
- Las búsquedas y filtros de Recuerdos se mantienen durante la navegación. Abrir un recuerdo concreto desde un aviso restablece los filtros para mostrarlo.
