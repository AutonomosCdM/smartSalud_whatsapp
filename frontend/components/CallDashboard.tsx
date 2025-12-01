'use client';

import { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface Appointment {
    status: string;
}

interface AppointmentMetrics {
    total: number;
    confirmadas: number;
    pendientes: number;
    canceladas: number;
}

export function CallDashboard() {
    const [metrics, setMetrics] = useState<AppointmentMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        const fetchMetrics = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                const response = await fetch(`${apiUrl}/api/appointments?limit=1000`);
                const data = await response.json();

                if (data.success && data.data) {
                    const appointments = data.data as Appointment[];
                    const total = appointments.length;

                    // Categorías de estados
                    const confirmadas = appointments.filter(a => a.status === 'CONFIRMADO').length;
                    const pendientes = appointments.filter(a =>
                        a.status === 'AGENDADO' ||
                        a.status === 'PENDIENTE_LLAMADA' ||
                        a.status === 'REAGENDADO' ||
                        a.status === 'CONTACTAR'
                    ).length;
                    const canceladas = appointments.filter(a =>
                        a.status === 'CANCELADO' ||
                        a.status === 'NO_SHOW'
                    ).length;

                    setMetrics({ total, confirmadas, pendientes, canceladas });
                }
            } catch (error) {
                console.error('Failed to fetch appointment metrics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
        const interval = setInterval(fetchMetrics, 30000);
        return () => clearInterval(interval);
    }, [mounted]);

    if (loading || !metrics) {
        return <div className="animate-pulse h-24 bg-muted/30 rounded-xl w-full mb-4 border border-border/30"></div>;
    }

    return (
        <div className="mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Total */}
                <div className="bg-muted/30 border border-border/30 rounded-xl p-4 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-muted-foreground">Total</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{metrics.total}</div>
                    <div className="text-xs text-muted-foreground mt-1">citas</div>
                </div>

                {/* Confirmadas */}
                <div className="bg-muted/30 border border-border/30 rounded-xl p-4 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-medium text-muted-foreground">Confirmadas</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{metrics.confirmadas}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                        {metrics.total > 0 ? Math.round((metrics.confirmadas / metrics.total) * 100) : 0}%
                    </div>
                </div>

                {/* Pendientes */}
                <div className="bg-muted/30 border border-border/30 rounded-xl p-4 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-orange-400" />
                        <span className="text-sm font-medium text-muted-foreground">Pendientes</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{metrics.pendientes}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                        {metrics.total > 0 ? Math.round((metrics.pendientes / metrics.total) * 100) : 0}%
                    </div>
                </div>

                {/* Canceladas */}
                <div className="bg-muted/30 border border-border/30 rounded-xl p-4 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-sm font-medium text-muted-foreground">Canceladas</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{metrics.canceladas}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                        {metrics.total > 0 ? Math.round((metrics.canceladas / metrics.total) * 100) : 0}%
                    </div>
                </div>
            </div>
        </div>
    );
}
