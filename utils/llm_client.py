# utils/llm_client.py

import json
from groq import Groq
from config import CONFIG

client = Groq(api_key=CONFIG["groq"]["api_key"])


def call_llm(prompt: str) -> dict:
    """
    Generic LLM caller (Groq-based)
    Keeps same behavior as OpenAI-style agents
    """

    try:
        response = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {
                    "role": "system",
                    "content": "You are a strict AI system. Return ONLY valid JSON."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.2
        )

        content = response.choices[0].message.content

        # Clean JSON (important for Groq)
        start = content.find("{")
        end = content.rfind("}") + 1
        clean_json = content[start:end]

        return json.loads(clean_json)

    except Exception as e:
        return {
            "error": str(e),
            "fallback": True
        }