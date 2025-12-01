# OpenWebUI Analytics - Sistema Conversacional de Gestión

Sistema separado para que doctores del CESFAM Futrono conversen con datos de gestión médica (40k+ registros en 5 Excel).

**NO reemplaza** el sistema actual de citas. Es completamente independiente.

---

## Arquitectura

```
Doctor pregunta → OpenWebUI (chat) → Custom Pipe (Python)
                                      ↓
                           DuckDB (Excel → SQL) + Groq (Llama 3.3)
                                      ↓
                           Respuesta con tabla markdown
```

### Componentes

- **OpenWebUI**: Interfaz conversacional (http://localhost:8080)
- **Groq API**: Llama 3.3 70B para generar SQL desde preguntas
- **DuckDB**: Base de datos in-memory (OLAP) con los 5 Excel cargados
- **Custom Pipe**: `excel_analytics_pipe.py` - lógica Python

---

## Setup Local (10 minutos)

### 1. Configurar Variables de Entorno

```bash
# Copiar template
cp .env.analytics.example .env.analytics

# Editar .env.analytics
GROQ_API_KEY=gsk_...  # Obtener de https://console.groq.com/keys
WEBUI_SECRET_KEY=$(openssl rand -hex 32)  # Generar random
```

### 2. Verificar Excel

Los archivos Excel deben estar en `CONSOLIDADO PLANTILLAS EXCEL 2/`:

```
✓ PLAN DE LOS PAD 2025.xlsx
✓ poblacion infantil inscrita validada 2025.xlsx
✓ POBLACION BAJO CONTROL.xlsx
✓ ECICEP Universal .xlsx
✓ PACIENTES RECHAZO 2025.xlsx
```

### 3. Levantar OpenWebUI

```bash
# Levantar container
docker-compose -f docker-compose.analytics.yml up -d

# Ver logs
docker-compose -f docker-compose.analytics.yml logs -f openwebui

# Debería mostrar:
# ✓ DuckDB conectado
# ✓ Cargado pad_adultos: 1200 registros
# ✓ Cargado infantil: 5900 registros
# ...
```

### 4. Configurar OpenWebUI

1. **Abrir** http://localhost:8080
2. **Crear cuenta** admin (primer usuario)
3. **Settings → Connections**:
   - Verificar URL: `https://api.groq.com/openai/v1`
   - Test connection
4. **Settings → Models**:
   - Seleccionar: `llama-3.3-70b-versatile`
5. **Admin Panel → Functions**:
   - Verificar que `Excel Analytics CESFAM` aparece
   - Activar (toggle ON)

### 5. Probar Query

En el chat:

```
Doctor: ¿Cuántos adultos mayores sin cuidador?
```

Debería responder con tabla markdown:

```
Resultados (340 total):

| total |
|-------|
| 340   |
```

---

## Queries de Ejemplo

### Adultos Mayores (PAD)

```
- ¿Cuántos adultos mayores sin cuidador?
- Lista adultos con dependencia severa
- ¿Cuántos tienen vacuna influenza al día?
```

### Pediatría

```
- ¿Cuántos niños atrasados en control médico?
- Lista niños menores de 2 años sin control de matrona
- Dame estadísticas por grupo etario
```

### Respiratorio

```
- Pacientes con asma que necesitan KINE
- ¿Cuántos tienen espirometría pendiente?
- Lista por diagnóstico (asma, EPOC, etc.)
```

### ECICEP (Riesgo Cardiovascular)

```
- ¿Cuántos pacientes de alto riesgo sin equipo completo?
- Distribución por nivel de riesgo
- Lista pacientes que necesitan nutricionista
```

### Rechazos/No-Shows

```
- Top 5 motivos de rechazo este mes
- ¿Cuántas citas canceladas por especialidad?
- Tendencia de no-shows últimos 3 meses
```

---

## Troubleshooting

### Error: "DuckDB no inicializado"

**Causa**: Excel no cargaron al startup

**Solución**:
```bash
# Ver logs
docker-compose -f docker-compose.analytics.yml logs openwebui | grep DuckDB

# Verificar que Excel existen
ls -lh "CONSOLIDADO PLANTILLAS EXCEL 2/"

# Reiniciar container
docker-compose -f docker-compose.analytics.yml restart
```

### Error: "Groq API error"

**Causa**: API key inválida o sin créditos

**Solución**:
1. Verificar key en https://console.groq.com/keys
2. Revisar .env.analytics
3. Reiniciar container

### SQL generado incorrecto

**Causa**: Nombres de columnas no coinciden

**Solución**:
1. Activar debug: `DEBUG=true` en Function Valves
2. Ver SQL generado en respuesta
3. Reportar al equipo técnico

---

## Actualizar Excel

### Opción 1: Reiniciar Container

```bash
# 1. Reemplazar Excel en carpeta
cp nuevo_excel.xlsx "CONSOLIDADO PLANTILLAS EXCEL 2/..."

# 2. Reiniciar
docker-compose -f docker-compose.analytics.yml restart
```

### Opción 2: Hot-reload (futuro)

Implementar endpoint `/reload-excel` en Pipe Function.

---

## Deployment Web (Railway)

### 1. Crear Servicio

**Railway Dashboard**:
- New Service → Docker Image
- Image: `ghcr.io/open-webui/open-webui:main`
- Port: 8080

### 2. Variables de Entorno

```bash
OPENAI_API_BASE_URL=https://api.groq.com/openai/v1
OPENAI_API_KEY=${{GROQ_API_KEY}}  # Desde Railway secrets
ENABLE_OPENAI_API=true
WEBUI_SECRET_KEY=${{RAILWAY_SECRET}}  # Auto-generado
DATA_DIR=/data
```

### 3. Upload Excel

```bash
# Opción 1: Railway CLI
railway run bash
# Dentro: copiar Excel a /data/excel_uploads/

# Opción 2: S3/Object Storage (futuro)
```

### 4. Deploy Custom Pipe

```bash
# Copiar function a volumen
railway run bash
cd /app/backend/functions
# Pegar contenido excel_analytics_pipe.py
```

### 5. Acceso

```
URL: https://smartsalud-chat-production.up.railway.app
Auth: Usuario/password configurado
```

---

## Costos Estimados

| Componente | Costo Mensual |
|------------|---------------|
| Groq API (1000 queries/día) | ~$5-9/mes |
| Railway (OpenWebUI 512MB) | ~$5/mes |
| **Total** | **~$10-15/mes** |

---

## Privacidad y Seguridad

⚠️ **IMPORTANTE**: Datos médicos salen del servidor vía Groq API (USA).

### Mitigaciones

1. **No enviar RUT completo**: Queries usan stats, no datos individuales
2. **Auth obligatorio**: OpenWebUI requiere login
3. **Logs deshabilitados**: Settings → Advanced → Disable Logging
4. **HTTPS**: Railway usa SSL by default

### Alternativa 100% Local

Reemplazar Groq por **Ollama local**:

```yaml
# docker-compose.analytics.yml - AGREGAR
  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama:/root/.ollama
    # Ejecutar: docker exec -it ollama ollama pull llama3.1:8b
```

Pros: Privacidad total
Contras: Más lento, necesita GPU

---

## Mantenimiento

### Backup Datos

```bash
# Backup volumen OpenWebUI
docker cp smartsalud-chat:/app/backend/data ./backup_openwebui_$(date +%Y%m%d)
```

### Update OpenWebUI

```bash
# Pull nueva imagen
docker-compose -f docker-compose.analytics.yml pull

# Restart
docker-compose -f docker-compose.analytics.yml up -d
```

### Monitoreo

```bash
# Ver uso recursos
docker stats smartsalud-chat

# Ver logs tiempo real
docker-compose -f docker-compose.analytics.yml logs -f --tail=100
```

---

## Próximos Pasos (Roadmap)

- [ ] Hot-reload Excel sin restart
- [ ] UI para upload Excel vía web
- [ ] Exportar resultados a Excel/PDF
- [ ] Queries guardados (templates)
- [ ] Alertas automáticas (ej: "Niños atrasados > 50")
- [ ] Dashboard gráfico (charts)
- [ ] Multi-tenancy (diferentes CEFAMs)

---

## Soporte

**Issues técnicos**: Crear issue en GitHub del proyecto

**Consultas médicas**: Contactar equipo CESFAM Futrono

**Groq API**: https://console.groq.com/docs

**OpenWebUI**: https://docs.openwebui.com
