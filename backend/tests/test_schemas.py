"""Tests for Pydantic schemas."""

import pytest

from app.schemas import BusinessInput, OutputResponse, CompetingPlayer


class TestBusinessInput:
    """Test BusinessInput schema."""

    def test_minimal_valid_input(self):
        """Minimal required fields create valid input."""
        data = BusinessInput(
            business_name="Test",
            location_city="Bangalore",
            country="India",
            raw_idea="Coffee shop",
            model_selection="chatgpt-latest",
        )
        assert data.business_name == "Test"
        assert data.target_audience is None

    def test_full_input(self):
        """All fields can be set."""
        data = BusinessInput(
            business_name="Test",
            location_city="Mumbai",
            country="India",
            target_audience="Youth",
            budget="₹10L",
            business_type="Cafe",
            raw_idea="Specialty coffee",
            problem="No good coffee",
            file_content="File text",
            photos_description="Photo desc",
            model_selection="google-gemini-flash",
        )
        assert data.file_content == "File text"
        assert data.photos_description == "Photo desc"

    def test_missing_required_raises(self):
        """Missing required field raises validation error."""
        with pytest.raises(Exception):
            BusinessInput(
                business_name="Test",
                location_city="Bangalore",
                # missing country, raw_idea, model_selection
            )


class TestOutputResponse:
    """Test OutputResponse schema."""

    def test_valid_output_response(self):
        """Valid output response can be created."""
        data = OutputResponse(
            competing_players=[
                CompetingPlayer(name="A", description="Desc", strengths=["s1"]),
                CompetingPlayer(name="B"),
            ],
            market_cap_or_target_revenue="$2M",
            major_vicinity_locations=["Loc1"],
            target_audience=["Aud1", "Aud2"],
            undiscovered_addons=["Addon1"],
        )
        assert len(data.competing_players) == 2
        assert data.market_cap_or_target_revenue == "$2M"

    def test_output_response_json_serializable(self):
        """Output response can be serialized to JSON."""
        data = OutputResponse(
            competing_players=[CompetingPlayer(name="A")],
            market_cap_or_target_revenue="x",
            major_vicinity_locations=[],
            target_audience=[],
            undiscovered_addons=[],
        )
        json_str = data.model_dump_json()
        assert "competing_players" in json_str
        assert "A" in json_str
