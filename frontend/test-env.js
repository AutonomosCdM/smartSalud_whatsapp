// Quick test to verify environment variable is loaded
console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
console.log('All NEXT_PUBLIC vars:', Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC')));
