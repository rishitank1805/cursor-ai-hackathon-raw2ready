"""Prompt builder for Raw2Ready business analysis."""

from app.schemas import BusinessInput


def build_prompt(
    input_data: BusinessInput,
    file_content: str | None = None,
    photos_description: str | None = None,
) -> str:
    """
    Build a structured prompt from frontend input for business analysis.

    Args:
        input_data: Business input from frontend
        file_content: Optional content from file attachment (e.g., extracted text).
            Also uses input_data.file_content if not passed.
        photos_description: Optional description of photos.
            Also uses input_data.photos_description if not passed.

    Returns:
        Formatted prompt string for the model
    """
    file_content = file_content or input_data.file_content
    photos_description = photos_description or input_data.photos_description

    # Main prompt using user's exact format
    prompt = f"""I want to start a business named {input_data.business_name} near {input_data.location_city} in {input_data.country} give me the top 3 competitors in {input_data.location_city}, if there is no competitor in {input_data.location_city} then i need near by regions. The idea is {input_data.raw_idea}."""

    # Add optional context if provided
    additional_context = []
    
    if input_data.problem:
        additional_context.append(f"Problem being solved: {input_data.problem}")
    
    if input_data.target_audience:
        additional_context.append(f"Target audience: {input_data.target_audience}")
    
    if input_data.budget:
        additional_context.append(f"Budget: {input_data.budget}")
    
    if input_data.business_type:
        additional_context.append(f"Business type: {input_data.business_type}")
    
    if file_content:
        additional_context.append(f"Additional context from file: {file_content}")
    
    if photos_description:
        additional_context.append(f"Visual context: {photos_description}")
    
    if additional_context:
        prompt += "\n\nAdditional information:\n" + "\n".join(f"- {ctx}" for ctx in additional_context)

    # Output format instructions
    prompt += f"""

You MUST respond with a valid JSON object (no markdown, no code blocks) with exactly this structure:

{{
  "competing_players": [
    {{
      "name": "Competitor Name",
      "description": "One short sentence (max 15 words).",
      "location": "Address or area in {input_data.location_city}",
      "url": "https://website-if-known-else-empty-string",
      "strengths": ["strength1", "strength2"]
    }}
  ],
  "market_cap_or_target_revenue": "Estimated market cap or target revenue for this business in the region",
  "major_vicinity_locations": ["Location 1", "Location 2", "Location 3"],
  "target_audience": ["Audience segment 1", "Audience segment 2", "Audience segment 3"],
  "undiscovered_addons": ["Add-on idea 1", "Add-on idea 2", "Add-on idea 3"]
}}

Instructions:
1. competing_players: List top 3 competitors in {input_data.location_city}. If fewer than 3 exist in the city, include competitors from nearby regions. Include name, short description (max 15 words), location (address/area), url (website if known, else empty string), and 1-3 strength tags.
2. market_cap_or_target_revenue: One sentence estimate for this business type in the region.
3. major_vicinity_locations: 3-5 locations near {input_data.location_city} (neighborhoods, districts, landmarks).
4. target_audience: 3-5 audience segments (short labels).
5. undiscovered_addons: 3-5 add-on ideas (short phrases).

Respond ONLY with the JSON object, no additional text before or after."""

    return prompt
