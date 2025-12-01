'use client';

import { useState, useEffect, useRef } from 'react';
import { Phone, CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw, Search, Filter, FileText, X } from 'lucide-react';
import { toast } from 'sonner';

interface Call {
    id: string;
    conversationId: string;
    phoneNumber: string;
    status: string;
    initiatedAt: string;
    answeredAt?: string;
    endedAt?: string;
    durationSeconds?: number;
    transcription?: string;
    summary?: string;
    errorMessage?: string;
    patient?: {
        id: string;
        name: string;
        phone: string;
        rut: string;
    };
}

interface CallHistoryResponse {
    success: boolean;
    data: Call[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

const statusConfig = {
    INITIATED: { label: 'Iniciada', icon: Phone, color: 'text-blue-600 bg-blue-50' },
    RINGING: { label: 'Llamando', icon: Phone, color: 'text-yellow-600 bg-yellow-50' },
    IN_PROGRESS: { label: 'En curso', icon: Phone, color: 'text-green-600 bg-green-50' },
    COMPLETED: { label: 'Completada', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
    FAILED: { label: 'Fallida', icon: XCircle, color: 'text-red-600 bg-red-50' },
    NO_ANSWER: { label: 'Sin respuesta', icon: AlertCircle, color: 'text-orange-600 bg-orange-50' },
    BUSY: { label: 'Ocupado', icon: AlertCircle, color: 'text-orange-600 bg-orange-50' },
    CANCELLED: { label: 'Cancelada', icon: XCircle, color: 'text-gray-600 bg-gray-50' },
};

function formatDuration(seconds?: number): string {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function formatTime(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

export function CallHistory() {
    const [calls, setCalls] = useState<Call[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({
        total: 0,
        totalPages: 0,
        page: 1,
        limit: 20,
    });
    const [mounted, setMounted] = useState(false);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Details Modal
    const [selectedCall, setSelectedCall] = useState<Call | null>(null);

    // Ref for previous calls state to compare for notifications
    const prevCallsRef = useRef<Call[]>([]);

    // Only fetch on client-side
    useEffect(() => {
        setMounted(true);
    }, []);

    const fetchCalls = async (pageNum: number = 1, isPolling = false) => {
        if (!mounted) return; // Skip if not mounted (SSR)
        if (!isPolling) setLoading(true);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const params = new URLSearchParams({
                page: pageNum.toString(),
                limit: '20',
            });

            if (search) params.append('search', search);
            if (statusFilter !== 'ALL') params.append('status', statusFilter);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const response = await fetch(`${apiUrl}/api/calls?${params.toString()}`);

            if (!response.ok) {
                throw new Error('Error al obtener historial de llamadas');
            }

            const data: CallHistoryResponse = await response.json();

            // Check for status changes to show notifications
            if (prevCallsRef.current.length > 0) {
                data.data.forEach(newCall => {
                    const oldCall = prevCallsRef.current.find(c => c.id === newCall.id);
                    if (oldCall && oldCall.status !== newCall.status) {
                        if (newCall.status === 'COMPLETED') {
                            toast.success(`Llamada a ${newCall.patient?.name || newCall.phoneNumber} completada`, {
                                description: `Duración: ${formatDuration(newCall.durationSeconds)}`
                            });
                        } else if (newCall.status === 'FAILED') {
                            toast.error(`Llamada a ${newCall.patient?.name || newCall.phoneNumber} falló`, {
                                description: newCall.errorMessage || 'Error desconocido'
                            });
                        }
                    }
                });
            }

            setCalls(data.data);
            prevCallsRef.current = data.data;
            setPagination(data.pagination);
        } catch (err) {
            if (!isPolling) console.error('Failed to fetch calls:', err);
        } finally {
            if (!isPolling) setLoading(false);
        }
    };

    useEffect(() => {
        fetchCalls(page);
    }, [page]); // Re-fetch when page changes

    // Polling logic
    useEffect(() => {
        const hasActiveCalls = calls.some(c =>
            ['INITIATED', 'RINGING', 'IN_PROGRESS'].includes(c.status)
        );

        if (hasActiveCalls) {
            const interval = setInterval(() => {
                fetchCalls(page, true);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [calls, page]);

    // Handle filter submission
    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1); // Reset to page 1
        fetchCalls(1);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-foreground">Historial de Llamadas</h2>
                <button
                    onClick={() => fetchCalls(page)}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <RefreshCw className="w-4 h-4" />
                    )}
                    Actualizar
                </button>
            </div>

            {/* Filters */}
            <form onSubmit={handleFilterSubmit} className="bg-card border border-border rounded-lg p-4 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Buscar</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Nombre, RUT o teléfono..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                <div className="w-[180px]">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Estado</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="ALL">Todos</option>
                        <option value="COMPLETED">Completadas</option>
                        <option value="FAILED">Fallidas</option>
                        <option value="IN_PROGRESS">En curso</option>
                        <option value="NO_ANSWER">Sin respuesta</option>
                    </select>
                </div>

                <div className="w-[160px]">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Desde</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div className="w-[160px]">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Hasta</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <button
                    type="submit"
                    className="px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                    <Filter className="w-4 h-4" />
                    Filtrar
                </button>
            </form>

            {/* Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Paciente</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Teléfono</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Estado</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Fecha</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Duración</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading && calls.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                                </td>
                            </tr>
                        ) : calls.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center">
                                    <Phone className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                                    <p className="text-muted-foreground">No se encontraron llamadas</p>
                                </td>
                            </tr>
                        ) : (
                            calls.map((call) => {
                                const statusInfo = statusConfig[call.status as keyof typeof statusConfig] || statusConfig.INITIATED;
                                const StatusIcon = statusInfo.icon;

                                return (
                                    <tr key={call.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-foreground">
                                                {call.patient?.name || 'Desconocido'}
                                            </div>
                                            {call.patient?.rut && (
                                                <div className="text-sm text-muted-foreground">{call.patient.rut}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-foreground">{call.phoneNumber}</td>
                                        <td className="px-4 py-3">
                                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${statusInfo.color}`}>
                                                <StatusIcon className="w-4 h-4" />
                                                <span className="text-sm font-medium">{statusInfo.label}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-foreground">
                                            <div>{formatDate(call.initiatedAt)}</div>
                                            <div className="text-xs text-muted-foreground">{formatTime(call.initiatedAt)}</div>
                                        </td>
                                        <td className="px-4 py-3 text-foreground">{formatDuration(call.durationSeconds)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => setSelectedCall(call)}
                                                className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                                title="Ver detalles"
                                            >
                                                <FileText className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Página {pagination.page} de {pagination.totalPages} ({pagination.total} llamadas)
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                            disabled={page === pagination.totalPages}
                            className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {selectedCall && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-background rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h3 className="text-xl font-semibold">Detalles de la Llamada</h3>
                            <button
                                onClick={() => setSelectedCall(null)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Paciente</label>
                                    <div className="text-lg font-medium">{selectedCall.patient?.name || 'Desconocido'}</div>
                                    <div className="text-sm text-muted-foreground">{selectedCall.phoneNumber}</div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Estado</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        {(() => {
                                            const statusInfo = statusConfig[selectedCall.status as keyof typeof statusConfig] || statusConfig.INITIATED;
                                            const StatusIcon = statusInfo.icon;
                                            return (
                                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${statusInfo.color}`}>
                                                    <StatusIcon className="w-4 h-4" />
                                                    <span className="text-sm font-medium">{statusInfo.label}</span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Fecha y Hora</label>
                                    <div>{formatDate(selectedCall.initiatedAt)}</div>
                                    <div className="text-sm text-muted-foreground">{formatTime(selectedCall.initiatedAt)}</div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Duración</label>
                                    <div>{formatDuration(selectedCall.durationSeconds)}</div>
                                </div>
                            </div>

                            {/* Transcription */}
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-2 block">Transcripción</label>
                                <div className="bg-muted/30 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap min-h-[100px] border border-border">
                                    {selectedCall.transcription || (
                                        <span className="text-muted-foreground italic">
                                            No hay transcripción disponible.
                                            {selectedCall.status === 'INITIATED' && ' La llamada aún no ha terminado o no se ha procesado.'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Error Message */}
                            {selectedCall.errorMessage && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <label className="text-sm font-medium text-red-800 mb-1 block">Error</label>
                                    <div className="text-sm text-red-700 font-mono break-all">
                                        {selectedCall.errorMessage}
                                    </div>
                                </div>
                            )}

                            {/* Technical Details */}
                            <div className="border-t border-border pt-4">
                                <details className="text-xs text-muted-foreground">
                                    <summary className="cursor-pointer hover:text-foreground">Detalles Técnicos</summary>
                                    <div className="mt-2 grid grid-cols-2 gap-2 font-mono">
                                        <div>ID: {selectedCall.id}</div>
                                        <div>Conv ID: {selectedCall.conversationId}</div>
                                    </div>
                                </details>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
