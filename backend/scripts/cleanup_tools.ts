import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const API_KEY = process.env.ELEVENLABS_API_KEY;

if (!API_KEY) {
    console.error('❌ Missing ELEVENLABS_API_KEY');
    process.exit(1);
}

const HEADERS = {
    'xi-api-key': API_KEY,
    'Content-Type': 'application/json',
};

// Tools to keep (webhooks we just created)
const TOOLS_TO_KEEP = ['changeStatus', 'sendMessage', 'getAvailableSlots', 'reschedule'];

async function cleanupOldTools() {
    console.log('🧹 Cleaning up old client tools...\n');

    // List all tools
    const response = await fetch('https://api.elevenlabs.io/v1/convai/tools', {
        headers: HEADERS
    });

    const data: any = await response.json();
    const allTools = data.tools || [];

    console.log(`Found ${allTools.length} total tools\n`);

    for (const tool of allTools) {
        const toolName = tool.tool_config.name;
        const toolType = tool.tool_config.type;
        const toolId = tool.id;

        // Delete if it's a client tool OR if it's not in our keep list
        if (toolType === 'client' || !TOOLS_TO_KEEP.includes(toolName)) {
            console.log(`🗑️  Deleting: ${toolName} (${toolType})`);

            const deleteResp = await fetch(`https://api.elevenlabs.io/v1/convai/tools/${toolId}`, {
                method: 'DELETE',
                headers: HEADERS
            });

            if (deleteResp.ok) {
                console.log(`   ✅ Deleted successfully\n`);
            } else {
                const error = await deleteResp.text();
                console.log(`   ❌ Failed to delete: ${error}\n`);
            }
        } else {
            console.log(`✅ Keeping: ${toolName} (${toolType})`);
        }
    }

    console.log('\n✨ Cleanup complete!');
}

cleanupOldTools();
