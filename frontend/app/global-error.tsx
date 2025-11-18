'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log critical error to error reporting service
    console.error('[Global Error Boundary]:', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
          <div className="max-w-md w-full">
            <div className="bg-red-950/50 border border-red-900/50 rounded-2xl p-8">
              <div className="flex flex-col items-center text-center">
                <AlertTriangle className="w-20 h-20 text-red-500 mb-4" />
                <h1 className="text-3xl font-bold text-white mb-2">
                  Critical Error
                </h1>
                <p className="text-gray-300 mb-4">
                  The application encountered a critical error and cannot continue.
                </p>
                <p className="text-sm text-gray-400 mb-6">
                  {error.message || 'An unexpected error occurred.'}
                </p>
                {error.digest && (
                  <p className="text-xs text-gray-500 mb-6 font-mono">
                    Error ID: {error.digest}
                  </p>
                )}
                <button
                  onClick={reset}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                >
                  Reload Application
                </button>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}