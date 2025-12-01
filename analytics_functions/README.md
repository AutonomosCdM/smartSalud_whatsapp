# Analytics Functions - OpenWebUI

Custom Pipe Functions para análisis conversacional de datos médicos.

## Estructura

```
analytics_functions/
└── excel_analytics_pipe.py  # Pipe principal: Excel → DuckDB → SQL
```

## excel_analytics_pipe.py

**Qué hace**:
1. Al startup, carga 5 Excel a DuckDB (in-memory)
2. Recibe pregunta del doctor en español
3. Usa Groq (Llama 3.3) para generar SQL query
4. Ejecuta SQL en DuckDB
5. Retorna resultado como tabla markdown

**Dependencias**:
```bash
pip install duckdb pandas openpyxl pydantic requests
```

**Configuración** (Valves):
- `EXCEL_DATA_DIR`: Ruta a carpeta con Excel (default: `/app/backend/data/excel_uploads`)
- `MAX_ROWS_DISPLAY`: Máximo filas en respuesta (default: 50)
- `GROQ_API_KEY`: API key de Groq
- `GROQ_MODEL`: Modelo Groq (default: `llama-3.3-70b-versatile`)
- `DEBUG`: Mostrar SQL generado (default: false)

## Instalación en OpenWebUI

### Método 1: Upload vía UI

1. Admin Panel → Functions
2. Upload File → Seleccionar `excel_analytics_pipe.py`
3. Configurar Valves (GROQ_API_KEY, etc.)
4. Enable function

### Método 2: Volume Mount

```yaml
# docker-compose.analytics.yml
volumes:
  - ./analytics_functions:/app/backend/functions
```

Reiniciar container.

## Testing Local

```python
# test_pipe.py
from excel_analytics_pipe import Pipe

pipe = Pipe()
await pipe.on_startup()

# Simular query
body = {
    "messages": [
        {"role": "user", "content": "¿Cuántos adultos mayores sin cuidador?"}
    ]
}

async for chunk in pipe.pipe(body):
    print(chunk)
```

## Arquitectura

```
Doctor pregunta
    ↓
[pipe() method]
    ↓
[_generate_sql()] → Groq API → SQL query
    ↓
[DuckDB execute()] → Resultado DataFrame
    ↓
[to_markdown()] → Respuesta
```

## Próximas Features

- [ ] Hot-reload Excel sin restart
- [ ] Query validation (prevent DROP, DELETE)
- [ ] Cache queries frecuentes
- [ ] Exportar a Excel/PDF
- [ ] Queries templates (guardados)

## Troubleshooting

**Error: "DuckDB no inicializado"**
- Verificar Excel en EXCEL_DATA_DIR
- Revisar logs startup: `docker logs smartsalud-chat`

**SQL incorrecto generado**
- Activar DEBUG=true en Valves
- Verificar nombres columnas Excel (espacios, acentos)

**Groq API timeout**
- Aumentar timeout en `requests.post(..., timeout=60)`
- Revisar créditos Groq: https://console.groq.com

## Referencias

- [OpenWebUI Functions](https://docs.openwebui.com/features/plugin/functions)
- [DuckDB Python API](https://duckdb.org/docs/api/python/overview.html)
- [Groq API](https://console.groq.com/docs/api-reference)
