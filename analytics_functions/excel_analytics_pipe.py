"""
title: Excel Analytics CESFAM
author: smartSalud V5 Team
version: 1.0.0
license: MIT
description: Consulta Excel subidos vía SQL conversacional
requirements: duckdb, pandas, openpyxl, xlrd, requests
"""

from typing import List, Dict, Optional
from pydantic import BaseModel, Field
import os
import requests

try:
    import duckdb
    import pandas as pd
    from pathlib import Path
    DEPS_AVAILABLE = True
except ImportError:
    DEPS_AVAILABLE = False


class Pipe:
    class Valves(BaseModel):
        MAX_ROWS_DISPLAY: int = Field(
            default=100,
            description="Máximo filas a mostrar en respuesta"
        )
        GROQ_API_KEY: str = Field(
            default="",
            description="Groq API Key para generar SQL"
        )
        GROQ_MODEL: str = Field(
            default="llama-3.3-70b-versatile",
            description="Modelo Groq para text-to-SQL"
        )
        DEBUG: bool = Field(
            default=False,
            description="Mostrar SQL generado en respuestas"
        )

    def __init__(self):
        self.name = "Excel Analytics"
        self.valves = self.Valves()
        self.file_handler = True  # Evitar RAG pipeline default
        self.citation = True
        self.db = None
        self.schema_info = {}
        self.processed_file_ids = set()  # Rastrear archivos ya procesados

        if DEPS_AVAILABLE:
            self.db = duckdb.connect(':memory:')

    def pipes(self) -> List[Dict[str, str]]:
        if not DEPS_AVAILABLE:
            return [{
                "id": "error",
                "name": "Error: Instalar duckdb, pandas, openpyxl, xlrd"
            }]

        tabla_count = len(self.schema_info)
        return [{
            "id": "excel_analytics",
            "name": f"Excel Analytics ({tabla_count} tablas)" if tabla_count > 0 else "Excel Analytics (sin datos)"
        }]

    def pipe(self, body: dict, __user__: Optional[dict] = None, __files__: Optional[list] = None) -> str:
        if not DEPS_AVAILABLE:
            return "❌ Error: Dependencias no instaladas. Ejecutar: pip install duckdb pandas openpyxl xlrd requests"

        if not self.db:
            return "❌ Error: DuckDB no inicializado."

        # Detectar archivos NUEVOS (OpenWebUI pasa TODOS los archivos con __files__)
        if __files__:
            new_files = [f for f in __files__ if f.get("id") not in self.processed_file_ids]
            if new_files:
                result = self._load_uploaded_files(new_files)
                # Marcar como procesados
                for f in new_files:
                    file_id = f.get("id")
                    if file_id:
                        self.processed_file_ids.add(file_id)
                return result
            # Si hay __files__ pero no son nuevos, continuar a query mode (no salir)

        # Extraer query del usuario
        messages = body.get("messages", [])
        if not messages:
            return "❌ Error: No hay mensajes"

        user_query = messages[-1]["content"]

        # Si no hay tablas cargadas, pedir que suba Excel
        if not self.schema_info:
            return "📊 Sube un archivo Excel para comenzar a analizar datos.\n\nFormatos soportados: .xls, .xlsx"

        try:
            # 1. Generar SQL con Groq
            sql_query = self._generate_sql(user_query)

            # 2. Ejecutar query
            result = self.db.execute(sql_query).fetchdf()

            # 3. Formatear respuesta
            response_parts = []

            if self.valves.DEBUG:
                response_parts.append(f"**SQL Generado**:\n```sql\n{sql_query}\n```\n")

            if len(result) == 0:
                response_parts.append("No se encontraron resultados.")
            else:
                rows_to_show = min(len(result), self.valves.MAX_ROWS_DISPLAY)
                response_parts.append(f"**Resultados** ({len(result)} filas):\n\n")
                response_parts.append(result.head(rows_to_show).to_markdown(index=False))

                if len(result) > self.valves.MAX_ROWS_DISPLAY:
                    response_parts.append(f"\n\n*Mostrando {self.valves.MAX_ROWS_DISPLAY} de {len(result)} resultados*")

            return "\n".join(response_parts)

        except Exception as e:
            error_response = [
                f"❌ **Error ejecutando query**\n",
                f"```\n{str(e)}\n```\n"
            ]

            if self.valves.DEBUG:
                error_response.append(f"\n**SQL generado**:\n```sql\n{sql_query}\n```")

            error_response.append("\n💡 Intenta reformular tu pregunta o escribe 'tablas' para ver qué datos hay cargados.")
            return "\n".join(error_response)

    def _load_uploaded_files(self, files: List[Dict]) -> str:
        """Cargar archivos Excel subidos y procesarlos con DuckDB"""
        loaded = []
        errors = []

        for file_info in files:
            try:
                # OpenWebUI __files__ format: {"id": "...", "type": "file", "file": {"path": "...", "name": "..."}}
                file_data = file_info.get("file", file_info)
                file_path = file_data.get("path") or file_data.get("url") or file_info.get("path")
                filename = file_data.get("name", file_info.get("name", Path(file_path).name if file_path else "unknown"))
                file_id = file_info.get("id")

                # Detectar engine
                path = Path(file_path)
                engine = 'xlrd' if path.suffix == '.xls' else 'openpyxl'

                # Leer Excel
                df = pd.read_excel(file_path, engine=engine)

                # Limpiar columnas
                df.columns = [self._clean_column_name(col) for col in df.columns]

                # Nombre tabla desde filename
                table_name = self._clean_column_name(path.stem)

                # Crear tabla (reemplaza si existe)
                self.db.execute(f"DROP TABLE IF EXISTS {table_name}")
                self.db.execute(f"CREATE TABLE {table_name} AS SELECT * FROM df")

                # Guardar metadata
                self.schema_info[table_name] = {
                    'columns': list(df.columns),
                    'count': len(df),
                    'file': filename,
                    'file_id': file_id  # Guardar file_id para Knowledge Base
                }

                # Crear resumen para Knowledge Base
                summary = self._create_data_summary(table_name, df)

                loaded.append(f"✓ `{table_name}`: {len(df):,} filas, {len(df.columns)} columnas")
                loaded.append(f"  📊 Datos disponibles para RAG y SQL queries")

            except Exception as e:
                errors.append(f"❌ {filename}: {str(e)}")

        # Respuesta
        response = []

        if loaded:
            response.append("**Archivos procesados**:\n" + "\n".join(loaded))
            response.append("\n\n💬 **Modo SQL**: Pregunta directamente (ej: '¿Cuántos registros?')")
            response.append("📚 **Modo RAG**: Usa # para referenciar conocimiento")

        if errors:
            response.append("\n**Errores**:\n" + "\n".join(errors))

        return "\n".join(response)

    def _create_data_summary(self, table_name: str, df: pd.DataFrame) -> str:
        """Crear resumen de datos para Knowledge Base"""
        summary_parts = [
            f"# Tabla: {table_name}",
            f"\n## Información General",
            f"- **Total registros**: {len(df):,}",
            f"- **Columnas**: {len(df.columns)}",
            f"\n## Estructura de Columnas",
        ]

        for col in df.columns[:20]:  # Primeras 20 columnas
            dtype = str(df[col].dtype)
            non_null = df[col].notna().sum()
            summary_parts.append(f"- `{col}` ({dtype}): {non_null:,} valores no nulos")

        if len(df.columns) > 20:
            summary_parts.append(f"\n... y {len(df.columns) - 20} columnas más")

        # Estadísticas básicas de columnas numéricas
        numeric_cols = df.select_dtypes(include=['number']).columns
        if len(numeric_cols) > 0:
            summary_parts.append(f"\n## Columnas Numéricas (primeras 5)")
            for col in numeric_cols[:5]:
                summary_parts.append(f"- `{col}`: min={df[col].min()}, max={df[col].max()}, media={df[col].mean():.2f}")

        return "\n".join(summary_parts)

    def _clean_column_name(self, col: str) -> str:
        clean = str(col).strip().lower()
        clean = clean.replace(' ', '_').replace('-', '_')
        clean = clean.replace('(', '').replace(')', '')
        clean = clean.replace('/', '_').replace('\\', '_')
        clean = ''.join(c if c.isalnum() or c == '_' else '_' for c in clean)

        # SQL no permite nombres que empiecen con número
        if clean and clean[0].isdigit():
            clean = 'tbl_' + clean

        return clean

    def _generate_sql(self, user_query: str) -> str:
        # Detectar si pide ver tablas
        if any(word in user_query.lower() for word in ['tabla', 'tablas', 'datos', 'cargado']):
            return self._list_tables()

        # Construir schema description
        schema_desc = self._build_schema_description()

        system_prompt = f"""Eres experto en SQL para DuckDB. Genera queries SQL válidos basándote en preguntas en español.

{schema_desc}

REGLAS:
1. Responde SOLO con SQL válido, sin markdown ni explicaciones
2. Usa nombres de columnas exactos (lowercase, con _)
3. Para conteos: COUNT(*) as total
4. Ordena resultados lógicamente (DESC para conteos)
5. LIMIT 100 siempre

EJEMPLOS:
"¿Cuántos registros?" → SELECT COUNT(*) as total FROM tabla
"Primeros 10" → SELECT * FROM tabla LIMIT 10"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_query}
        ]

        # Llamar Groq API
        try:
            api_key = self.valves.GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")

            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.valves.GROQ_MODEL,
                    "messages": messages,
                    "temperature": 0.1,
                    "max_tokens": 500
                },
                timeout=30
            )
            response.raise_for_status()

            result = response.json()
            sql_query = result["choices"][0]["message"]["content"].strip()
            sql_query = sql_query.replace("```sql", "").replace("```", "").strip()

            return sql_query

        except Exception as e:
            raise Exception(f"Error Groq API: {str(e)}")

    def _list_tables(self) -> str:
        """Devuelve info de tablas como texto (no SQL)"""
        if not self.schema_info:
            return "No hay tablas cargadas."

        lines = ["**Tablas disponibles**:\n"]
        for table_name, info in self.schema_info.items():
            lines.append(f"\n### `{table_name}` ({info['count']:,} filas)")
            lines.append(f"Archivo: {info['file']}")
            lines.append(f"Columnas: {', '.join(info['columns'][:15])}")
            if len(info['columns']) > 15:
                lines.append(f"... (+{len(info['columns']) - 15} más)")

        return "\n".join(lines)

    def _build_schema_description(self) -> str:
        parts = ["TABLAS DISPONIBLES:\n"]

        for table_name, info in self.schema_info.items():
            parts.append(f"\n**{table_name}** ({info['count']} registros)")
            parts.append(f"Columnas: {', '.join(info['columns'][:20])}")

        return "\n".join(parts)
