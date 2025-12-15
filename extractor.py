import os
import json
import asyncio
import time
import google.generativeai as genai
from tqdm.asyncio import tqdm_asyncio

# ==========================================
# CONFIGURATION
# ==========================================
GOOGLE_API_KEY = "AIzaSyArBTAFyI1-Zv-sUwohTDh2E-W1YuoWVpc" 

# Files
INPUT_FILE = "all_rental_data.json"
OUTPUT_FILE = "extracted_failure_modes.jsonl" # Note the .jsonl extension

# Limits & Tuning
# Although you have 4k RPM, we limit concurrency to avoid hitting the 
# TPM (Token) limit too fast with large prompts. 
MAX_CONCURRENT_REQUESTS = 50 
MIN_POST_SCORE = 0
MAX_COMMENTS_TO_FEED = 50
# ==========================================

# Setup Gemini
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel(
    "gemini-2.5-flash-lite",
    generation_config={"response_mime_type": "application/json"}
)

def format_thread_for_llm(post):
    """Prepares the text prompt."""
    text_buffer = f"TITLE: {post.get('title', 'N/A')}\n"
    text_buffer += f"SUBREDDIT: {post.get('subreddit', 'N/A')}\n"
    text_buffer += f"POST BODY:\n{post.get('body', '')}\n\n"
    text_buffer += "TOP COMMENTS:\n"
    
    comments = post.get('comments', [])
    if comments:
        sorted_comments = sorted(comments, key=lambda x: x.get('score', 0), reverse=True)
        for comment in sorted_comments[:MAX_COMMENTS_TO_FEED]:
            indent = "  " * comment.get('level', 0)
            text_buffer += f"{indent}- [Score: {comment.get('score',0)}] {comment.get('author','Unknown')}: {comment.get('text','')}\n"
        
    return text_buffer

def get_processed_urls():
    """Reads the existing output file to find which URLs are already done."""
    processed = set()
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    data = json.loads(line)
                    if 'source_url' in data:
                        processed.add(data['source_url'])
                except json.JSONDecodeError:
                    continue
    return processed

async def process_single_post(semaphore, post):
    """
    The worker function. Handles one post, respects the semaphore limit, 
    and handles errors silently.
    """
    async with semaphore:
        try:
            formatted_text = format_thread_for_llm(post)
            
            prompt = f"""
            SYSTEM ROLE:
            You are a forensic analyst specializing in rental property operations, disputes, and failure analysis.
            You do not give advice. You document what went wrong, how it escalated, and what the community recognized as the fix.
            
            STRICT OUTPUT RULES (CRITICAL):
            - Output MUST be a single valid JSON object
            - Do NOT include markdown, commentary, or explanations
            - Do NOT include trailing commas
            - Use plain strings only
            - If information is missing, use null
            - If unsure, make the most conservative inference based ONLY on the thread
            - Financial values must be rough estimates or ranges, not precise unless explicitly stated
            
            TASK:
            Analyze the following Reddit rental-related thread and extract the core operational failure.
            
            THREAD DATA:
            {formatted_text}
            
            EXTRACTION SCHEMA (FOLLOW EXACTLY):
            
            {{
              "case_title": "Short, concrete title describing the failure (e.g. 'Ignored Leak Becomes Mold Eviction')",
              "trigger_event": "The initial event or complaint that started the issue",
              "fatal_mistake": "The single decision, omission, or behavior that made the outcome unavoidable",
              "escalation_timeline": [
                "Step 1: What happened next",
                "Step 2: How the situation worsened",
                "Step 3: Final outcome or breaking point"
              ],
              "financial_cost": "Approximate loss or impact (e.g. '$2k–$5k repair', 'Lost 2 months rent', 'Legal risk only')",
              "emotional_state": "Dominant emotion expressed by the landlord, tenant, or manager (e.g. frustration, panic, anger, burnout)",
              "community_consensus": "What the majority of commenters agreed should have been done",
              "brutal_reality_quote": "A short, direct quote from the thread or comments that captures the hard truth",
              "tags": [
                "Maintenance",
                "Communication",
                "Legal",
                "Screening",
                "CashFlow",
                "Compliance",
                "Neglect",
                "ProcessFailure"
              ]
            }}
            
            IMPORTANT CONSTRAINTS:
            - Do NOT invent legal outcomes or court decisions
            - Do NOT normalize or justify behavior
            - Focus on SYSTEM FAILURE, not moral judgment
            - If comments disagree, summarize the dominant pattern
            - Avoid generic advice like 'communicate better'
            
            RETURN ONLY THE JSON OBJECT.
            """
            
            
            # ASYNC API CALL
            response = await model.generate_content_async(prompt)
            
            result = json.loads(response.text)
            
            # Attach metadata
            result['source_url'] = post.get('url')
            result['original_score'] = post.get('score')
            result['subreddit'] = post.get('subreddit')
            
            return result

        except Exception as e:
            # We explicitly return None on failure so the main loop knows to skip it
            # We do NOT raise the exception, keeping the loop alive.
            return None

async def main():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found.")
        return

    # 1. Load Input Data
    print(f"Loading {INPUT_FILE}...")
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        all_posts = json.load(f)

    # 2. Check Resume State
    processed_urls = get_processed_urls()
    print(f"Found {len(processed_urls)} already processed threads in {OUTPUT_FILE}.")

    # 3. Filter for work needed
    # We filter by score AND check if URL is NOT in processed list
    posts_to_process = [
        p for p in all_posts 
        if p.get('score', 0) >= MIN_POST_SCORE 
        and p.get('url') not in processed_urls
    ]

    if not posts_to_process:
        print("All valid posts have already been processed!")
        return

    print(f"Starting Asynchronous Processing for {len(posts_to_process)} threads...")
    print(f"Max Concurrency: {MAX_CONCURRENT_REQUESTS}")

    # 4. Async Execution
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
    tasks = [process_single_post(semaphore, post) for post in posts_to_process]

    # Use tqdm to show a progress bar
    # We open the file in Append mode ('a') so we can write results as they come in
    with open(OUTPUT_FILE, 'a', encoding='utf-8') as f_out:
        for future in tqdm_asyncio.as_completed(tasks, total=len(tasks)):
            result = await future
            
            if result:
                # Write immediately to disk (JSONL format)
                # This ensures if script crashes, data is saved.
                json.dump(result, f_out)
                f_out.write('\n') 
                f_out.flush() # Force write to disk

    print(f"\nJob Complete. Results saved to {OUTPUT_FILE}")
    print("If there were errors, simply re-run this script. It will auto-detect missing items and retry them.")

if __name__ == "__main__":
    asyncio.run(main())