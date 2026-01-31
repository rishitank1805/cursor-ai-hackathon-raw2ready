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
