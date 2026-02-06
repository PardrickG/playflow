import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

async function main() {
    try {
        const message = await anthropic.messages.create({
            max_tokens: 1024,
            messages: [{ role: 'user', content: 'Hello, world' }],
            model: 'claude-3-haiku-20240307',
        });
        console.log('Success:', message.content);
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
