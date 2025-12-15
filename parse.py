import os
import re
import json

def parse_reddit_text_file(file_path):
    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()

    filename = os.path.basename(file_path)
    print(f"Processing: {filename}...")

    # Regex patterns based on your file structure
    subreddit_pattern = re.compile(r"SUBREDDIT: (r/\w+)")
    post_start_pattern = re.compile(r"^POST \d+: (.*)")
    comment_start_pattern = re.compile(r"^(\t*)--- Comment \(Score: (-?\d+)\) ---")
    
    # Data containers
    subreddit_name = "Unknown"
    posts = []
    current_post = None
    current_comment = None
    
    # State flags
    in_comments_section = False
    reading_comment_text = False
    reading_post_content = False

    for i, line in enumerate(lines):
        line = line.rstrip()

        # 1. Extract Subreddit Name (Global)
        if not subreddit_name or subreddit_name == "Unknown":
            sub_match = subreddit_pattern.search(line)
            if sub_match:
                subreddit_name = sub_match.group(1)

        # 2. Detect New Post Start
        post_match = post_start_pattern.match(line)
        if post_match:
            # Save previous post if exists
            if current_post:
                posts.append(current_post)
            
            # Initialize new post
            current_post = {
                "subreddit": subreddit_name,
                "title": post_match.group(1).strip(),
                "body": "",
                "url": "",
                "score": 0,
                "comments": []
            }
            in_comments_section = False
            reading_post_content = False
            continue

        # If we haven't found a post yet, skip (skips header stats/rules)
        if not current_post:
            continue

        # 3. Post Metadata Extraction
        if not in_comments_section:
            if line.startswith("Score (Upvotes):"):
                try:
                    current_post["score"] = int(line.split(":")[1].strip())
                except:
                    current_post["score"] = 0
            elif line.startswith("URL:"):
                current_post["url"] = line.split("URL:", 1)[1].strip()
            elif line.startswith("Post Content:"):
                reading_post_content = True
                continue
            elif line.startswith("--- Top 100 Comments ---"):
                in_comments_section = True
                reading_post_content = False
                continue
            
            # Capture Post Body
            if reading_post_content and not line.startswith("URL:") and not line.startswith("--- Top"):
                current_post["body"] += line + "\n"

        # 4. Comment Extraction
        if in_comments_section:
            comment_match = comment_start_pattern.match(line)
            
            if comment_match:
                # Start a new comment
                tabs = comment_match.group(1)
                score = comment_match.group(2)
                indent_level = len(tabs)
                
                current_comment = {
                    "level": indent_level,
                    "score": int(score),
                    "author": "Unknown",
                    "text": ""
                }
                current_post["comments"].append(current_comment)
                reading_comment_text = False
                continue

            if current_comment:
                clean_line = line.strip()
                if clean_line.startswith("Author:"):
                    current_comment["author"] = clean_line.split("Author:", 1)[1].strip()
                elif clean_line.startswith("Text:"):
                    current_comment["text"] = clean_line.split("Text:", 1)[1].strip() + "\n"
                    reading_comment_text = True
                elif reading_comment_text:
                    # Append multi-line comment text
                    # We check if the line looks like a metadata tag to stop reading
                    if not (clean_line.startswith("Author:") or clean_line.startswith("Timestamp:")):
                        current_comment["text"] += line + "\n"

    # Append the final post
    if current_post:
        posts.append(current_post)

    return posts

def main():
    # Directory containing your txt files
    input_dir = "/home/cybernovas/Desktop/2025/RentLease/data" 
    output_file = "all_rental_data.json"
    
    all_data = []

    # Iterate over all .txt files in the directory
    for filename in os.listdir(input_dir):
        if filename.endswith(".txt"):
            file_path = os.path.join(input_dir, filename)
            file_data = parse_reddit_text_file(file_path)
            all_data.extend(file_data)
            print(f"  -> Extracted {len(file_data)} posts from {filename}")

    # Save to JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, indent=4)

    print(f"\nSUCCESS: Successfully parsed {len(all_data)} total threads into '{output_file}'")

if __name__ == "__main__":
    main()