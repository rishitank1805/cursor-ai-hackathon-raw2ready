# Raw2Ready Backend

Backend API that accepts business idea input from the frontend, builds a prompt, queries the selected AI model, and returns structured JSON output.

**Model providers:** OpenAI (ChatGPT 5.2 Latest) and Google DeepMind (Gemini 2.5 Flash).

## ⚠️ Important Notice About Data Accuracy

**The competitor information and business data provided by this system is AI-generated and may not be accurate or current.** AI models do not have real-time access to business databases and cannot verify if businesses currently exist or operate at specific locations.

**Always verify competitor information independently** through:

* Google Maps searches
* Direct web searches
* Business directories (Yelp, Google Business, etc.)
* On-site visits or phone calls

This tool is intended for **initial market research and ideation** only, not as a definitive source of competitor intelligence.

## Input (from Frontend)

| Field              | Required | Description                                    |
| ------------------ | -------- | ---------------------------------------------- |
| business_name      | Yes      | Name of the business                           |
| location_city      | Yes      | City location                                  |
| country            | Yes      | Country                                        |
| target_audience    | No       | Target audience                                |
| budget             | No       | Budget                                         |
| business_type      | No       | Type of business                               |
| raw_idea           | Yes      | Raw business idea                              |
| problem            | No       | Problem being solved                           |
| file_content       | No       | Extracted text from file attachment            |
| photos_description | No       | Description of photos                          |
| model_selection    | Yes      | Model: `chatgpt-latest`, `google-gemini-flash` |

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

### Windows

```bat
cd backend
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt
copy .env.example .env
```

### macOS / Linux

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Add at least one API key to `.env`:

```text
OPENAI_API_KEY=your_openai_api_key
GOOGLE_API_KEY=your_google_api_key
```

Only the key for the model you want to use is required.

## Run

```bash
python -m uvicorn app.main:app --reload --port 8000
```

The backend will be available at:

```text
http://localhost:8000
```

Interactive API documentation:

```text
http://localhost:8000/docs
```

## API Endpoints

* `POST /api/analyze` - Analyze business idea
* `GET /api/models` - List available models
* `GET /health` - Health check

## Run Tests

```bash
pytest
```

## Example Request

```json
{
  "business_name": "GreenBite",
  "location_city": "Berlin",
  "country": "Germany",
  "target_audience": "Students and young professionals",
  "budget": "€20,000",
  "business_type": "Food and Beverage",
  "raw_idea": "A healthy grab-and-go meal service near university campuses",
  "problem": "Students struggle to find affordable and healthy meals quickly",
  "model_selection": "chatgpt-latest"
}
```

## Sample Output

See `examples/sample_output.json` for the expected response structure.
