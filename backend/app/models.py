"""Model registry and API integration for OpenAI, Google DeepMind (Gemini), and Manus."""

import asyncio
import json
import re
from typing import Any

from app.schemas import OutputResponse, PresentationResponse, SlideContent


# Model registry: maps user selection to (provider, model_id)
# Only verified working chat models
MODEL_REGISTRY = {
    # OpenAI GPT-5.2 Chat Latest (newest verified chat model)
    "chatgpt-latest": ("openai", "gpt-5.2-chat-latest"),
    # Google Gemini 2.5 Flash (fast, high rate limits)
    "google-gemini-flash": ("google", "gemini-2.5-flash"),
}

# OpenAI models that only support default temperature (do not send temperature param)
OPENAI_NO_TEMPERATURE_MODELS = {"gpt-5.2-chat-latest"}

# Manus API configuration
MANUS_API_BASE_URL = "https://api.manus.im"


async def call_openai(prompt: str, model_id: str, api_key: str, temperature: float = 0.2) -> str:
    """Call OpenAI API. Uses low temperature when supported for accurate, factual output."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=api_key)
    kwargs = {
        "model": model_id,
        "messages": [
            {
                "role": "system",
                "content": "You are a business research analyst with access to current business information. Your primary goal is ACCURACY - only provide information about businesses you can verify exist. If you're uncertain about a business, DO NOT include it. Respond only with valid JSON, no markdown or code blocks.",
            },
            {"role": "user", "content": prompt},
        ],
    }
    # Only send temperature for models that support it (e.g. gpt-5.2-chat-latest only supports default)
    if model_id not in OPENAI_NO_TEMPERATURE_MODELS:
        try:
            kwargs["temperature"] = max(0.0, min(1.0, temperature))
        except (TypeError, ValueError):
            kwargs["temperature"] = 0.2
    response = await client.chat.completions.create(**kwargs)
    return response.choices[0].message.content or ""


async def call_google_deepmind(prompt: str, model_id: str, api_key: str, temperature: float = 0.2) -> str:
    """Call Google DeepMind (Gemini) API. Uses low temperature by default for accurate output."""
    import httpx

    system_instruction = (
        "You are a business research analyst with access to current business information. "
        "Your primary goal is ACCURACY - only provide information about businesses you can verify exist. "
        "If you're uncertain about a business, DO NOT include it. "
        "Respond only with valid JSON, no markdown or code blocks."
    )
    full_prompt = f"{system_instruction}\n\n{prompt}"

    url = f"https://generativelanguage.googleapis.com/v1/models/{model_id}:generateContent"
    headers = {"Content-Type": "application/json"}
    temp = max(0.0, min(1.0, temperature)) if isinstance(temperature, (int, float)) else 0.2
    payload = {
        "contents": [{"parts": [{"text": full_prompt}]}],
        "generationConfig": {"temperature": temp, "maxOutputTokens": 4096},
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            url, headers=headers, json=payload, params={"key": api_key}
        )
        response.raise_for_status()
        data = response.json()
        
        # Extract text from response
        if "candidates" in data and len(data["candidates"]) > 0:
            candidate = data["candidates"][0]
            if "content" in candidate and "parts" in candidate["content"]:
                parts = candidate["content"]["parts"]
                if len(parts) > 0 and "text" in parts[0]:
                    return parts[0]["text"]
        
        return ""


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
            competing_players.append({
                "name": item,
                "description": None,
                "location": None,
                "url": None,
                "strengths": None,
                "annual_revenue": None,
                "year_established": None,
            })
        elif isinstance(item, dict):
            competing_players.append(
                {
                    "name": item.get("name", "Unknown"),
                    "description": item.get("description"),
                    "location": item.get("location"),
                    "url": item.get("url") or item.get("website"),
                    "strengths": item.get("strengths"),
                    "annual_revenue": item.get("annual_revenue") or item.get("revenue"),
                    "year_established": item.get("year_established") or item.get("founded") or item.get("year_founded"),
                }
            )
        else:
            competing_players.append({
                "name": str(item),
                "description": None,
                "location": None,
                "url": None,
                "strengths": None,
                "annual_revenue": None,
                "year_established": None,
            })

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

    suggested_name = raw.get("suggested_business_name")
    if suggested_name and not isinstance(suggested_name, str):
        suggested_name = str(suggested_name).strip() or None
    elif suggested_name:
        suggested_name = suggested_name.strip() or None

    # Parse timeline if present
    timeline_data = raw.get("timeline")
    timeline = None
    if timeline_data and isinstance(timeline_data, list):
        timeline = []
        for item in timeline_data:
            if isinstance(item, dict):
                timeline.append({
                    "period": item.get("period", ""),
                    "title": item.get("title", ""),
                    "tasks": item.get("tasks", []) if isinstance(item.get("tasks"), list) else []
                })

    return OutputResponse(
        suggested_business_name=suggested_name,
        competing_players=competing_players,
        market_cap_or_target_revenue=market_cap,
        major_vicinity_locations=vicinity,
        target_audience=audience,
        undiscovered_addons=addons,
        timeline=timeline,
    )


async def query_model(
    prompt: str,
    model_selection: str,
    openai_api_key: str | None = None,
    google_api_key: str | None = None,
    temperature: float = 0.2,
) -> OutputResponse:
    """
    Route prompt to selected model and return normalized OutputResponse.

    Args:
        prompt: The built prompt
        model_selection: User's model choice (e.g., openai-gpt4, google-gemini-pro)
        openai_api_key: OpenAI API key (required for OpenAI models)
        google_api_key: Google/Gemini API key (required for Google DeepMind models)
        temperature: LLM temperature (0.0–1.0). Lower = more factual/accurate. Default 0.2.

    Returns:
        OutputResponse with structured business analysis
    """
    if model_selection not in MODEL_REGISTRY:
        raise ValueError(
            f"Unknown model: {model_selection}. "
            f"Available: {', '.join(MODEL_REGISTRY.keys())}"
        )

    provider, model_id = MODEL_REGISTRY[model_selection]
    temp = max(0.0, min(1.0, temperature)) if isinstance(temperature, (int, float)) else 0.2

    if provider == "openai":
        if not openai_api_key:
            raise ValueError("OpenAI API key required for OpenAI models")
        raw_text = await call_openai(prompt, model_id, openai_api_key, temperature=temp)
    else:
        if not google_api_key:
            raise ValueError("Google API key required for Google DeepMind (Gemini) models")
        raw_text = await call_google_deepmind(prompt, model_id, google_api_key, temperature=temp)

    raw_dict = extract_json_from_response(raw_text)
    return normalize_response(raw_dict)


# ==================== Manus API Integration for Presentations ====================


async def call_manus_api(prompt: str, api_key: str) -> str:
    """
    Call Manus API for presentation generation.
    
    The Manus API is asynchronous - we create a task and poll for completion.
    
    Args:
        prompt: The presentation generation prompt
        api_key: Manus API key
        
    Returns:
        Raw text response from Manus API
    """
    import httpx

    headers = {
        "API_KEY": api_key,
        "Content-Type": "application/json",
        "accept": "application/json",
    }
    
    # System instruction so API output matches Manus website quality (premium, visual)
    system_instruction = (
        "You create premium, visually striking presentations like the best Manus pitch decks. "
        "Every slide should have a punchy title, a compelling subtitle (one line that sets the scene or value), "
        "and vivid bullet points. Output must be valid JSON only—no markdown, no code blocks, no extra text. "
        "Match the quality and style of top-tier Manus presentations: clean, story-driven, and visually appealing."
    )
    
    full_prompt = f"{system_instruction}\n\n{prompt}"
    
    # Create a task using the Manus API
    payload = {
        "prompt": full_prompt,
    }

    async with httpx.AsyncClient(timeout=300.0) as client:
        # Step 1: Create the task
        create_response = await client.post(
            f"{MANUS_API_BASE_URL}/v1/tasks",
            headers=headers,
            json=payload,
        )
        
        # Log the response for debugging
        print(f"Manus API Response Status: {create_response.status_code}")
        print(f"Manus API Response: {create_response.text}")
        
        create_response.raise_for_status()
        task_data = create_response.json()
        
        # The response might have 'id' or 'task_id' or be nested
        task_id = task_data.get("id") or task_data.get("task_id")
        
        # If task_data itself is the task object with different structure
        if not task_id and isinstance(task_data, dict):
            # Try to find id in nested structure
            if "data" in task_data:
                task_id = task_data["data"].get("id")
            elif "task" in task_data:
                task_id = task_data["task"].get("id")
        
        if not task_id:
            raise ValueError(f"Failed to create Manus task - response: {task_data}")
        
        print(f"Manus Task ID: {task_id}")
        
        # Step 2: Poll for task completion
        max_attempts = 60  # Max 5 minutes (60 * 5 seconds)
        attempt = 0
        
        while attempt < max_attempts:
            await asyncio.sleep(5)  # Wait 5 seconds between polls
            attempt += 1
            
            status_response = await client.get(
                f"{MANUS_API_BASE_URL}/v1/tasks/{task_id}",
                headers=headers,
            )
            status_response.raise_for_status()
            status_data = status_response.json()
            
            print(f"Manus Task Status (attempt {attempt}): {status_data.get('status')}")
            
            status = status_data.get("status")
            
            if status == "completed":
                # Extract the assistant's response from output
                output = status_data.get("output", [])
                for message in reversed(output):  # Get the last assistant message
                    if isinstance(message, dict) and message.get("role") == "assistant":
                        content = message.get("content", [])
                        for item in content:
                            if isinstance(item, dict) and item.get("text"):
                                return item["text"]
                            elif isinstance(item, str):
                                return item
                # If no text found in structured format, try to get raw response
                # Check for result or response field
                if "result" in status_data:
                    return status_data["result"] if isinstance(status_data["result"], str) else json.dumps(status_data["result"])
                if "response" in status_data:
                    return status_data["response"] if isinstance(status_data["response"], str) else json.dumps(status_data["response"])
                return json.dumps(status_data.get("output", status_data))
            
            elif status == "error":
                error_msg = status_data.get("error", "Unknown error")
                raise ValueError(f"Manus task failed: {error_msg}")
            
            elif status in ("running", "pending", "in_progress"):
                continue  # Keep polling
            
            else:
                # Unknown status, keep polling
                print(f"Unknown status: {status}")
                continue
        
        raise ValueError("Manus task timed out after 5 minutes")


def build_presentation_prompt(
    business_name: str,
    raw_idea: str,
    num_slides: int,
    duration_minutes: int,
    tagline: str | None = None,
    problem: str | None = None,
    target_audience: str | None = None,
    location_city: str | None = None,
    country: str | None = None,
    budget: str | None = None,
    business_type: str | None = None,
    competing_players: list | None = None,
    market_cap_or_target_revenue: str | None = None,
    undiscovered_addons: list | None = None,
) -> str:
    """
    Build the presentation generation prompt.
    
    Returns:
        Formatted prompt string for presentation generation
    """
    # Calculate seconds per slide for timing guidance
    seconds_per_slide = (duration_minutes * 60) // num_slides
    
    prompt = f"""Create a BEAUTIFUL, visually stunning business pitch presentation for the following idea.
