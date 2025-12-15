
import { z } from 'zod';

export const DecisionOptionSchema = z.object({
    id: z.string(),
    label: z.string(),
    description: z.string(),
    recommended: z.boolean(),
    riskLevel: z.string(), // e.g. Low, Medium, High
});

export const PDROutputSchema = z.object({
    diagnosis: z.object({
        title: z.string(),
        summary: z.string(),
        severity: z.string(), // e.g. Low, Medium, High, Critical
    }),
    riskAssessment: z.object({
        legalRisk: z.string(),
        financialRisk: z.string(),
        score: z.number().min(0).max(100).describe('Overall risk score (0-100)'),
        financialImpactEstimate: z.string().describe('Estimated cost range, e.g. "$500 - $1000"'),
    }),
    decisionTree: z.array(DecisionOptionSchema).describe('List of actionable options'),
    realityCheck: z.object({
        quote: z.string().describe('A relevant quote from the retrieved case studies that highlights the brutal reality'),
        context: z.string().describe('Brief context for the quote'),
    }),
    preMortemChecklist: z.array(z.string()).describe('List of questions to ask to prevent future issues or verify current state'),
});

export type PDROutput = z.infer<typeof PDROutputSchema>;
