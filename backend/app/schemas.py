"""Input and output schemas for the Raw2Ready API."""

from typing import Optional
from pydantic import BaseModel, Field


class BusinessInput(BaseModel):
    """Input schema from frontend."""

    model_config = {"protected_namespaces": ()}

    business_name: str = Field(..., description="Name of the business")
    location_city: str = Field(..., description="City location (required)")
    country: str = Field(..., description="Country (required)")
    target_audience: Optional[str] = Field(None, description="Target audience (optional)")
    budget: Optional[str] = Field(None, description="Budget for the business")
    business_type: Optional[str] = Field(None, description="Type of business")
    raw_idea: str = Field(..., description="Raw business idea (required)")
    problem: Optional[str] = Field(None, description="Problem being solved")
    file_content: Optional[str] = Field(
        None,
        description="Extracted text/content from file attachment",
    )
    photos_description: Optional[str] = Field(
        None,
        description="Description of photos (e.g., location, product images)",
    )
    model_selection: str = Field(
        ...,
        description="Model to use: openai-gpt4, openai-gpt35, google-gemini-pro, google-gemini-flash",
    )


class CompetingPlayer(BaseModel):
    """A competing player in the region."""

    name: str
    description: Optional[str] = None
    location: Optional[str] = None
    url: Optional[str] = None
    strengths: Optional[list[str]] = None


class OutputResponse(BaseModel):
    """Structured output response from the model."""

    prompt: Optional[str] = Field(
        None,
        description="The full prompt sent to the AI model (for display/debugging)",
    )
    competing_players: list[CompetingPlayer] = Field(
        ...,
        description="Top 3 competing players in the city, or nearby regions if city has fewer",
        max_length=5,
    )
    market_cap_or_target_revenue: str = Field(
        ...,
        description="Market cap or target revenue estimate",
    )
    major_vicinity_locations: list[str] = Field(
        ...,
        description="Major nearby locations in the same area",
    )
    target_audience: list[str] = Field(
        ...,
        description="Target audience segments (can be multiple)",
    )
    undiscovered_addons: list[str] = Field(
        ...,
        description="Add-ons related to the business idea not yet discovered by competitors",
    )


# ==================== Presentation Schemas ====================


class SlideContent(BaseModel):
    """Content for a single presentation slide."""

    slide_number: int = Field(..., description="Slide number (1-indexed)")
    title: str = Field(..., description="Slide title")
    subtitle: Optional[str] = Field(None, description="Short subtitle or tagline for the slide (e.g. 'Hamburg's Premier Global Coffee Experience')")
    content: list[str] = Field(..., description="Bullet points or content for the slide")
    speaker_notes: Optional[str] = Field(None, description="Speaker notes for this slide")
    duration_seconds: Optional[int] = Field(None, description="Suggested duration for this slide in seconds")
    image_search_query: Optional[str] = Field(
        None,
        description="Short phrase to search for a relevant, professional image (e.g. 'team collaboration office')",
    )


class PresentationInput(BaseModel):
    """Input schema for presentation generation."""

    model_config = {"protected_namespaces": ()}

    # Business context from analysis
    business_name: str = Field(..., description="Name of the business")
    tagline: Optional[str] = Field(None, description="Business tagline")
    raw_idea: str = Field(..., description="Raw business idea")
    problem: Optional[str] = Field(None, description="Problem being solved")
    target_audience: Optional[str] = Field(None, description="Target audience")
    location_city: Optional[str] = Field(None, description="City location")
    country: Optional[str] = Field(None, description="Country")
    budget: Optional[str] = Field(None, description="Budget")
    business_type: Optional[str] = Field(None, description="Type of business")

    # Analysis results (from previous API call)
    competing_players: Optional[list[CompetingPlayer]] = Field(None, description="Competing players from analysis")
    market_cap_or_target_revenue: Optional[str] = Field(None, description="Market cap estimate")
    undiscovered_addons: Optional[list[str]] = Field(None, description="Add-on ideas")

    # Presentation parameters
    num_slides: int = Field(default=10, ge=5, le=15, description="Number of slides (5-15)")
    duration_minutes: int = Field(default=5, ge=3, le=15, description="Total presentation duration in minutes")


class PresentationEditInput(BaseModel):
    """Input schema for editing an existing presentation."""

    current_presentation: list[SlideContent] = Field(..., description="Current presentation slides")
    edit_request: str = Field(..., description="User's request for changes")
    business_context: Optional[dict] = Field(None, description="Original business context for reference")


class PresentationResponse(BaseModel):
    """Output schema for generated presentation."""

    slides: list[SlideContent] = Field(..., description="List of presentation slides")
    total_duration_minutes: int = Field(..., description="Total presentation duration")
    presentation_title: str = Field(..., description="Overall presentation title")
    generated_tagline: Optional[str] = Field(None, description="Generated tagline if not provided")


class ExportPptxRequest(BaseModel):
    """Request body for PPTX export (presentation + optional business name for first slide)."""

    presentation: PresentationResponse = Field(..., description="Generated presentation data")
    business_name: Optional[str] = Field(None, description="Business name to show on first slide")
