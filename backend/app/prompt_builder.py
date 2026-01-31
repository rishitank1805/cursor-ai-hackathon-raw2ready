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
    sections = []

    # Core business info
    sections.append(
        f"""You are a business analyst and market research expert. Analyze the following business idea and provide a comprehensive market analysis.

## Business Information
- **Business Name:** {input_data.business_name}
- **Location:** {input_data.location_city}, {input_data.country}
- **Business Type:** {input_data.business_type or "Not specified"}
- **Raw Idea:** {input_data.raw_idea}
"""
    )

    if input_data.problem:
        sections.append(f"- **Problem Being Solved:** {input_data.problem}\n")

    if input_data.target_audience:
        sections.append(f"- **Initial Target Audience:** {input_data.target_audience}\n")

    if input_data.budget:
        sections.append(f"- **Budget:** {input_data.budget}\n")

    if file_content:
        sections.append(
            f"""
## Additional Context (from attached file)
{file_content}
"""
        )

    if photos_description:
        sections.append(
            f"""
## Visual Context (from photos)
{photos_description}
"""
        )

    # Output format instructions
    sections.append(
        """
## Required Output Format
You MUST respond with a valid JSON object (no markdown, no code blocks) with exactly this structure:

{
  "competing_players": [
    {
      "name": "Competitor Name",
      "description": "Brief description",
      "strengths": ["strength1", "strength2"]
    }
  ],
  "market_cap_or_target_revenue": "Estimated market cap or target revenue for this business in the region",
  "major_vicinity_locations": ["Location 1", "Location 2", "Location 3"],
  "target_audience": ["Audience segment 1", "Audience segment 2", "Audience segment 3"],
  "undiscovered_addons": ["Add-on idea 1", "Add-on idea 2", "Add-on idea 3"]
}

## Instructions
1. **competing_players**: List the top 5 (or fewer if less exist) competing players/businesses in the region ({input_data.location_city}, {input_data.country}). Include name, description, and key strengths. Maximum 5 entries.

2. **market_cap_or_target_revenue**: Provide a realistic estimate of market cap or target revenue for this type of business in this region. Consider local market conditions.

3. **major_vicinity_locations**: List major nearby locations, neighborhoods, or areas in the same region that are relevant for this business (e.g., commercial districts, residential areas, tourist spots).

4. **target_audience**: List all relevant target audience segments for this business. Be comprehensive - include demographics, psychographics, and use cases. Can be 3-7 segments.

5. **undiscovered_addons**: Suggest add-on products, services, or features related to this business idea that competitors haven't yet explored. These should be innovative and feasible.

Respond ONLY with the JSON object, no additional text before or after.
"""
    )

    return "".join(sections)
