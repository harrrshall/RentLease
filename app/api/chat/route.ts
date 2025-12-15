
import { google } from '@ai-sdk/google';
import { streamObject } from 'ai';
import { PDROutputSchema } from '@/lib/schema';
import { searchVectorStore } from '@/lib/vector-store';
import { logger } from '@/lib/logger'; // Assuming logger is defined here

export const maxDuration = 60;

export async function POST(req: Request) {
    const start = Date.now();
    const ip = req.headers.get('x-forwarded-for') || 'unknown';

    let userQuery = '';

    try {
        const { messages } = await req.json();
        const lastMessage = messages[messages.length - 1];
        userQuery = lastMessage.content;

        logger.info('Incoming chat request', {
            event: 'chat_start',
            ip,
            query_length: userQuery.length
        });

        // Step A: Semantic Retrieval
        // console.log(`Retrieving context for: ${userQuery}`); // Removed in favor of structured logging
        let contextEntries: Awaited<ReturnType<typeof searchVectorStore>> = [];
        try {
            contextEntries = await searchVectorStore(userQuery, 5);
            logger.info('Context retrieved', {
                event: 'retrieval_success',
                count: contextEntries.length
            });
        } catch (error) {
            logger.error('Vector store search failed', {
                event: 'retrieval_error',
                error: (error as Error).message
            });
            // Proceed without context
        }

        const contextString = contextEntries.map((entry, i) => `
Case #${i + 1}: ${entry.metadata.title}
Trigger: ${entry.metadata.the_trigger}
Mistake: ${entry.metadata.the_fatal_mistake}
Summary: ${entry.metadata.summary}
Consensus: ${entry.metadata['community_consensus'] || 'N/A'}
Quote: ${entry.metadata.brutal_reality_quotes?.[0] || 'N/A'}
`).join('\n---\n');

        // Step B: Synthesis via LLM
        const systemPrompt = `You are a PDR (Problem–Diagnosis–Resolution) Decision Engine for rental housing disputes.
Your role is to help tenants and landlords make clear, defensible decisions using prior real-world cases.

You are NOT a general assistant.
You do NOT provide generic advice, moral opinions, or speculative legal claims.

You must operate under the following rules:

RULES
1. Ground all reasoning in the provided case context.
   - If information is missing, explicitly say what cannot be concluded.
2. Prefer practical operator decisions over theory.
3. Be concise, structured, and decisive.
4. Assume the reader is time-poor and risk-aware.
5. Never invent laws, citations, or outcomes.
6. If no relevant case exists, say: "No closely matching precedent found."

----------------------------
CONTEXT (Retrieved Case Data)
----------------------------
${contextString}

----------------------------
USER QUERY
----------------------------
"${userQuery}"

----------------------------
TASK
----------------------------
Analyze the user’s situation using the retrieved cases and generate a structured PDR response with the following sections:

1. DIAGNOSIS
   - Classify the core issue (e.g. Unauthorized Alteration, Non-Payment, Habitability Dispute).
   - Explain why this classification fits based on precedent.

2. RISK ASSESSMENT
   - Legal exposure (low / medium / high) with justification.
   - Financial downside if mishandled.
   - Operational or relationship risk (retaliation, escalation, vacancy risk).

3. DECISION TREE
   - List 2–4 concrete options.
   - For each option:
     • When it is appropriate  
     • Likely outcome based on similar cases  
     • Primary risk

4. REALITY CHECK
   - Provide one blunt insight or quote drawn from similar cases that reflects what actually happens in practice.

5. PRE-MORTEM CHECKLIST
   - List key facts that must be verified before acting (documents, timelines, permissions, notices, condition evidence).

OUTPUT STYLE
- Use short paragraphs or bullet points.
- No fluff, no empathy language, no disclaimers.
- Write as an expert operator advising another operator.

If the retrieved context is weak or irrelevant:
- State that clearly.
- Ask for the minimum additional facts needed to proceed.

`;

        // console.log('Generating response...');

        const result = await streamObject({
            model: google('gemini-2.5-flash-lite'),
            schema: PDROutputSchema,
            prompt: systemPrompt,
            onFinish: ({ object, error, usage }) => {
                const duration = Date.now() - start;
                // console.log('>> STREAM FINISHED <<');
                if (error) {
                    logger.error('Stream finished with error', {
                        event: 'stream_error',
                        ip,
                        query: userQuery,
                        duration_ms: duration,
                        error: error
                    });
                } else {
                    logger.info('Stream completed successfully', {
                        event: 'stream_success',
                        ip,
                        query: userQuery,
                        duration_ms: duration,
                        token_usage: usage
                    });
                    // console.log('Generated Object:', JSON.stringify(object, null, 2));
                    // console.log('Token Usage:', usage);
                }
            },
        });

        return result.toTextStreamResponse();

    } catch (error) {
        const duration = Date.now() - start;
        logger.error('Unhandled API error', {
            event: 'api_error',
            ip,
            query: userQuery,
            duration_ms: duration,
            error: (error as Error).message
        });
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}
