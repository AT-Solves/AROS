import json, sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from agents.signal_detection_agent import detect_signals

with open(os.path.join(os.path.dirname(__file__), "test_input.json")) as f:
    data = json.load(f)

result = detect_signals(data)

print("confidence:", result["confidence"])
print("severity:", result["severity"])
print("primary_signal:", result["primary_signal"])
print("requires_attention:", result["requires_attention"])
print("log.event:", result["log"]["event"])
print("log.signal_count:", result["log"]["signal_count"])
print("log.primary_issue:", result["log"]["primary_issue"])
for s in result["signals"]:
    print(f"  signal: {s['type']}, change_pct: {s['change_pct']}")
