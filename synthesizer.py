import json
import os
import numpy as np
from sklearn.cluster import KMeans
from google import genai
from google.genai import types
from tqdm.asyncio import tqdm_asyncio
import asyncio
import time

# ==========================================
# CONFIGURATION
# ==========================================
GOOGLE_API_KEY = "AIzaSyArBTAFyI1-Zv-sUwohTDh2E-W1YuoWVpc"
INPUT_FILE = "extracted_failure_modes.jsonl"
OUTPUT_DIR = "pedia_entries"

EMBEDDING_MODEL = "text-embedding-004"
GENERATION_MODEL = "gemini-2.5-flash-lite"
NUM_CLUSTERS = 15
MAX_CONCURRENT_REQUESTS = 5 
MAX_RETRIES = 3              
# ==========================================

client = genai.Client(api_key=GOOGLE_API_KEY)

# ==========================================
# HELPER: Numpy Safe JSON Encoder
# ==========================================
class NumpyEncoder(json.JSONEncoder):
    """ Special json encoder for numpy types """
    def default(self, obj):
        if isinstance(obj, (np.int_, np.intc, np.intp, np.int8,
                            np.int16, np.int32, np.int64, np.uint8,
                            np.uint16, np.uint32, np.uint64)):
            return int(obj)
        elif isinstance(obj, (np.float_, np.float16, np.float32,
                              np.float64)):
            return float(obj)
        elif isinstance(obj, (np.ndarray,)):
            return obj.tolist()
        return json.JSONEncoder.default(self, obj)

# ==========================================
# HELPER: Async Retry Logic
# ==========================================
async def retry_with_backoff(func, *args, **kwargs):
    for attempt in range(MAX_RETRIES):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            wait_time = 2 ** attempt
            print(f"    [Warning] Error: {e}. Retrying in {wait_time}s...")
            await asyncio.sleep(wait_time)
    print(f"    [Error] Failed after {MAX_RETRIES} attempts.")
    return None

# ==========================================
# CORE FUNCTIONS
# ==========================================

def load_data(filepath):
    data = []
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                data.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return data

async def generate_embeddings_async(text_list):
    print(f"Generating embeddings for {len(text_list)} items...")
    batch_size = 100
    batches = [text_list[i:i + batch_size] for i in range(0, len(text_list), batch_size)]
    sem = asyncio.Semaphore(10)

    async def process_batch(batch):
        async with sem:
            result = await retry_with_backoff(
                client.aio.models.embed_content,
                model=EMBEDDING_MODEL,
                contents=batch,
                config=types.EmbedContentConfig(task_type="CLUSTERING")
            )
            if result:
                return [e.values for e in result.embeddings]
            else:
                return [[0.0]*768] * len(batch)

    tasks = [process_batch(b) for b in batches]
    results = await tqdm_asyncio.gather(*tasks, desc="Embedding Batches")
    return np.array([item for sublist in results for item in sublist])

def cluster_data(data, embeddings, n_clusters):
    """
    Clusters data and sanitizes NumPy types to standard Python types.
    """
    print(f"Clustering into {n_clusters} topics...")
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(embeddings)
    
    clusters = {}
    for i, label in enumerate(labels):
        # SAFETY FIX: Convert numpy int32 to python int
        label = int(label)
        if label not in clusters:
            clusters[label] = []
        clusters[label].append(data[i])
        
    return clusters

