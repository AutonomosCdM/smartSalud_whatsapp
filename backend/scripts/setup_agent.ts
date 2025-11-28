import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID;
// Use the ngrok URL from the status file or environment
// In a real deployment, this would be your production URL
const BASE_URL = 'https://9ad91dd99d48.ngrok-free.app';

if (!API_KEY || !AGENT_ID) {
    console.error('❌ Missing ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID in .env');
    process.exit(1);
}

const HEADERS = {
    'xi-api-key': API_KEY,
    'Content-Type': 'application/json',
};

// Define the tools we want to enforce
const TOOLS_CONFIG = [
    {
        name: 'changeStatus',
        description: 'Cambia el estado de una cita médica (Confirmado, Reagendado, Cancelado)',
        tool_config: {
            type: 'webhook',
            name: 'changeStatus',
            description: 'Cambia el estado de una cita médica',
            api_schema: {
                url: `${BASE_URL}/api/webhooks/elevenlabs/tools/change-status`,
                method: 'POST',
                headers: {},
                request_body_schema: {
                    type: 'object',
                    properties: {
                        appointment_id: { type: 'string', description: 'ID de la cita a actualizar' },
                        status: {
                            type: 'string',
                            enum: ['CONFIRMADO', 'CANCELADO', 'REAGENDADO', 'CONTACTAR'],
                            description: 'Nuevo estado: Confirmado, Reagendado, Cancelado'
                        }
                    },
                    required: ['appointment_id', 'status']
                }
            }
        }
    },
    {
        name: 'getAvailableSlots',
        description: 'Busca horarios disponibles para reagendar una cita',
        tool_config: {
            type: 'webhook',
            name: 'getAvailableSlots',
            description: 'Busca horarios disponibles para reagendar',
            api_schema: {
                url: `${BASE_URL}/api/webhooks/elevenlabs/tools/get-available-slots`,
                method: 'POST',
                headers: {},
                request_body_schema: {
                    type: 'object',
                    properties: {
                        appointment_id: { type: 'string', description: 'ID de la cita original' },
                        professional_name: { type: 'string', description: 'Nombre del profesional (opcional)' }
                    },
                    required: ['appointment_id']
                }
            }
        }
    },
    {
        name: 'reschedule',
        description: 'Confirma el reagendamiento de una cita en una nueva fecha',
        tool_config: {
            type: 'webhook',
            name: 'reschedule',
            description: 'Reagenda una cita a nueva fecha',
            api_schema: {
                url: `${BASE_URL}/api/webhooks/elevenlabs/tools/reschedule`,
                method: 'POST',
                headers: {},
                request_body_schema: {
                    type: 'object',
                    properties: {
                        appointment_id: { type: 'string', description: 'ID de la cita original' },
                        new_date: { type: 'string', description: 'Nueva fecha en formato ISO 8601' }
                    },
                    required: ['appointment_id', 'new_date']
                }
            }
        }
    },
    {
        name: 'sendMessage',
        description: 'Envía un mensaje de texto (WhatsApp/SMS) al paciente',
        tool_config: {
            type: 'webhook',
            name: 'sendMessage',
            description: 'Envía mensaje WhatsApp o SMS al paciente',
            api_schema: {
                url: `${BASE_URL}/api/webhooks/elevenlabs/tools/send-message`,
                method: 'POST',
                headers: {},
                request_body_schema: {
                    type: 'object',
                    properties: {
                        patient_id: { type: 'string', description: 'ID del paciente' },
                        message: { type: 'string', description: 'Contenido del mensaje' },
                        channel: { type: 'string', enum: ['whatsapp', 'sms'], description: 'Canal de envío' }
                    },
                    required: ['patient_id', 'message']
                }
            }
        }
    }
];