The presentation must look like a premium pitch deck—suitable for top investors and hackathon judges.

REQUIREMENTS FOR IMPACT:
- Write punchy, memorable titles (short phrases, not long sentences).
- Use vivid, concrete bullet points—numbers, outcomes, and clear value (e.g. "3x faster", "Save 40% costs").
- Every slide should suggest a strong visual: think "what image would make this slide pop?"
- Keep slides short, story-driven, and highly visual. Avoid walls of text.
- Use simple, confident language. Focus on clarity and emotional impact.

SLIDE FLOW (include all):
1. Title slide – business name and a catchy tagline
2. Problem & target audience – pain points and who feels them
3. Solution & value proposition – what you offer and why it matters
4. Market opportunity – size and growth
5. Product/service overview – key features and benefits
6. Business model & revenue streams – how you make money
7. Competitive landscape – differentiation and unique edge
8. Go-to-market strategy – how you reach customers
9. Team overview – why you can win
10. Financials (high-level if data available)
11. Closing – vision and clear ask (e.g. "We're raising $X for Y")

=== BUSINESS DETAILS ===
Business Name: {business_name}
Raw Idea: {raw_idea}
"""

    if tagline:
        prompt += f"Tagline: {tagline}\n"
    if problem:
        prompt += f"Problem Being Solved: {problem}\n"
    if target_audience:
        prompt += f"Target Audience: {target_audience}\n"
    if location_city and country:
        prompt += f"Location: {location_city}, {country}\n"
    elif country:
        prompt += f"Country: {country}\n"
    if budget:
        prompt += f"Budget: {budget}\n"
    if business_type:
        prompt += f"Business Type: {business_type}\n"
    
    # Add analysis results if available
    if competing_players:
        competitors_text = ", ".join([p.get("name", p) if isinstance(p, dict) else str(p) for p in competing_players[:3]])
        prompt += f"Key Competitors: {competitors_text}\n"
    
    if market_cap_or_target_revenue:
        prompt += f"Market Opportunity: {market_cap_or_target_revenue}\n"
    
    if undiscovered_addons:
        addons_text = ", ".join(undiscovered_addons[:3])
        prompt += f"Unique Value Adds: {addons_text}\n"

    prompt += f"""