async def generate_pedia_entry_async(cluster_id, cluster_items, semaphore):
    """
    Generates a high-signal, mechanism-accurate Pedia entry for a cluster.
    Focuses on causality, operator failure modes, and repeatable patterns.
    """
    async with semaphore:

        # --------------------------------------------------
        # 1. SCORING + SIGNAL EXTRACTION
        # --------------------------------------------------
        def score_case(item):
            score = 0
            if item.get("financial_cost"): score += 4
            if item.get("fatal_mistake"): score += 4
            if item.get("escalation_timeline"): score += 3
            if item.get("brutal_reality_quote"): score += 2
            return score

        ranked = sorted(cluster_items, key=score_case, reverse=True)

        # Take top hard-signal cases, not arbitrary count
        core_cases = ranked[:10]
        supporting_cases = ranked[10:25]

        def extract_field(items, field):
            return [i.get(field) for i in items if i.get(field)]

        triggers = extract_field(core_cases, "trigger_event")
        mistakes = extract_field(core_cases, "fatal_mistake")
        escalations = extract_field(core_cases, "escalation_timeline")
        costs = extract_field(core_cases, "financial_cost")
        quotes = extract_field(core_cases, "brutal_reality_quote")

        # --------------------------------------------------
        # 2. CONTEXT PACKET (FACT-ONLY)
        # --------------------------------------------------
        context = {
            "cluster_id": cluster_id,
            "case_count": len(cluster_items),
            "common_triggers": triggers[:7],
            "common_fatal_mistakes": mistakes[:7],
            "escalation_patterns": escalations[:7],
            "financial_examples": costs[:5],
            "operator_quotes": quotes[:5]
        }

        prompt = f"""
You are the Editor-in-Chief of "Tenants & Landlords Pedia".

You are analyzing a FAILURE MODE CLUSTER derived from real operator case studies.
Your job is to identify the *underlying mechanism* that causes this failure mode to repeat.

IMPORTANT RULES:
- Do NOT invent facts.
- Only generalize patterns that clearly repeat in the provided data.
- Write for experienced landlords and property managers.
- Focus on causality, incentives, blind spots, and delayed consequences.
- Be precise, not verbose.

SOURCE DATA (FACTS ONLY):
{json.dumps(context, indent=2)}

OUTPUT MUST FOLLOW THIS EXACT JSON FORMAT:
{{
  "title": "Short, mechanism-level title (not a symptom)",
  "severity_score": "Integer 1-10 based on asset risk",
  "summary": "2 tight sentences explaining why this failure repeats.",
  "the_trigger": "The recurring initiating condition.",
  "the_escalation": "Step-by-step chain reaction once triggered.",
  "the_fatal_mistake": "The specific operator decision or inaction that locks in damage.",
  "brutal_reality_quotes": ["Exact or lightly cleaned quotes from data"],
  "pre_mortem_checklist": [
    "Question an operator should ask BEFORE this failure starts",
    "Early warning signal most people ignore",
    "Decision rule that would have prevented escalation"
  ],
  "financial_impact": "Conservative loss range with explanation"
}}

Respond ONLY with valid JSON.
"""

        response = await retry_with_backoff(
            client.aio.models.generate_content,
            model=GENERATION_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.15,
                top_p=0.85
            )
        )

        if response and response.text:
            try:
                return cluster_id, json.loads(response.text)
            except json.JSONDecodeError:
                print(f"[Error] Cluster {cluster_id}: Invalid JSON returned.")
                return cluster_id, None

        return cluster_id, None


# ==========================================
# MAIN
# ==========================================

async def main():
    if not os.path.exists(INPUT_FILE):
        print(f"File {INPUT_FILE} not found!")
        return
    all_cases = load_data(INPUT_FILE)
    
    text_to_embed = [f"{c.get('trigger_event', '')} {c.get('fatal_mistake', '')}" for c in all_cases]
    embeddings = await generate_embeddings_async(text_to_embed)

    # Use to_thread for CPU-bound clustering
    clusters = await asyncio.to_thread(cluster_data, all_cases, embeddings, NUM_CLUSTERS)

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    print("Synthesizing Pedia Entries Concurrently...")
    gen_semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
    
    tasks = []
    for cluster_id, items in clusters.items():
        task = generate_pedia_entry_async(cluster_id, items, gen_semaphore)
        tasks.append(task)

    failed_clusters = []
    
    for finished_task in tqdm_asyncio.as_completed(tasks, desc="Generating Entries"):
        try:
            cluster_id, entry = await finished_task
            
            if entry:
                filename = f"{OUTPUT_DIR}/entry_{cluster_id}.json"
                # Safe writing using standard open (fast enough for small JSONs)
                with open(filename, 'w', encoding='utf-8') as f:
                    # Use NumpyEncoder here just in case any other numpy types slipped through
                    json.dump(entry, f, indent=4, cls=NumpyEncoder)
            else:
                failed_clusters.append(cluster_id)
        except Exception as e:
            print(f"Error saving task: {e}")

    print(f"\nSynthesis Complete.")
    if failed_clusters:
        print(f"Failed clusters: {failed_clusters}")

if __name__ == "__main__":
    asyncio.run(main())