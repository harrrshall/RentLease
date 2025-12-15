
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { google } from '@ai-sdk/google';
import { embedMany } from 'ai';

dotenv.config({ path: '.env.local' });

const PEDIA_DIR = path.join(process.cwd(), 'pedia_entries');
const OUTPUT_FILE = path.join(process.cwd(), 'data', 'vector_store.json');

interface PediaEntry {
    title: string;
    summary: string;
    the_trigger: string;
    the_fatal_mistake: string;
    [key: string]: any;
}

interface VectorEntry {
    id: string;
    content: string;
    embedding: number[];
    metadata: PediaEntry;
}

async function main() {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        console.error('Error: GOOGLE_GENERATIVE_AI_API_KEY is not set in .env.local');
        process.exit(1);
    }

    // console.log('Reading pedia entries...');
    const files = fs.readdirSync(PEDIA_DIR).filter(f => f.endsWith('.json'));
    const entries: { id: string; data: PediaEntry; textToEmbed: string }[] = [];

    for (const file of files) {
        const content = fs.readFileSync(path.join(PEDIA_DIR, file), 'utf-8');
        const data = JSON.parse(content) as PediaEntry;

        // Construct rich context for embedding
        const textToEmbed = `Title: ${data.title}
Summary: ${data.summary}
Trigger Event: ${data.the_trigger}
Fatal Mistake: ${data.the_fatal_mistake}`;

        entries.push({
            id: file,
            data,
            textToEmbed,
        });
    }

    // console.log(`Found ${entries.length} entries. Generating embeddings...`);

    // Process in chunks to avoid rate limits if necessary, though embedMany handles batching
    // using text-embedding-004 model
    const embeddingModel = google.textEmbeddingModel('text-embedding-004');

    try {
        const { embeddings } = await embedMany({
            model: embeddingModel,
            values: entries.map(e => e.textToEmbed),
        });

        // console.log(`Generated ${embeddings.length} embeddings.`);

        const vectorStore: VectorEntry[] = entries.map((entry, index) => ({
            id: entry.id,
            content: entry.textToEmbed,
            embedding: embeddings[index],
            metadata: entry.data,
        }));

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(vectorStore, null, 2));
        // console.log(`Saved vector store to ${OUTPUT_FILE}`);
    } catch (error) {
        console.error('Error generating embeddings:', error);
        process.exit(1);
    }
}

main();
