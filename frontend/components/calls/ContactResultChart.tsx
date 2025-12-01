"use client";

interface ContactResultChartProps {
  data: { result: string; count: number }[];
}

const RESULT_COLORS: Record<string, string> = {
  NOT_ATTEMPTED: "bg-gray-400",
  NO_CONTACT: "bg-red-500",
  CONTACTED_SUCCESS: "bg-green-500",
  CONTACTED_PARTIAL: "bg-yellow-500",
  VOICEMAIL_LEFT: "bg-blue-500",
  NEEDS_RETRY: "bg-orange-500",
};

const RESULT_LABELS: Record<string, string> = {
  NOT_ATTEMPTED: "No Intentado",
  NO_CONTACT: "Sin Contacto",
  CONTACTED_SUCCESS: "Contacto Exitoso",
  CONTACTED_PARTIAL: "Contacto Parcial",
  VOICEMAIL_LEFT: "Buzón",
  NEEDS_RETRY: "Reintentar",
};

export default function ContactResultChart({ data }: ContactResultChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Resultados de Contacto
        </h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📈</div>
          <p className="text-sm text-gray-500">Sin datos disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Resultados de Contacto
      </h3>

      <div className="space-y-3">
        {data
          .sort((a, b) => b.count - a.count)
          .map((item) => {
            const percentage = ((item.count / total) * 100).toFixed(1);
            const color = RESULT_COLORS[item.result] || "bg-gray-300";
            const label = RESULT_LABELS[item.result] || item.result;

            return (
              <div key={item.result}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {label}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {item.count} ({percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`${color} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-700">Total</span>
          <span className="text-lg font-bold text-gray-900">{total}</span>
        </div>
      </div>
    </div>
  );
}