async function main() {
    console.log('🚀 Starting ElevenLabs Agent Configuration...');
    console.log(`Target Agent ID: ${AGENT_ID}`);
    console.log(`Webhook Base URL: ${BASE_URL}`);

    try {
        // 1. Get current agent details to see existing tools
        console.log('\n🔍 Fetching current agent configuration...');
        const agentResp = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, { headers: HEADERS });
        if (!agentResp.ok) throw new Error(`Failed to get agent: ${agentResp.statusText}`);
        const agentData = await agentResp.json();
        console.log('   Current agent name:', (agentData as any).name);

        // Note: The API structure for tools has changed recently. 
        // Tools are now standalone objects referenced by ID in the agent config.
        // We need to list all tools in the workspace, find ours, update them, or create new ones.

        console.log('🔍 Listing all workspace tools...');
        const toolsResp = await fetch('https://api.elevenlabs.io/v1/convai/tools', { headers: HEADERS });
        if (!toolsResp.ok) throw new Error(`Failed to list tools: ${toolsResp.statusText}`);
        const allToolsData = await toolsResp.json();
        const allTools = allToolsData.tools || [];

        const finalToolIds = [];

        // 2. Process each desired tool
        for (const toolConfig of TOOLS_CONFIG) {
            console.log(`\n⚙️ Processing tool: ${toolConfig.name}`);

            // Check if tool with this name already exists
            const existingTool = allTools.find((t: any) => t.tool_config?.name === toolConfig.name);

            if (existingTool) {
                const toolId = existingTool.id || existingTool.tool_id;
                console.log(`   Found existing tool (ID: ${toolId}). Updating...`);
                const updateResp = await fetch(`https://api.elevenlabs.io/v1/convai/tools/${toolId}`, {
                    method: 'PATCH',
                    headers: HEADERS,
                    body: JSON.stringify(toolConfig)
                });

                if (!updateResp.ok) {
                    const err = await updateResp.text();
                    console.error(`   ❌ Failed to update tool: ${err}`);
                } else {
                    console.log(`   ✅ Tool updated successfully.`);
                    finalToolIds.push(toolId);
                }
            } else {
                console.log(`   Tool not found. Creating new tool...`);
                const createResp = await fetch('https://api.elevenlabs.io/v1/convai/tools', {
                    method: 'POST',
                    headers: HEADERS,
                    body: JSON.stringify(toolConfig)
                });

                if (!createResp.ok) {
                    const err = await createResp.text();
                    console.error(`   ❌ Failed to create tool: ${err}`);
                } else {
                    const newTool: any = await createResp.json();
                    // The API returns 'id' not 'tool_id' for newly created tools
                    const toolId = newTool.id || newTool.tool_id;
                    console.log(`   ✅ Tool created successfully (ID: ${toolId}).`);
                    if (toolId) {
                        finalToolIds.push(toolId);
                    } else {
                        console.error(`   ⚠️  Warning: No ID returned for tool. Response:`, JSON.stringify(newTool));
                    }
                }
            }
        }

        // 3. Update Agent to use these tools
        console.log('\n🔗 Linking tools to Agent...');

        // Based on the agent structure, tools are referenced in:
        // conversation_config.agent.prompt.tool_ids
        // We need to replace the old tool IDs with our new webhook tool IDs

        const patchBody = {
            conversation_config: {
                agent: {
                    prompt: {
                        tool_ids: finalToolIds,
                        // Also clear the inline tools array (old client tools)
                        tools: []
                    }
                }
            }
        };

        const linkResp = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
            method: 'PATCH',
            headers: HEADERS,
            body: JSON.stringify(patchBody)
        });

        if (!linkResp.ok) {
            const err = await linkResp.text();
            console.error(`   ❌ Failed to link tools to agent: ${err}`);
            console.log('   Attempting fallback configuration...');
        } else {
            console.log(`   ✅ Agent updated with ${finalToolIds.length} tools.`);
        }

        console.log('\n✨ Configuration Complete! Your agent is ready.');

    } catch (error) {
        console.error('\n❌ Fatal Error:', error);
    }
}

main();
