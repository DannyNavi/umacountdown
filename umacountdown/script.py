import re
import json

with open("data.js", "r", encoding="utf-8") as f:
    text = f.read()

pattern = re.compile(
    r'''
    id:\s*"(?P<id>\d+)",
    \s*name:\s*"(?P<name>.*?)",
    \s*release_date:\s*"(?P<release_date>\d{4}-\d{2}-\d{2})",
    \s*rarity:\s*(?P<rarity>\d+),
    \s*href:\s*"(?P<href>.*?)",
    \s*image:\s*"(?P<image>.*?)",
    \s*full_image:\s*"(?P<full_image>.*?)",
    ''',
    re.DOTALL | re.VERBOSE
)

cards = []

for match in pattern.finditer(text):
    cards.append(match.groupdict())

print(f"Found {len(cards)} cards.")

with open("global_cards.json", "w", encoding="utf-8") as f:
    json.dump(cards, f, indent=2, ensure_ascii=False)

print("Saved to global_cards.json")