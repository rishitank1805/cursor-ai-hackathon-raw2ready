# Raw2Ready Backend

Backend API that accepts business idea input from the frontend, builds a prompt, queries the selected AI model, and returns structured JSON output.

**Model providers:** OpenAI and Google DeepMind (Gemini) for deep research topics.

## Input (from Frontend)

| Field | Required | Description |
|-------|----------|-------------|
| business_name | Yes | Name of the business |
| location_city | Yes | City location |
| country | Yes | Country |
| target_audience | No | Target audience |
| budget | No | Budget |
| business_type | No | Type of business |
| raw_idea | Yes | Raw business idea |
| problem | No | Problem being solved |
| file_content | No | Extracted text from file attachment |
| photos_description | No | Description of photos |
| model_selection | Yes | Model: `openai-gpt4`, `openai-gpt35`, `google-gemini-pro`, `google-gemini-flash` |

## Output (JSON)

```json
{
  "competing_players": [
    {
      "name": "Competitor Name",
      "description": "Brief description",
      "strengths": ["strength1", "strength2"]
    }
  ],
  "market_cap_or_target_revenue": "Estimated market cap or target revenue",
  "major_vicinity_locations": ["Location 1", "Location 2"],
  "target_audience": ["Audience 1", "Audience 2"],
  "undiscovered_addons": ["Add-on idea 1", "Add-on idea 2"]
}
```

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your OPENAI_API_KEY and/or GOOGLE_API_KEY
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

- `POST /api/analyze` - Analyze business idea (accepts JSON body)
- `GET /api/models` - List available models
- `GET /health` - Health check

## Run Tests

```bash
pytest
```

## Sample Output

See `examples/sample_output.json` for the expected response structure.
