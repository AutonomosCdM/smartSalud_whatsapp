import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID;

if (!API_KEY || !AGENT_ID) {
    console.error('❌ Missing credentials');
    process.exit(1);
}

async function checkAgent() {
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
        headers: { 'xi-api-key': API_KEY as string }
    });

    const agent: any = await response.json();

    console.log('Full Agent Configuration:');
    console.log(JSON.stringify(agent, null, 2));
}

checkAgent();
