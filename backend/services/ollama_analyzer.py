import json
import re
import httpx

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "llama3:8b"


def build_prompt(resume_text: str) -> str:
    """Build the LLM prompt for resume analysis."""
    return f"""You are an expert HR resume analyst for a tech recruitment platform.

Analyze the following resume text and extract structured information.

RESUME TEXT:
\"\"\"
{resume_text[:4000]}
\"\"\"

You MUST respond with ONLY a valid JSON object. No explanation, no markdown, no extra text.
The JSON must have exactly these keys:

{{
  "skills": ["list of technical and soft skills found"],
  "project_complexity_score": <integer from 1 to 10>,
  "technology_categories": ["list of technology categories like Frontend, Backend, DevOps, AI/ML, Mobile, Database, Cloud"],
  "experience_level": "<one of: Junior, Mid-level, Senior, Lead, Principal>"
}}

Rules:
- project_complexity_score: 1-3 = simple CRUD/static sites, 4-6 = moderate full-stack apps, 7-9 = complex distributed systems/ML pipelines, 10 = exceptional
- experience_level: based on years of experience, project complexity, and skill depth
- skills: extract ALL technical skills mentioned (languages, frameworks, tools, databases, cloud services)
- technology_categories: classify skills into broad categories

Respond with ONLY the JSON object:"""


async def analyze_resume_with_llm(resume_text: str) -> dict:
    """
    Send resume text to Ollama LLM and parse the structured JSON response.
    Falls back to a default structure if parsing fails.
    """

    prompt = build_prompt(resume_text)

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                OLLAMA_URL,
                json={
                    "model": MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "num_predict": 1024
                    }
                }
            )

            if response.status_code != 200:
                return {
                    "error": f"Ollama returned status {response.status_code}",
                    "skills": [],
                    "project_complexity_score": 0,
                    "technology_categories": [],
                    "experience_level": "Unknown"
                }

            result = response.json()
            raw_response = result.get("response", "")

            # Parse JSON from the LLM response
            parsed = parse_llm_json(raw_response)
            return parsed

    except httpx.ConnectError:
        return {
            "error": "Cannot connect to Ollama. Ensure Ollama is running on localhost:11434",
            "skills": [],
            "project_complexity_score": 0,
            "technology_categories": [],
            "experience_level": "Unknown"
        }
    except Exception as e:
        return {
            "error": str(e),
            "skills": [],
            "project_complexity_score": 0,
            "technology_categories": [],
            "experience_level": "Unknown"
        }


def parse_llm_json(raw: str) -> dict:
    """
    Extract and parse JSON from the LLM response.
    Handles cases where the LLM wraps JSON in markdown code blocks.
    """

    # Try direct parse first
    try:
        return json.loads(raw.strip())
    except json.JSONDecodeError:
        pass

    # Try extracting JSON from markdown code blocks
    json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    # Try finding the first { ... } block
    brace_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', raw, re.DOTALL)
    if brace_match:
        try:
            return json.loads(brace_match.group(0))
        except json.JSONDecodeError:
            pass

    # Fallback: return raw text as error
    return {
        "error": "Failed to parse LLM response as JSON",
        "raw_response": raw[:500],
        "skills": [],
        "project_complexity_score": 0,
        "technology_categories": [],
        "experience_level": "Unknown"
    }
