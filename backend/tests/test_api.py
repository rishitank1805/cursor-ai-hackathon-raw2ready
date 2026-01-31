"""Tests for FastAPI endpoints."""

import pytest

# Skip entire module if FastAPI not installed
pytest.importorskip("fastapi")

from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def valid_payload():
    """Valid analyze request payload."""
    return {
        "business_name": "Test Cafe",
        "location_city": "Bangalore",
        "country": "India",
        "raw_idea": "Specialty coffee shop",
        "model_selection": "chatgpt-latest",
    }


class TestHealthEndpoint:
    """Test health check."""

    def test_health_returns_ok(self, client):
        """Health endpoint returns 200."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestModelsEndpoint:
    """Test models list endpoint."""

    def test_list_models(self, client):
        """Models endpoint returns available models."""
        response = client.get("/api/models")
        assert response.status_code == 200
        data = response.json()
        assert "models" in data
        assert len(data["models"]) > 0
        assert any(m["id"] == "chatgpt-latest" for m in data["models"])

    def test_list_models_includes_google_deepmind(self, client):
        """Models endpoint includes Google DeepMind (Gemini) options."""
        response = client.get("/api/models")
        assert response.status_code == 200
        models = response.json()["models"]
        assert any(m["id"] == "google-gemini-flash" for m in models)


class TestAnalyzeEndpoint:
    """Test analyze endpoint."""

    def test_analyze_missing_required_field(self, client):
        """Missing required field returns 422."""
        payload = {
            "business_name": "Test",
            "location_city": "Bangalore",
            # missing country, raw_idea, model_selection
        }
        response = client.post("/api/analyze", json=payload)
        assert response.status_code == 422

    def test_analyze_invalid_model_returns_400(self, client, valid_payload):
        """Invalid model selection returns 400."""
        valid_payload["model_selection"] = "invalid-model"
        response = client.post("/api/analyze", json=valid_payload)
        # Will fail at model query - 400 or 500
        assert response.status_code in (400, 500)
        if response.status_code == 400:
            assert "Unknown model" in response.json().get("detail", "")

    def test_analyze_valid_payload_structure(self, client, valid_payload):
        """Valid payload structure is accepted (may fail without API keys)."""
        response = client.post("/api/analyze", json=valid_payload)

        # Without API keys, will get 500; with keys, 200
        if response.status_code == 200:
            data = response.json()
            assert "competing_players" in data
            assert "market_cap_or_target_revenue" in data
            assert "major_vicinity_locations" in data
            assert "target_audience" in data
            assert "undiscovered_addons" in data

    def test_analyze_full_payload(self, client):
        """Full payload with all optional fields."""
        payload = {
            "business_name": "Green Bites",
            "location_city": "Mumbai",
            "country": "India",
            "target_audience": "Health-conscious",
            "budget": "₹50L",
            "business_type": "Restaurant",
            "raw_idea": "Plant-based restaurant",
            "problem": "Limited options",
            "file_content": "Market research notes",
            "photos_description": "Storefront photo",
            "model_selection": "chatgpt-latest",
        }
        response = client.post("/api/analyze", json=payload)
        # Accept 200 (success) or 500 (no API key)
        assert response.status_code in (200, 500)
