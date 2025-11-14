import json

with open("leetcode-train.jsonl", "r", encoding="utf-8") as f:
    for i, line in enumerate(f):
        if i == 3:  # show first 3 entries
            break
        print(json.loads(line))