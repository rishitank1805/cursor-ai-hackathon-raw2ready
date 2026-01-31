"""Raw2Ready API - Main FastAPI application."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings
from app.models import query_model
from app.prompt_builder import build_prompt
from app.schemas import BusinessInput, OutputResponse

app = FastAPI(
    title="Raw2Ready API",
    description="Business idea analysis - get market insights from raw ideas",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

settings = Settings()


@app.post("/api/analyze", response_model=OutputResponse)
async def analyze_business(input_data: BusinessInput) -> OutputResponse:
    """
    Analyze a business idea and return structured market insights.

    Accepts frontend input and returns:
    - Top 5 competing players in the region
    - Market cap or target revenue
    - Major vicinity locations
    - Target audience segments
    - Undiscovered add-ons
    """
    prompt = build_prompt(
        input_data,
        file_content=input_data.file_content,
        photos_description=input_data.photos_description,
    )

    openai_key = settings.openai_api_key
    google_key = settings.google_api_key

    try:
        result = await query_model(
            prompt=prompt,
            model_selection=input_data.model_selection,
            openai_api_key=openai_key,
            google_api_key=google_key,
        )
        
        # Add disclaimer about AI-generated data
        disclaimer = (
            "⚠️ IMPORTANT: This analysis is AI-generated based on the model's training data. "
            "Business information may be outdated or inaccurate. Please verify all competitor "
            "details independently through web searches, Google Maps, or direct contact before "
            "making business decisions."
        )
        
        return result.model_copy(update={"prompt": prompt, "disclaimer": disclaimer})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model query failed: {str(e)}")


@app.get("/api/models")
async def list_models():
    """List available models for selection."""
    from app.models import MODEL_REGISTRY

    return {
        "models": [
            {"id": k, "provider": v[0], "model_id": v[1]}
            for k, v in MODEL_REGISTRY.items()
        ]
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}
