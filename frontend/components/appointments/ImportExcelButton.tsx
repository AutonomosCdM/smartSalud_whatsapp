"use client";

import { useState, useRef } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";

interface ImportSummary {
  total: number;
  imported: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

interface ImportExcelButtonProps {
  onImportSuccess?: () => void;
}

export function ImportExcelButton({ onImportSuccess }: ImportExcelButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.xlsx')) {
      toast.error("Tipo de archivo inválido. Por favor sube un archivo .xlsx.");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Archivo demasiado grande. El tamaño máximo es 5MB.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/appointments/import`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Importación fallida');
      }

      const summary: ImportSummary = await response.json();

      // Show success/warning toast
      if (summary.failed === 0) {
        toast.success(
          `Se importaron exitosamente ${summary.imported} citas`,
          {
            description: `Todas las ${summary.total} filas procesadas sin errores`,
            duration: 5000,
          }
        );
      } else if (summary.imported > 0) {
        toast.warning(
          `Importación parcial: ${summary.imported} exitosas, ${summary.failed} fallidas`,
          {
            description: summary.errors.slice(0, 3).map(e => `Fila ${e.row}: ${e.error}`).join('\n'),
            duration: 8000,
          }
        );
      } else {
        toast.error(
          `Importación fallida: Todas las ${summary.total} filas tuvieron errores`,
          {
            description: summary.errors.slice(0, 3).map(e => `Fila ${e.row}: ${e.error}`).join('\n'),
            duration: 8000,
          }
        );
      }

      // Call success callback to refresh table
      if (summary.imported > 0 && onImportSuccess) {
        onImportSuccess();
      }

    } catch (error) {
      console.error('[ImportExcel] Error:', error);
      toast.error(
        "Error al importar archivo Excel",
        {
          description: error instanceof Error ? error.message : 'Error desconocido',
          duration: 5000,
        }
      );
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />

      <button
        onClick={handleButtonClick}
        disabled={isUploading}
        className={`
          px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium
          ${isUploading
            ? 'bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50'
            : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30'
          }
        `}
      >
        {isUploading ? (
          <>
            <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            Importando...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Importar Excel
          </>
        )}
      </button>
    </>
  );
}
