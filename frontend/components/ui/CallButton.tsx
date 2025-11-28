'use client';

import { useState } from 'react';
import { Phone, PhoneCall, Loader2 } from 'lucide-react';

interface CallButtonProps {
    phoneNumber: string;
    appointmentId?: string;
    patientName?: string;
    variant?: 'default' | 'icon';
    className?: string;
}

export function CallButton({ phoneNumber, appointmentId, patientName, variant = 'default', className = '' }: CallButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const initiateCall = async (e?: React.MouseEvent) => {
        // Prevent card expansion when clicking the button
        if (e) {
            e.stopPropagation();
        }

        console.log('=== [CallButton] CALL INITIATION START ===');
        console.log('[CallButton] Props received:', {
            phoneNumber,
            appointmentId,
            patientName,
            phoneNumberType: typeof phoneNumber,
            phoneNumberLength: phoneNumber?.length
        });

        // Validate phone number format
        if (!phoneNumber || !phoneNumber.startsWith('+')) {
            console.error('[CallButton] ❌ Invalid phone number format:', phoneNumber);
            setError('Número de teléfono inválido. Debe comenzar con +56');
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const endpoint = `${apiUrl}/api/calls/initiate`;
            const payload = {
                phoneNumber,
                appointmentId,
            };

            console.log('[CallButton] 📞 Making request to:', endpoint);
            console.log('[CallButton] 📦 Payload:', JSON.stringify(payload, null, 2));

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            console.log('[CallButton] 📡 Response status:', response.status, response.statusText);

            const data = await response.json();
            console.log('[CallButton] 📥 Response data:', JSON.stringify(data, null, 2));

            if (!response.ok) {
                console.error('[CallButton] ❌ API Error:', data);
                throw new Error(data.error || `HTTP ${response.status}: Failed to initiate call`);
            }

            setSuccess(true);
            console.log('[CallButton] ✅ Call initiated successfully!');
            console.log('[CallButton] Conversation ID:', data.conversationId);
            console.log('=== [CallButton] CALL INITIATION END ===');

            // Reset success message after 3 seconds
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('=== [CallButton] ERROR ===');
            console.error('[CallButton] Error type:', err instanceof Error ? err.constructor.name : typeof err);
            console.error('[CallButton] Error message:', err instanceof Error ? err.message : String(err));
            console.error('[CallButton] Full error:', err);
            console.error('=== [CallButton] ERROR END ===');
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    if (variant === 'icon') {
        return (
            <div className="relative">
                <button
                    onClick={(e) => initiateCall(e)}
                    disabled={isLoading}
                    className={`p-2 rounded-lg transition-all ${isLoading
                        ? 'bg-gray-100 cursor-not-allowed'
                        : success
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        } ${className}`}
                    title={patientName ? `Llamar a ${patientName}` : 'Iniciar llamada'}
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : success ? (
                        <PhoneCall className="w-5 h-5" />
                    ) : (
                        <Phone className="w-5 h-5" />
                    )}
                </button>
                {error && (
                    <div className="absolute top-full mt-2 right-0 bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-10">
                        {error}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <button
                onClick={(e) => initiateCall(e)}
                disabled={isLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${isLoading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : success
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    } ${className}`}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Iniciando llamada...</span>
                    </>
                ) : success ? (
                    <>
                        <PhoneCall className="w-5 h-5" />
                        <span>Llamada iniciada</span>
                    </>
                ) : (
                    <>
                        <Phone className="w-5 h-5" />
                        <span>Llamar {patientName ? `a ${patientName}` : 'paciente'}</span>
                    </>
                )}
            </button>
            {error && (
                <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">
                    {error}
                </div>
            )}
        </div>
    );
}
