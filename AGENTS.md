# Nuestro Calendario #21 — continuidad de desarrollo

Antes de cambiar código, leer `docs/PROJECT_STATE.md`, `README.md` y, para Android, `android/README.md`.
Verificar `git status`, rama, último commit remoto y descriptor publicado `/android-release.json`.
Los mensajes de chats anteriores son antecedentes, no evidencia de publicación ni de pruebas.
Al terminar una entrega, actualizar `docs/PROJECT_STATE.md` con lo implementado, validación, estado real de publicación y pendientes.

- Código web en `src/`; regenerar `public/` con `npm run build`. No editar el bundle.
- Producción: https://nuestrocalendario21.vercel.app. Backend TEST y producción son independientes.
- No anunciar un APK hasta que esté firmado con el certificado existente, descargable y verificado. Usar `scripts/publish-android-release.mjs`.
- No guardar keystores, contraseñas, sesiones ni tokens privados en Git, documentación o salida de herramientas.
- Mantener la web y Android con la misma base de datos. El vínculo de widgets es de solo lectura, revocable, sin exportar sesiones del navegador.
- Android puede diferir actualizaciones por Doze/batería. No prometer tiempo real continuo ni instalación silenciosa de APK.
- El usuario prefiere ejecutar cambios autorizados sin confirmaciones repetidas. No añadir funciones de deudas entre la pareja.
- No modificar avances de otras carpetas o ramas sin comprobar que pertenecen a esta entrega.
