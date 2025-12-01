import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const API_KEY = process.env.ELEVENLABS_API_KEY;

if (!API_KEY) {
    console.error('❌ Missing ELEVENLABS_API_KEY');
    process.exit(1);
}

async function listTools() {
    const response = await fetch('https://api.elevenlabs.io/v1/convai/tools', {
        headers: { 'xi-api-key': API_KEY }
    });

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
}

listTools();