=== PRESENTATION REQUIREMENTS ===
Number of Slides: {num_slides}
Total Duration: {duration_minutes} minutes
Suggested Time Per Slide: ~{seconds_per_slide} seconds

=== OUTPUT FORMAT ===
You MUST respond with a valid JSON object (no markdown, no code blocks) with exactly this structure:

Use the given Business Name as the main title of the presentation. The presentation_title MUST feature the business name (e.g. "Brew & Co Mumbai" or "Brew & Co Mumbai – Premium Coffee Experience").

{{
  "presentation_title": "The business name plus optional tagline (e.g. Brew & Co Mumbai – Premium Coffee Experience)",
  "generated_tagline": "A memorable one-line tagline (e.g. Hamburg's Premier Global Coffee Experience)",
  "total_duration_minutes": {duration_minutes},
  "slides": [
    {{
      "slide_number": 1,
      "title": "Punchy Slide Title (3-6 words)",
      "subtitle": "One short line that sets the scene or location (e.g. Hamburg's Premier Global Coffee Experience)",
      "content": ["Bullet 1", "Bullet 2", "Bullet 3"],
      "speaker_notes": "Brief notes for the presenter",
      "duration_seconds": {seconds_per_slide},
      "image_search_query": "2-4 word phrase for a professional, topic-relevant image (e.g. 'modern coffee shop interior', 'team meeting office')"
    }}
  ]
}}

