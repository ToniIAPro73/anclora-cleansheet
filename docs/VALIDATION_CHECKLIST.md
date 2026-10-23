# Checklist de validación — CleanSheet

**Cambio:** se retiró el healthcheck Docker que consultaba Neon cada 30 s y se amplió a 1 hora el intervalo predeterminado de consulta del worker cuando no hay automatizaciones vencidas. Una automatización nueva puede comenzar con hasta una hora de retraso. El valor puede configurarse con `SCHEDULER_POLL_INTERVAL_SECONDS`.

**Rama:** `development`
**Validación en desarrollo por Toni:** confirmada
**Preview del SHA publicado:** pendiente
**Promoción:** solicitada con `PROMOTE=FULL`; ejecutar después de la revisión en Preview.

## Verificación del agente

- `git diff --check`: PASS.
- Tests, lint y build: no ejecutados; no solicitados para este cambio localizado de configuración y documentación.
- No se consultaron ni modificaron datos de aplicación.

## Revisión de Toni

- [x] Validado en desarrollo.
- [ ] Revisar en Preview el SHA publicado y confirmar que el worker respeta el intervalo esperado.
- [ ] Tras validar Preview, ejecutar `PROMOTE=FULL`.
