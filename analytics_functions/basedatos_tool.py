"""
title: Excel Analytics Tool
author: smartSalud V5
version: 1.0.0
description: Carga Excel subidos por doctores y ejecuta queries SQL
requirements: duckdb, pandas, openpyxl, xlrd
"""

from typing import Optional, Callable, Any
from pydantic import BaseModel, Field
import duckdb
import pandas as pd
from pathlib import Path


class Tools:
    class Valves(BaseModel):
        MAX_ROWS_DISPLAY: int = Field(
            default=100,
            description="Máximo filas a mostrar en resultados"
        )

    def __init__(self):
        self.valves = self.Valves()
        self.db = duckdb.connect(':memory:')
        self.loaded_tables = {}

    def get_tools(self) -> dict[str, Callable[..., Any]]:
        """Retorna diccionario de tools disponibles"""
        return {
            "load_excel": self.load_excel,
            "query_sql": self.query_sql,
            "list_tables": self.list_tables,
        }

    def load_excel(
        self,
        file_path: str,
        table_name: str = None,
        __user__: Optional[dict] = None
    ) -> str:
        """
        Carga archivo Excel subido por el doctor a DuckDB.

        Args:
            file_path: Path completo al archivo Excel subido
            table_name: Nombre de tabla (opcional, usa filename si no se especifica)

        Returns:
            Confirmación con columnas y filas cargadas
        """
        try:
            path = Path(file_path)
            engine = 'xlrd' if path.suffix == '.xls' else 'openpyxl'
            df = pd.read_excel(file_path, engine=engine)
            df.columns = [self._clean_column_name(col) for col in df.columns]

            if not table_name:
                table_name = self._clean_column_name(path.stem)

            self.db.execute(f"DROP TABLE IF EXISTS {table_name}")
            self.db.execute(f"CREATE TABLE {table_name} AS SELECT * FROM df")

            self.loaded_tables[table_name] = {
                'columns': list(df.columns),
                'rows': len(df),
                'file': path.name
            }

            response = f"✓ Cargado: **{path.name}**\n\n"
            response += f"- Tabla: `{table_name}`\n"
            response += f"- Filas: {len(df):,}\n"
            response += f"- Columnas ({len(df.columns)}): {', '.join(df.columns[:10])}"

            if len(df.columns) > 10:
                response += f"... (+{len(df.columns) - 10} más)"

            return response

        except Exception as e:
            return f"❌ Error cargando {file_path}: {str(e)}"

    def query_sql(
        self,
        sql_query: str,
        __user__: Optional[dict] = None
    ) -> str:
        """
        Ejecuta query SQL sobre tablas Excel cargadas.

        Tablas disponibles se listan con list_tables().

        Ejemplos:
        - "SELECT COUNT(*) FROM tabla1"
        - "SELECT * FROM tabla1 WHERE edad > 65 LIMIT 10"

        Args:
            sql_query: Query SQL a ejecutar

        Returns:
            Resultado en formato tabla markdown
        """
        if not self.loaded_tables:
            return "❌ No hay tablas cargadas. Usa load_excel() primero."

        try:
            result = self.db.execute(sql_query).fetchdf()

            if len(result) == 0:
                return "No se encontraron resultados"

            rows_to_show = min(len(result), self.valves.MAX_ROWS_DISPLAY)
            markdown_table = result.head(rows_to_show).to_markdown(index=False)

            response = f"**Query**: `{sql_query}`\n\n"
            response += f"**Resultados** ({len(result)} filas):\n\n{markdown_table}"

            if len(result) > self.valves.MAX_ROWS_DISPLAY:
                response += f"\n\n*Mostrando {self.valves.MAX_ROWS_DISPLAY} de {len(result)} resultados*"

            return response

        except Exception as e:
            return f"❌ Error SQL: {str(e)}\n\nQuery: `{sql_query}`"

    def list_tables(
        self,
        __user__: Optional[dict] = None
    ) -> str:
        """
        Lista todas las tablas Excel cargadas con sus columnas.

        Returns:
            Tabla con nombre, filas y columnas de cada tabla cargada
        """
        if not self.loaded_tables:
            return "No hay tablas cargadas. Sube un Excel primero."

        response = "**Tablas cargadas**:\n\n"

        for table_name, info in self.loaded_tables.items():
            response += f"### `{table_name}` ({info['rows']:,} filas)\n"
            response += f"Archivo: {info['file']}\n"
            response += f"Columnas: {', '.join(info['columns'][:15])}"

            if len(info['columns']) > 15:
                response += f"... (+{len(info['columns']) - 15} más)"

            response += "\n\n"

        return response

    def _clean_column_name(self, col: str) -> str:
        """Limpiar nombre de columna para SQL"""
        clean = str(col).strip().lower()
        clean = clean.replace(' ', '_').replace('-', '_')
        clean = clean.replace('(', '').replace(')', '')
        clean = clean.replace('/', '_').replace('\\', '_')
        clean = ''.join(c if c.isalnum() or c == '_' else '_' for c in clean)
        return clean
