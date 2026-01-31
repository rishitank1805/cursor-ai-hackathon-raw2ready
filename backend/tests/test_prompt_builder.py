"""Tests for prompt builder."""

import pytest

from app.prompt_builder import build_prompt
from app.schemas import BusinessInput


@pytest.fixture
def minimal_input():
    """Minimal required input."""
    return BusinessInput(
        business_name="Test Cafe",
        location_city="Bangalore",
        country="India",
        raw_idea="Specialty coffee shop with local beans",
        model_selection="openai-gpt4",
    )


@pytest.fixture
def full_input():
    """Full input with all optional fields."""
    return BusinessInput(
        business_name="Green Bites",
        location_city="Mumbai",
        country="India",
        target_audience="Health-conscious millennials",
        budget="₹50L",
        business_type="Restaurant",
        raw_idea="Plant-based fast casual restaurant",
        problem="Limited healthy quick-service options in the area",
        file_content="Market research: 40% growth in plant-based food sector.",
        photos_description="Location near corporate park, high footfall",
        model_selection="google-gemini-pro",
    )


class TestPromptBuilder:
    """Test prompt builder functionality."""

    def test_build_prompt_minimal_input(self, minimal_input):
        """Prompt includes all required fields from minimal input."""
        prompt = build_prompt(minimal_input)

        assert "Test Cafe" in prompt
        assert "Bangalore" in prompt
        assert "India" in prompt
        assert "Specialty coffee shop with local beans" in prompt
        assert "openai-gpt4" not in prompt  # Model selection not in prompt content

    def test_build_prompt_full_input(self, full_input):
        """Prompt includes all optional fields when provided."""
        prompt = build_prompt(full_input)

        assert "Green Bites" in prompt
        assert "Mumbai" in prompt
        assert "Health-conscious millennials" in prompt
        assert "₹50L" in prompt
        assert "Restaurant" in prompt
        assert "Plant-based fast casual restaurant" in prompt
        assert "Limited healthy quick-service options" in prompt
        assert "Market research: 40% growth" in prompt
        assert "Location near corporate park" in prompt

    def test_build_prompt_includes_json_schema(self, minimal_input):
        """Prompt includes required JSON output schema."""
        prompt = build_prompt(minimal_input)

        assert "competing_players" in prompt
        assert "market_cap_or_target_revenue" in prompt
        assert "major_vicinity_locations" in prompt
        assert "target_audience" in prompt
        assert "undiscovered_addons" in prompt
        assert "Maximum 5" in prompt or "max 5" in prompt.lower() or "5 entries" in prompt

    def test_build_prompt_file_content_override(self, minimal_input):
        """File content can be passed as override."""
        prompt = build_prompt(minimal_input, file_content="Custom file content here")
        assert "Custom file content here" in prompt

    def test_build_prompt_photos_override(self, minimal_input):
        """Photos description can be passed as override."""
        prompt = build_prompt(minimal_input, photos_description="Storefront photo")
        assert "Storefront photo" in prompt

    def test_build_prompt_uses_input_file_content(self, full_input):
        """Uses file_content from input when not passed as override."""
        prompt = build_prompt(full_input)
        assert "Market research: 40% growth" in prompt

    def test_build_prompt_uses_input_photos_description(self, full_input):
        """Uses photos_description from input when not passed as override."""
        prompt = build_prompt(full_input)
        assert "Location near corporate park" in prompt
