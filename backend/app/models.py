"""Model registry and API integration for OpenAI and Google DeepMind (Gemini)."""

import asyncio
import json
import re
from typing import Any

from app.schemas import OutputResponse


# Model registry: maps user selection to (provider, model_id)
# OpenAI: general purpose; Google DeepMind (Gemini): deep research topics
MODEL_REGISTRY = {
    "openai-gpt4": ("openai", "gpt-4o"),
    "openai-gpt4o": ("openai", "gpt-4o"),
    "openai-gpt35": ("openai", "gpt-3.5-turbo"),
    "openai-gpt35-turbo": ("openai", "gpt-3.5-turbo"),
    "google-gemini-pro": ("google", "gemini-1.5-pro"),
    "google-gemini-flash": ("google", "gemini-1.5-flash"),
    "google-gemini-25-flash": ("google", "gemini-2.5-flash"),
}


async def call_openai(prompt: str, model_id: str, api_key: str) -> str:
    """Call OpenAI API."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=api_key)
    response = await client.chat.completions.create(
        model=model_id,
        messages=[
            {
                "role": "system",
                "content": "You are a business analyst. Respond only with valid JSON, no markdown or code blocks.",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
    )
    return response.choices[0].message.content or ""


async def call_google_deepmind(prompt: str, model_id: str, api_key: str) -> str:
    """Call Google DeepMind (Gemini) API for deep research topics."""
    from google import genai

    system_instruction = (
        "You are a business analyst specializing in deep research. "
        "Respond only with valid JSON, no markdown or code blocks."
    )
    full_prompt = f"{system_instruction}\n\n{prompt}"

    def _generate():
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=model_id,
            contents=full_prompt,
        )
        return response.text if response.text else ""

    return await asyncio.to_thread(_generate)


def extract_json_from_response(text: str) -> dict[str, Any]:
    """
    Extract JSON from model response, handling markdown code blocks.
    """
    text = text.strip()

    # Remove markdown code blocks if present
    json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if json_match:
        text = json_match.group(1).strip()

    return json.loads(text)


def normalize_response(raw: dict[str, Any]) -> OutputResponse:
    """
    Normalize raw model response to OutputResponse schema.
    Handles variations in model output structure.
    """
    competing_players = []
    for item in raw.get("competing_players", []):
        if isinstance(item, str):
            competing_players.append({"name": item, "description": None, "strengths": None})
        elif isinstance(item, dict):
            competing_players.append(
                {
                    "name": item.get("name", "Unknown"),
                    "description": item.get("description"),
                    "strengths": item.get("strengths"),
                }
            )
        else:
            competing_players.append({"name": str(item), "description": None, "strengths": None})

    # Limit to max 5
    competing_players = competing_players[:5]

    market_cap = raw.get("market_cap_or_target_revenue", "Not estimated")
    if isinstance(market_cap, (int, float)):
        market_cap = str(market_cap)

    vicinity = raw.get("major_vicinity_locations", [])
    if isinstance(vicinity, str):
        vicinity = [vicinity]

    audience = raw.get("target_audience", [])
    if isinstance(audience, str):
        audience = [audience]

    addons = raw.get("undiscovered_addons", [])
    if isinstance(addons, str):
        addons = [addons]

    return OutputResponse(
        competing_players=competing_players,
        market_cap_or_target_revenue=market_cap,
        major_vicinity_locations=vicinity,
        target_audience=audience,
        undiscovered_addons=addons,
    )


async def query_model(
    prompt: str,
    model_selection: str,
    openai_api_key: str | None = None,
    google_api_key: str | None = None,
) -> OutputResponse:
    """
    Route prompt to selected model and return normalized OutputResponse.

    Args:
        prompt: The built prompt
        model_selection: User's model choice (e.g., openai-gpt4, google-gemini-pro)
        openai_api_key: OpenAI API key (required for OpenAI models)
        google_api_key: Google/Gemini API key (required for Google DeepMind models)

    Returns:
        OutputResponse with structured business analysis
    """
    if model_selection not in MODEL_REGISTRY:
        raise ValueError(
            f"Unknown model: {model_selection}. "
            f"Available: {', '.join(MODEL_REGISTRY.keys())}"
        )

    provider, model_id = MODEL_REGISTRY[model_selection]

    if provider == "openai":
        if not openai_api_key:
            raise ValueError("OpenAI API key required for OpenAI models")
        raw_text = await call_openai(prompt, model_id, openai_api_key)
    else:
        if not google_api_key:
            raise ValueError("Google API key required for Google DeepMind (Gemini) models")
        raw_text = await call_google_deepmind(prompt, model_id, google_api_key)

    raw_dict = extract_json_from_response(raw_text)
    return normalize_response(raw_dict)
