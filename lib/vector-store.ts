
import fs from 'fs';
import path from 'path';
import { google } from '@ai-sdk/google';
import { embed } from 'ai';

const VECTOR_STORE_PATH = path.join(process.cwd(), 'data', 'vector_store.json');

export interface PediaEntry {
    title: string;
    summary: string;
    the_trigger: string;
    the_fatal_mistake: string;
    severity_score?: number;
    brutal_reality_quotes?: string[];
    pre_mortem_checklist?: string[];
    financial_impact?: string;
    [key: string]: any;
}

interface VectorEntry {
    id: string;
    content: string;
    embedding: number[];
    metadata: PediaEntry;
}

// Simple cosine similarity
function cosineSimilarity(a: number[], b: number[]) {
    if (a.length !== b.length) return 0;
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        magnitudeA += a[i] * a[i];
        magnitudeB += b[i] * b[i];
    }
    const mag = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
    return mag === 0 ? 0 : dotProduct / mag;
}

let vectorStoreCache: VectorEntry[] | null = null;
let lastLoadTime = 0;

function getVectorStore(): VectorEntry[] {
    // Check if file has changed since last load (reload if needed, simple approach)
    // Or just load if cache is null.
    if (!fs.existsSync(VECTOR_STORE_PATH)) {
        console.warn(`Vector store not found at ${VECTOR_STORE_PATH}. Returning empty store.`);
        return [];
    }

    // Reload cache if file changed? For now, simple caching is fine, but let's make it safe.
    if (vectorStoreCache) return vectorStoreCache;

    try {
        const content = fs.readFileSync(VECTOR_STORE_PATH, 'utf-8');
        vectorStoreCache = JSON.parse(content);
        // console.log(`Loaded ${vectorStoreCache?.length} entries from vector store.`);
        return vectorStoreCache!;
    } catch (error) {
        console.error('Failed to parse vector store:', error);
        return [];
    }
}

export async function searchVectorStore(query: string, topK = 5, threshold = 0.3) {
    const store = getVectorStore();
    if (store.length === 0) return [];

    let queryEmbedding: number[] = [];

    try {
        const { embedding } = await embed({
            model: google.textEmbeddingModel('text-embedding-004'),
            value: query,
        });
        queryEmbedding = embedding;
    } catch (error) {
        console.error('Embedding generation failed:', error);
        return [];
    }

    const scoredEntries = store.map(entry => ({
        ...entry,
        score: cosineSimilarity(queryEmbedding, entry.embedding),
    }));

    // Sort by score descending and filter by threshold
    return scoredEntries
        .filter(entry => entry.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
}
