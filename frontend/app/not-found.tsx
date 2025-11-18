import Link from 'next/link';
import { Home, FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full">
        <div className="bg-card border border-border rounded-2xl p-8">
          <div className="flex flex-col items-center text-center">
            <FileQuestion className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              404 - Page Not Found
            </h2>
            <p className="text-muted-foreground mb-6">
              The page you are looking for doesn&apos;t exist or has been moved.
            </p>
            <Link
              href="/"
              className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg flex items-center gap-2 transition-colors font-medium"
            >
              <Home className="w-5 h-5" />
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}