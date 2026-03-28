# AROS – Strategy Agent (Improved + Fallback + Context-Aware)

import json
import sys
from typing import Dict, Any
from groq import Groq
from config import CONFIG

client = Groq(api_key=CONFIG["groq"]["api_key"])


# ─────────────────────────────────────────────
# BUILD PROMPT
# ─────────────────────────────────────────────
def build_prompt(data: Dict[str, Any]) -> str:

    diagnosis = data.get("diagnosis", {})
    cause = diagnosis.get("primary_cause", "unknown")

    return f"""
You are a Strategy Optimization Agent for an e-commerce platform.

PRIMARY ROOT CAUSE:
{cause}

FULL CONTEXT:
{json.dumps(data, indent=2)}

---

TASK:

1. Generate 2–3 actionable strategies
2. Align strategies with the root cause
3. Keep them realistic and safe
4. Avoid generic answers

---

GUIDELINES:

- If cause = scaling_issue:
  → suggest infrastructure scaling, performance optimization, load balancing

- If cause = payment_failure:
  → suggest payment retries, gateway fallback, monitoring

- If cause = conversion_drop:
  → suggest UX improvement, pricing optimization

- If uncertain:
  → suggest investigation + safe optimizations

---

OUTPUT FORMAT (STRICT JSON):

{{
  "strategies": [
    {{
      "action_type": "...",
      "description": "...",
      "expected_impact": "...",
      "confidence": 0.0,
      "risk_level": "low|medium|high"
    }}
  ],
  "primary_strategy": "...",
  "reasoning": "..."
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
                {"role": "system", "content": "You are a precise strategy system."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
        )

        content = response.choices[0].message.content
        return json.loads(content)

    except Exception as e:
        return {
            "strategies": [],
            "primary_strategy": "none",
            "reasoning": f"llm_error: {str(e)}"
        }


# ─────────────────────────────────────────────
# FALLBACK STRATEGIES (CRITICAL)
# ─────────────────────────────────────────────
def fallback_strategy(data: Dict[str, Any]) -> Dict[str, Any]:

    cause = data.get("diagnosis", {}).get("primary_cause")

    if cause == "scaling_issue":
        return {
            "strategies": [
                {
                    "action_type": "scale_infrastructure",
                    "description": "Increase server capacity and enable auto-scaling",
                    "expected_impact": "Reduce latency and improve system stability",
                    "confidence": 0.85,
                    "risk_level": "medium"
                },
                {
                    "action_type": "optimize_performance",
                    "description": "Implement caching and CDN to reduce latency",
                    "expected_impact": "Improve response time and user experience",
                    "confidence": 0.8,
                    "risk_level": "low"
                }
            ],
            "primary_strategy": "scale_infrastructure",
            "reasoning": "Fallback applied for scaling issue"
        }

    if cause == "payment_failure":
        return {
            "strategies": [
                {
                    "action_type": "add_payment_fallback",
                    "description": "Enable secondary payment gateway",
                    "expected_impact": "Reduce transaction failures",
                    "confidence": 0.9,
                    "risk_level": "low"
                }
            ],
            "primary_strategy": "add_payment_fallback",
            "reasoning": "Fallback applied for payment failure"
        }

    return {
        "strategies": [
            {
                "action_type": "investigate_issue",
                "description": "Perform deeper analysis of system anomalies",
                "expected_impact": "Identify root cause",
                "confidence": 0.5,
                "risk_level": "low"
            }
        ],
        "primary_strategy": "investigate_issue",
        "reasoning": "Generic fallback strategy"
    }


# ─────────────────────────────────────────────
# MAIN FUNCTION
# ─────────────────────────────────────────────
def recommend_strategy(data: Dict[str, Any]) -> Dict[str, Any]:

    prompt = build_prompt(data)
    llm_output = call_llm(prompt)

    strategies = llm_output.get("strategies", [])

    # 🚨 CRITICAL FIX: NEVER RETURN EMPTY
    if not strategies:
        llm_output = fallback_strategy(data)

    result = {
        "agent": "StrategyAgent",
        "strategies": llm_output.get("strategies", []),
        "primary_strategy": llm_output.get("primary_strategy", "none"),
        "reasoning": llm_output.get("reasoning", ""),
        "next_agent": "SimulationAgent",
        "log": {
            "status": "completed",
            "strategy_count": len(llm_output.get("strategies", [])),
        },
    }

    print("\n=== STRATEGY OUTPUT (IMPROVED) ===\n")
    print(json.dumps(result, indent=2))

    return result


# ─────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────
if __name__ == "__main__":
    raw = sys.stdin.read() or "{}"
    data = json.loads(raw)
    output = recommend_strategy(data)
    print(json.dumps(output, indent=2))