# AROS – Diagnosis Agent (Improved Reasoning + Conflict Handling)

import json
import sys
from typing import Dict, Any
from groq import Groq
from config import CONFIG

client = Groq(api_key=CONFIG["groq"]["api_key"])


# ─────────────────────────────────────────────
# PRE-ANALYSIS (STRUCTURED HINTS)
# ─────────────────────────────────────────────
def build_context_insights(data: Dict[str, Any]) -> Dict[str, Any]:

    current = data.get("kpi", {}).get("current", {})
    previous = data.get("kpi", {}).get("previous", {})

    insights = {
        "revenue_growth": current.get("revenue", 0) > previous.get("revenue", 0),
        "latency_increase": current.get("latency_ms", 0) > previous.get("latency_ms", 0),
        "conversion_drop": current.get("conversion_rate", 0) < previous.get("conversion_rate", 0),
        "high_payment_failure": current.get("payment_failure_rate", 0) > 15,
        "high_abandonment": current.get("cart_abandonment_rate", 0) > 60,
    }

    return insights


# ─────────────────────────────────────────────
# PROMPT
# ─────────────────────────────────────────────
def build_prompt(data: Dict[str, Any], insights: Dict[str, Any]) -> str:

    return f"""
You are an expert E-commerce Diagnosis Agent.

Your goal: Identify root causes of revenue/system anomalies using data + signals.

INPUT DATA:
{json.dumps(data, indent=2)}

DERIVED INSIGHTS:
{json.dumps(insights, indent=2)}

---

IMPORTANT REASONING RULES:

1. If revenue increases BUT latency and failures increase:
   → Likely system scaling issue or infrastructure bottleneck

2. If cart abandonment is high:
   → UX, pricing, or performance issue

3. If payment failures are high:
   → payment gateway or transaction system issue

4. If signals conflict:
   → Provide BEST POSSIBLE explanation (do NOT say unknown immediately)

5. Only mark uncertainty = true if NO reasonable hypothesis exists

---

TASK:

- Identify root causes
- Correlate signals + metrics
- Provide primary cause
- Avoid vague answers

---

OUTPUT FORMAT (STRICT JSON):

{{
  "root_causes": ["..."],
  "primary_cause": "...",
  "confidence": 0.0,
  "uncertainty": false
}}
"""


# ─────────────────────────────────────────────
# LLM CALL
# ─────────────────────────────────────────────
def call_llm(prompt: str) -> Dict[str, Any]:

    try:
        response = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {"role": "system", "content": "You are a precise diagnosis system."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )

        content = response.choices[0].message.content
        return json.loads(content)

    except Exception as e:
        return {
            "root_causes": ["llm_error"],
            "primary_cause": "error",
            "confidence": 0.0,
            "uncertainty": True,
            "error": str(e)
        }


# ─────────────────────────────────────────────
# FALLBACK LOGIC (VERY IMPORTANT)
# ─────────────────────────────────────────────
def fallback_reasoning(insights: Dict[str, Any]) -> Dict[str, Any]:

    # Handle scaling contradiction
    if insights["revenue_growth"] and insights["latency_increase"]:
        return {
            "root_causes": ["traffic surge causing infrastructure bottleneck"],
            "primary_cause": "scaling_issue",
            "confidence": 0.7,
            "uncertainty": False
        }

    # Payment issue
    if insights["high_payment_failure"]:
        return {
            "root_causes": ["payment gateway instability"],
            "primary_cause": "payment_failure",
            "confidence": 0.8,
            "uncertainty": False
        }

    return {
        "root_causes": [],
        "primary_cause": "unknown",
        "confidence": 0.3,
        "uncertainty": True
    }


# ─────────────────────────────────────────────
# MAIN FUNCTION
# ─────────────────────────────────────────────
def diagnose(data: Dict[str, Any]) -> Dict[str, Any]:

    insights = build_context_insights(data)
    prompt = build_prompt(data, insights)

    llm_output = call_llm(prompt)

    # Use fallback if LLM uncertain
    if llm_output.get("uncertainty", True):
        fallback = fallback_reasoning(insights)
        llm_output = fallback

    result = {
        "agent": "DiagnosisAgent",
        "signals": data.get("signals", []),
        "signal_count": len(data.get("signals", [])),
        "severity": data.get("severity", "LOW"),
        "confidence": llm_output.get("confidence", 0.5),
        "requires_attention": True,
        "diagnosis": llm_output,
        "next_agent": "StrategyAgent",
        "log": {
            "status": "completed",
            "uncertainty": llm_output.get("uncertainty", False)
        }
    }

    print("\n=== DIAGNOSIS OUTPUT (IMPROVED) ===\n")
    print(json.dumps(result, indent=2))

    return result


# ─────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────
if __name__ == "__main__":
    raw = sys.stdin.read() or "{}"
    data = json.loads(raw)
    output = diagnose(data)
    print(json.dumps(output, indent=2))