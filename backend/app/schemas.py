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
    annual_revenue: Optional[str] = None
    year_established: Optional[str] = None


class OutputResponse(BaseModel):
    """Structured output response from the model."""

    prompt: Optional[str] = Field(
        None,
        description="The full prompt sent to the AI model (for display/debugging)",
    )
    disclaimer: Optional[str] = Field(
        None,
        description="Important notice about data accuracy and verification",
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


# ==================== Video Generation (MiniMax) ====================


class VideoGenerateInput(BaseModel):
    """Input for demo video generation. Topic from presentation/business; optional custom prompt."""

    topic: str = Field(..., description="Topic or pitch summary for the video (e.g. presentation title + tagline)")
    prompt: Optional[str] = Field(None, description="Custom video prompt from user; when provided, used as main input for the video")
    business_name: Optional[str] = Field(None, description="Business name for context")
    duration_seconds: int = Field(
        default=60,
        ge=30,
        le=90,
        description="Requested duration in seconds (30–90). API uses 6s or 10s per clip.",
    )


class VideoGenerateResponse(BaseModel):
    """Response after generating demo video via MiniMax."""

    task_id: str = Field(..., description="MiniMax task ID")
    status: str = Field(..., description="Task status: Success, Fail, etc.")
    video_url: Optional[str] = Field(None, description="Download or play URL when status is Success")
    duration_used_seconds: int = Field(..., description="Actual clip length used (6 or 10) due to API limits")
    error_message: Optional[str] = Field(None, description="Error message when status is Fail")


class VideoGenerateSimpleInput(BaseModel):
    """Input for video generation from frontend card. User prompt + optional business details from form."""

    time: float = Field(..., ge=0.5, le=15, description="Time required in minutes (e.g. 5)")
    prompt: str = Field(..., min_length=1, description="User prompt describing what the video should show")
    business_name: Optional[str] = Field(None, description="Business name from form")
    raw_idea: Optional[str] = Field(None, description="Raw business idea from form")
    problem: Optional[str] = Field(None, description="Problem being solved from form")
    target_audience: Optional[str] = Field(None, description="Target audience from form")
    location_city: Optional[str] = Field(None, description="City from form")
    country: Optional[str] = Field(None, description="Country from form")
