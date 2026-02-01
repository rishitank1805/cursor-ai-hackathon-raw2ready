"""Tests for model integration and response normalization."""

import json
import pytest

from app.models import (
    MODEL_REGISTRY,
    extract_json_from_response,
    normalize_response,
    query_model,
)


class TestExtractJson:
    """Test JSON extraction from model responses."""

    def test_extract_plain_json(self):
        """Extract JSON from plain text."""
        text = '{"competing_players": [], "market_cap_or_target_revenue": "test"}'
        result = extract_json_from_response(text)
        assert result["market_cap_or_target_revenue"] == "test"

    def test_extract_json_from_markdown_block(self):
        """Extract JSON from markdown code block."""
        text = '''Here is the response:
```json
{"competing_players": [], "market_cap_or_target_revenue": "$1M"}
```
'''
        result = extract_json_from_response(text)
        assert result["market_cap_or_target_revenue"] == "$1M"

    def test_extract_json_from_code_block_no_lang(self):
        """Extract JSON from code block without json lang tag."""
        text = '''```
{"target_audience": ["A", "B"]}
```'''
        result = extract_json_from_response(text)
        assert result["target_audience"] == ["A", "B"]

    def test_invalid_json_raises(self):
        """Invalid JSON raises ValueError."""
        with pytest.raises(json.JSONDecodeError):
            extract_json_from_response("not valid json")


class TestNormalizeResponse:
    """Test response normalization to OutputResponse schema."""

    def test_normalize_full_response(self):
        """Normalize complete model response."""
        raw = {
            "competing_players": [
                {"name": "A", "description": "Desc A", "strengths": ["s1"]},
                {"name": "B"},
            ],
            "market_cap_or_target_revenue": "$2M",
            "major_vicinity_locations": ["Loc1", "Loc2"],
            "target_audience": ["Aud1", "Aud2"],
            "undiscovered_addons": ["Addon1"],
        }
        result = normalize_response(raw)

        assert len(result.competing_players) == 2
        assert result.competing_players[0].name == "A"
        assert result.competing_players[0].description == "Desc A"
        assert result.competing_players[1].name == "B"
        assert result.market_cap_or_target_revenue == "$2M"
        assert result.major_vicinity_locations == ["Loc1", "Loc2"]
        assert result.target_audience == ["Aud1", "Aud2"]
        assert result.undiscovered_addons == ["Addon1"]

    def test_normalize_limits_competing_players_to_five(self):
        """Competing players limited to max 5."""
        raw = {
            "competing_players": [{"name": f"Player{i}"} for i in range(10)],
            "market_cap_or_target_revenue": "x",
            "major_vicinity_locations": [],
            "target_audience": [],
            "undiscovered_addons": [],
        }
        result = normalize_response(raw)
        assert len(result.competing_players) == 5

    def test_normalize_string_competing_player(self):
        """Handle string entries in competing_players."""
        raw = {
            "competing_players": ["Player A", "Player B"],
            "market_cap_or_target_revenue": "x",
            "major_vicinity_locations": [],
            "target_audience": [],
            "undiscovered_addons": [],
        }
        result = normalize_response(raw)
        assert result.competing_players[0].name == "Player A"
        assert result.competing_players[1].name == "Player B"

    def test_normalize_numeric_market_cap(self):
        """Convert numeric market cap to string."""
        raw = {
            "competing_players": [],
            "market_cap_or_target_revenue": 1500000,
            "major_vicinity_locations": [],
            "target_audience": [],
            "undiscovered_addons": [],
        }
        result = normalize_response(raw)
        assert result.market_cap_or_target_revenue == "1500000"

    def test_normalize_includes_suggested_business_name(self):
        """Extract suggested_business_name when present."""
        raw = {
            "suggested_business_name": "Brew & Co Mumbai",
            "competing_players": [],
            "market_cap_or_target_revenue": "x",
            "major_vicinity_locations": [],
            "target_audience": [],
            "undiscovered_addons": [],
        }
        result = normalize_response(raw)
        assert result.suggested_business_name == "Brew & Co Mumbai"

    def test_normalize_string_audience_to_list(self):
        """Convert string target_audience to list."""
        raw = {
            "competing_players": [],
            "market_cap_or_target_revenue": "x",
            "major_vicinity_locations": [],
            "target_audience": "Single audience",
            "undiscovered_addons": [],
        }
        result = normalize_response(raw)
        assert result.target_audience == ["Single audience"]


class TestModelRegistry:
    """Test model registry."""

    def test_registry_has_expected_models(self):
        """Registry contains expected model mappings."""
        assert "chatgpt-latest" in MODEL_REGISTRY
        assert "google-gemini-flash" in MODEL_REGISTRY
        assert len(MODEL_REGISTRY) == 2

    def test_registry_values_are_tuples(self):
        """Each registry entry is (provider, model_id)."""
        for key, value in MODEL_REGISTRY.items():
            assert isinstance(value, tuple)
            assert len(value) == 2
            assert value[0] in ("openai", "google")


class TestQueryModel:
    """Test model query (requires API keys - skip in CI)."""

    @pytest.mark.skip(reason="Requires API keys - run manually")
    def test_query_openai(self):
        """Query OpenAI model (integration test)."""
        import asyncio
        result = asyncio.run(query_model(
            prompt="Return: {\"competing_players\":[],\"market_cap_or_target_revenue\":\"test\",\"major_vicinity_locations\":[],\"target_audience\":[],\"undiscovered_addons\":[]}",
            model_selection="chatgpt-latest",
            openai_api_key="sk-test",
        ))
        assert result is not None

    def test_query_unknown_model_raises(self):
        """Unknown model selection raises ValueError."""
        import asyncio
        async def run():
            await query_model(
                prompt="test",
                model_selection="unknown-model",
            )
        with pytest.raises(ValueError, match="Unknown model"):
            asyncio.run(run())

    def test_query_openai_without_key_raises(self):
        """OpenAI model without API key raises ValueError."""
        import asyncio
        async def run():
            await query_model(
                prompt="test",
                model_selection="chatgpt-latest",
                openai_api_key=None,
            )
        with pytest.raises(ValueError, match="OpenAI API key"):
            asyncio.run(run())

    def test_query_google_without_key_raises(self):
        """Google DeepMind model without API key raises ValueError."""
        import asyncio
        async def run():
            await query_model(
                prompt="test",
                model_selection="google-gemini-flash",
                google_api_key=None,
            )
        with pytest.raises(ValueError, match="Google API key"):
            asyncio.run(run())
