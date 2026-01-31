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

    # Main prompt using user's exact format with emphasis on accuracy
    prompt = f"""I want to start a business named {input_data.business_name} near {input_data.location_city} in {input_data.country}.

CRITICAL REQUIREMENTS - READ CAREFULLY:
1. You MUST search for and provide ONLY real, currently operating businesses in {input_data.location_city}, {input_data.country}
2. Use your knowledge of ACTUAL businesses - if you're not certain a business exists, DO NOT include it
3. Prioritize well-known, established businesses that you can verify
4. Include ONLY businesses that match the business type: {input_data.raw_idea}
5. DO NOT make up business names, addresses, or URLs
6. If you cannot find 3 verified competitors in {input_data.location_city}, include fewer competitors rather than inventing fake ones

Task: Give me the top 3 REAL, VERIFIED competitors currently operating in {input_data.location_city} for: {input_data.raw_idea}

For each competitor, you MUST provide:
- Real business name (that you can verify exists)
- Actual physical address or specific neighborhood/area in {input_data.location_city}
- Real website URL (only if you know it exists, otherwise leave empty)
- Estimated annual revenue (only if publicly known, otherwise state "Not publicly available")
- Year established (only if you know it, otherwise state "Unknown")

VERIFICATION CHECKLIST before including any business:
✓ Is this a real business I know exists?
✓ Is it currently operating (not closed)?
✓ Is it actually located in {input_data.location_city}?
✓ Does it match the business type: {input_data.raw_idea}?
✓ Can I provide a real address or specific area?

If you cannot confidently answer YES to all these questions, DO NOT include that business."""

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
      "name": "Real Business Name (must be verifiable)",
      "description": "One short sentence (max 15 words).",
      "location": "Specific address or neighborhood in {input_data.location_city}",
      "url": "https://actual-website-url-or-empty-string",
      "strengths": ["strength1", "strength2"],
      "annual_revenue": "Estimated annual revenue (e.g., $2M-5M) or 'Not publicly available'",
      "year_established": "Year founded (e.g., 2015) or 'Unknown'"
    }}
  ],
  "market_cap_or_target_revenue": "Estimated market cap or target revenue for this business in the region",
  "major_vicinity_locations": ["Location 1", "Location 2", "Location 3"],
  "target_audience": ["Audience segment 1", "Audience segment 2", "Audience segment 3"],
  "undiscovered_addons": ["Add-on idea 1", "Add-on idea 2", "Add-on idea 3"]
}}

CRITICAL INSTRUCTIONS:
1. competing_players: 
   - ONLY include REAL, currently operating businesses in {input_data.location_city}
   - Verify the business actually exists before including it
   - Include specific street address or exact neighborhood (e.g., "123 Main St" or "Downtown District")
   - Provide real website URLs when available
   - Include annual revenue estimates if publicly available (from news, reports, or estimates based on size)
   - Include year established if known
   - Maximum 3 competitors
   - If you cannot verify a business exists, DO NOT include it

2. market_cap_or_target_revenue: Realistic estimate based on similar businesses in {input_data.location_city}.

3. major_vicinity_locations: Real neighborhoods, districts, or landmarks in {input_data.location_city}.

4. target_audience: Specific audience segments relevant to {input_data.location_city}.

5. undiscovered_addons: Innovative ideas not commonly offered by competitors.

Respond ONLY with the JSON object, no additional text before or after."""

    return prompt