Create exactly {num_slides} slides. For EACH slide include:
- title: Short, punchy (3-6 words), memorable
- subtitle: One compelling line that sets the scene, location, or value (like a tagline for that slide). Make it specific and appealing.
- content: 3-5 vivid, concrete bullet points (numbers, outcomes, clear value)
- speaker_notes: Brief notes for the presenter
- duration_seconds: Spread {duration_minutes} minutes across all slides
- image_search_query: Short phrase for a high-quality, topic-relevant image so each slide has a clear visual (e.g. "modern coffee shop", "startup team", "growth chart"). Be specific to the slide theme.

Write in a premium, visually striking style—like a top-tier pitch deck. Every slide should feel polished and story-driven.

Respond ONLY with the JSON object, no additional text before or after."""

    return prompt


def build_presentation_edit_prompt(
    current_slides: list[dict],
    edit_request: str,
    business_context: dict | None = None,
) -> str:
    """
    Build prompt for editing an existing presentation.
    
    Args:
        current_slides: Current presentation slides
        edit_request: User's edit request
        business_context: Original business context
        
    Returns:
        Formatted prompt for presentation editing
    """
    slides_json = json.dumps(current_slides, indent=2)
    
    prompt = f"""You are editing an existing business pitch presentation based on user feedback.

=== CURRENT PRESENTATION ===
{slides_json}

=== USER'S EDIT REQUEST ===
{edit_request}

"""
    
    if business_context:
        prompt += f"""=== BUSINESS CONTEXT ===
{json.dumps(business_context, indent=2)}

