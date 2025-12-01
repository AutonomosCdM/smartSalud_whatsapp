'use client';

import { useState, useEffect } from 'react';
import { Phone, Users, CheckSquare, Square, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Patient {
    id: string;
    name: string;
    phone: string;
    rut: string;
}

interface Appointment {
    id: string;
    patient: Patient;
    date: string;
    status: string;
}

interface QueueStatus {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    items: any[];
}

export function BulkCallManager() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch appointments (patients)
    const fetchAppointments = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/api/appointments?status=AGENDADO&format=raw`); // Get scheduled appointments in raw format
            if (response.ok) {
                const data = await response.json();
                // Map raw data to component interface
                const rawAppointments = Array.isArray(data) ? data : data.data || [];
                const mappedAppointments = rawAppointments.map((apt: any) => ({
                    id: apt.id,
                    patient: apt.patient,
                    date: apt.appointmentDate, // Map appointmentDate to date
                    status: apt.status
                }));
                setAppointments(mappedAppointments);
            }
        } catch (error) {
            console.error('Failed to fetch appointments:', error);
            toast.error('Error al cargar pacientes');
        } finally {
            setLoading(false);
        }
    };

    // Fetch queue status
    const fetchQueueStatus = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/api/calls/queue`);
            if (response.ok) {
                const data = await response.json();
                setQueueStatus(data.status);
            }
        } catch (error) {
            console.error('Failed to fetch queue status:', error);
        }
    };

    useEffect(() => {
        fetchAppointments();
        fetchQueueStatus();

        // Poll queue status
        const interval = setInterval(fetchQueueStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleAll = () => {
        if (selectedIds.size === appointments.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(appointments.map(a => a.id)));
        }
    };

    const handleBulkCall = async () => {
        if (selectedIds.size === 0) return;

        const selectedAppointments = appointments.filter(a => selectedIds.has(a.id));
        const payload = selectedAppointments.map(a => ({
            phoneNumber: a.patient.phone,
            patientId: a.patient.id,
            appointmentId: a.id
        }));

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/api/calls/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patients: payload })
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(data.message);
                setSelectedIds(new Set()); // Clear selection
                fetchQueueStatus();
            } else {
                throw new Error('Failed to add to queue');
            }
        } catch (error) {
            toast.error('Error al iniciar llamadas masivas');
        }
    };

    const handleClearQueue = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            await fetch(`${apiUrl}/api/calls/queue/control`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'clear' })
            });
            toast.success('Cola limpiada');
            fetchQueueStatus();
        } catch (error) {
            toast.error('Error al limpiar cola');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                    <Users className="w-6 h-6" />
                    Llamadas Masivas
                </h2>

                {queueStatus && (queueStatus.pending > 0 || queueStatus.processing > 0) && (
                    <div className="flex items-center gap-4 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg border border-blue-100">
                        <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="font-medium">Procesando Cola:</span>
                        </div>
                        <div className="text-sm">
                            {queueStatus.processing} en curso | {queueStatus.pending} pendientes
                        </div>
                        <button
                            onClick={handleClearQueue}
                            className="ml-2 p-1 hover:bg-blue-100 rounded text-red-500"
                            title="Cancelar pendientes"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Action Bar */}
            {selectedIds.size > 0 && (
                <div className="bg-foreground text-background p-4 rounded-lg flex items-center justify-between shadow-lg animate-in slide-in-from-bottom-2">
                    <div className="font-medium">
                        {selectedIds.size} pacientes seleccionados
                    </div>
                    <button
                        onClick={handleBulkCall}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-md font-medium flex items-center gap-2 transition-colors"
                    >
                        <Phone className="w-4 h-4" />
                        Llamar a Seleccionados
                    </button>
                </div>
            )}

            {/* Patient List */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="w-12 px-4 py-3">
                                <button onClick={toggleAll} className="flex items-center">
                                    {selectedIds.size === appointments.length && appointments.length > 0 ? (
                                        <CheckSquare className="w-5 h-5 text-blue-600" />
                                    ) : (
                                        <Square className="w-5 h-5 text-muted-foreground" />
                                    )}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Paciente</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Teléfono</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Cita</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-12 text-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                                </td>
                            </tr>
                        ) : appointments.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                                    No hay citas programadas disponibles para llamar.
                                </td>
                            </tr>
                        ) : (
                            appointments.map((apt) => (
                                <tr
                                    key={apt.id}
                                    className={`hover:bg-muted/30 transition-colors cursor-pointer ${selectedIds.has(apt.id) ? 'bg-blue-50/50' : ''}`}
                                    onClick={() => toggleSelection(apt.id)}
                                >
                                    <td className="px-4 py-3">
                                        {selectedIds.has(apt.id) ? (
                                            <CheckSquare className="w-5 h-5 text-blue-600" />
                                        ) : (
                                            <Square className="w-5 h-5 text-muted-foreground" />
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-medium">{apt.patient?.name}</td>
                                    <td className="px-4 py-3">{apt.patient?.phone}</td>
                                    <td className="px-4 py-3">
                                        {new Date(apt.date).toLocaleDateString()} {new Date(apt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            {apt.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
