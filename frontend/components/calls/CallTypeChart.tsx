"use client";

interface CallTypeChartProps {
  data: { status: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  INITIATED: "bg-blue-500",
  RINGING: "bg-cyan-500",
  IN_PROGRESS: "bg-purple-500",
  COMPLETED: "bg-green-500",
  FAILED: "bg-red-500",
  NO_ANSWER: "bg-gray-400",
  BUSY: "bg-orange-400",
  VOICEMAIL: "bg-yellow-500",
};

const STATUS_LABELS: Record<string, string> = {
  INITIATED: "Iniciadas",
  RINGING: "Timbrando",
  IN_PROGRESS: "En Curso",
  COMPLETED: "Completadas",
  FAILED: "Fallidas",
  NO_ANSWER: "Sin Respuesta",
  BUSY: "Ocupado",
  VOICEMAIL: "Buzón",
};

export default function CallTypeChart({ data }: CallTypeChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Estados de Llamadas
        </h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-sm text-gray-500">Sin datos disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Estados de Llamadas
      </h3>

      <div className="space-y-3">
        {data
          .sort((a, b) => b.count - a.count)
          .map((item) => {
            const percentage = ((item.count / total) * 100).toFixed(1);
            const color = STATUS_COLORS[item.status] || "bg-gray-300";
            const label = STATUS_LABELS[item.status] || item.status;

            return (
              <div key={item.status}>
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