"""

    prompt += """=== INSTRUCTIONS ===
Apply the user's requested changes to the presentation while maintaining:
- Professional tone suitable for investors/judges
- Clear, concise bullet points
- Story-driven narrative flow
- Visual orientation (suggest imagery where helpful)

Return the COMPLETE updated presentation in the same JSON format (include image_search_query for each slide so images stay on-topic):
{
  "presentation_title": "Updated title if needed",
  "generated_tagline": "Updated tagline if needed",
  "total_duration_minutes": <same as before unless changed>,
  "slides": [
    {
      "slide_number": 1,
      "title": "Slide Title",
      "content": ["Bullet point 1", "Bullet point 2"],
      "speaker_notes": "Notes for presenter",
      "duration_seconds": <seconds>,
      "image_search_query": "short phrase for relevant stock photo"
    }
  ]
}

Respond ONLY with the JSON object, no additional text before or after."""

    return prompt


def normalize_presentation_response(raw: dict[str, Any]) -> PresentationResponse:
    """
    Normalize raw model response to PresentationResponse schema.
    """
    slides = []
    for slide_data in raw.get("slides", []):
        slides.append(SlideContent(
            slide_number=slide_data.get("slide_number", len(slides) + 1),
            title=slide_data.get("title", "Untitled Slide"),
            subtitle=slide_data.get("subtitle"),
            content=slide_data.get("content", []),
            speaker_notes=slide_data.get("speaker_notes"),
            duration_seconds=slide_data.get("duration_seconds"),
            image_search_query=slide_data.get("image_search_query"),
        ))
    
    return PresentationResponse(
        slides=slides,
        total_duration_minutes=raw.get("total_duration_minutes", 5),
        presentation_title=raw.get("presentation_title", "Business Pitch"),
        generated_tagline=raw.get("generated_tagline"),
    )


async def generate_presentation(
    business_name: str,
    raw_idea: str,
    num_slides: int,
    duration_minutes: int,
    manus_api_key: str,
    tagline: str | None = None,
    problem: str | None = None,
    target_audience: str | None = None,
    location_city: str | None = None,
    country: str | None = None,
    budget: str | None = None,
    business_type: str | None = None,
    competing_players: list | None = None,
    market_cap_or_target_revenue: str | None = None,
    undiscovered_addons: list | None = None,
) -> PresentationResponse:
    """
    Generate a business pitch presentation using Manus API.
    
    Returns:
        PresentationResponse with generated slides
    """
    if not manus_api_key:
        raise ValueError("Manus API key is required for presentation generation")
    
    prompt = build_presentation_prompt(
        business_name=business_name,
        raw_idea=raw_idea,
        num_slides=num_slides,
        duration_minutes=duration_minutes,
        tagline=tagline,
        problem=problem,
        target_audience=target_audience,
        location_city=location_city,
        country=country,
        budget=budget,
        business_type=business_type,
        competing_players=competing_players,
        market_cap_or_target_revenue=market_cap_or_target_revenue,
        undiscovered_addons=undiscovered_addons,
    )
    
    raw_text = await call_manus_api(prompt, manus_api_key)
    raw_dict = extract_json_from_response(raw_text)
    return normalize_presentation_response(raw_dict)


async def edit_presentation(
    current_slides: list[dict],
    edit_request: str,
    manus_api_key: str,
    business_context: dict | None = None,
) -> PresentationResponse:
    """
    Edit an existing presentation based on user feedback.
    
    Returns:
        PresentationResponse with updated slides
    """
    if not manus_api_key:
        raise ValueError("Manus API key is required for presentation editing")
    
    prompt = build_presentation_edit_prompt(
        current_slides=current_slides,
        edit_request=edit_request,
        business_context=business_context,
    )
    
    raw_text = await call_manus_api(prompt, manus_api_key)
    raw_dict = extract_json_from_response(raw_text)
    return normalize_presentation_response(raw_dict)


# ==================== MiniMax Video Generation ====================

MINIMAX_VIDEO_BASE = "https://api.minimax.io/v1"
MINIMAX_VIDEO_MODEL = "MiniMax-Hailuo-2.3"


def _video_duration_for_api(duration_seconds: int) -> int:
    """Map user duration (30–90s) to MiniMax supported 6 or 10 seconds."""
    if duration_seconds <= 50:
        return 6
    return 10


def _build_video_prompt(topic: str, business_name: str | None) -> str:
    """Build a short, cinematic text-to-video prompt from topic and business."""
    parts = []
    if business_name:
        parts.append(f"Professional demo for {business_name}.")
    parts.append(topic.strip())
    prompt = " ".join(parts)
    if len(prompt) > 1800:
        prompt = prompt[:1797] + "..."
    prompt += " [Static shot] then [Push in]. Cinematic, modern, professional."
    return prompt[:2000]


def _build_video_prompt_from_user(prompt: str, business_name: str | None) -> str:
    """Use user-provided prompt as main video description; optionally prefix business name."""
    parts = []
    if business_name:
        parts.append(f"Professional demo for {business_name}.")
    parts.append(prompt.strip())
    text = " ".join(parts)
    if len(text) > 1800:
        text = text[:1797] + "..."
    text += " [Static shot] then [Push in]. Cinematic, modern, professional."
    return text[:2000]


async def generate_demo_video(
    topic: str,
    duration_seconds: int,
    api_key: str,
    business_name: str | None = None,
    prompt: str | None = None,
) -> dict:
    """
    Generate a demo video via MiniMax text-to-video.
    If prompt is provided, it is used as the main video description; otherwise topic is used.
    Creates task, polls until Success/Fail, returns video URL when done.
    """
    import httpx

    if not api_key:
        raise ValueError("MiniMax API key is required for video generation")

    duration_used = _video_duration_for_api(duration_seconds)
    if prompt and prompt.strip():
        video_prompt = _build_video_prompt_from_user(prompt.strip(), business_name)
    else:
        video_prompt = _build_video_prompt(topic, business_name)
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": MINIMAX_VIDEO_MODEL,
        "prompt": video_prompt,
        "duration": duration_used,
        "resolution": "768P",
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        create_resp = await client.post(
            f"{MINIMAX_VIDEO_BASE}/video_generation",
            headers=headers,
            json=payload,
        )
        create_resp.raise_for_status()
        create_data = create_resp.json()
        base_resp = create_data.get("base_resp", {})
        if base_resp.get("status_code") != 0:
            raise ValueError(base_resp.get("status_msg", "MiniMax video task creation failed"))
        task_id = create_data.get("task_id")
        if not task_id:
            raise ValueError("MiniMax did not return a task_id")

        max_attempts = 60
        for _ in range(max_attempts):
            await asyncio.sleep(10)
            query_resp = await client.get(
                f"{MINIMAX_VIDEO_BASE}/query/video_generation",
                headers=headers,
                params={"task_id": task_id},
            )
            query_resp.raise_for_status()
            query_data = query_resp.json()
            status = query_data.get("status", "")

            if status == "Success":
                file_id = query_data.get("file_id")
                if not file_id:
                    return {
                        "task_id": task_id,
                        "status": "Success",
                        "video_url": None,
                        "duration_used_seconds": duration_used,
                        "error_message": "No file_id in response",
                    }
                retrieve_resp = await client.get(
                    f"{MINIMAX_VIDEO_BASE}/files/retrieve",
                    headers=headers,
                    params={"file_id": file_id},
                )
                retrieve_resp.raise_for_status()
                retrieve_data = retrieve_resp.json()
                file_info = retrieve_data.get("file", {})
                video_url = file_info.get("download_url")
                return {
                    "task_id": task_id,
                    "status": "Success",
                    "video_url": video_url,
                    "duration_used_seconds": duration_used,
                    "error_message": None,
                }

            if status == "Fail":
                return {
                    "task_id": task_id,
                    "status": "Fail",
                    "video_url": None,
                    "duration_used_seconds": duration_used,
                    "error_message": query_data.get("error_message", "Video generation failed"),
                }

        return {
            "task_id": task_id,
            "status": "Fail",
            "video_url": None,
            "duration_used_seconds": duration_used,
            "error_message": "Video generation timed out",
        }
