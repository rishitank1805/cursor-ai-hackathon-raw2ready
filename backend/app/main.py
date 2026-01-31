"""Raw2Ready API - Main FastAPI application."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.config import Settings
from app.models import query_model, generate_presentation, edit_presentation
from app.pptx_builder import build_pptx_from_response
from app.prompt_builder import build_prompt
from app.schemas import (
    BusinessInput,
    OutputResponse,
    PresentationInput,
    PresentationEditInput,
    PresentationResponse,
    ExportPptxRequest,
)

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
        return result.model_copy(update={"prompt": prompt})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model query failed: {str(e)}")


@app.post("/api/presentation/generate", response_model=PresentationResponse)
async def create_presentation(input_data: PresentationInput) -> PresentationResponse:
    """
    Generate a business pitch presentation using Manus API.

    Accepts business details and presentation parameters, returns structured slides.
    """
    manus_key = settings.manus_api_key

    if not manus_key:
        raise HTTPException(
            status_code=400,
            detail="Manus API key not configured. Please set MANUS_API_KEY in environment.",
        )

    # Convert competing_players to list of dicts if present
    competing_players_data = None
    if input_data.competing_players:
        competing_players_data = [
            player.model_dump() for player in input_data.competing_players
        ]

    try:
        result = await generate_presentation(
            business_name=input_data.business_name,
            raw_idea=input_data.raw_idea,
            num_slides=input_data.num_slides,
            duration_minutes=input_data.duration_minutes,
            manus_api_key=manus_key,
            tagline=input_data.tagline,
            problem=input_data.problem,
            target_audience=input_data.target_audience,
            location_city=input_data.location_city,
            country=input_data.country,
            budget=input_data.budget,
            business_type=input_data.business_type,
            competing_players=competing_players_data,
            market_cap_or_target_revenue=input_data.market_cap_or_target_revenue,
            undiscovered_addons=input_data.undiscovered_addons,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Presentation generation failed: {str(e)}"
        )


@app.post("/api/presentation/edit", response_model=PresentationResponse)
async def edit_existing_presentation(
    input_data: PresentationEditInput,
) -> PresentationResponse:
    """
    Edit an existing presentation based on user feedback.

    Accepts current slides and edit request, returns updated presentation.
    """
    manus_key = settings.manus_api_key

    if not manus_key:
        raise HTTPException(
            status_code=400,
            detail="Manus API key not configured. Please set MANUS_API_KEY in environment.",
        )

    # Convert slides to list of dicts
    current_slides_data = [slide.model_dump() for slide in input_data.current_presentation]

    try:
        result = await edit_presentation(
            current_slides=current_slides_data,
            edit_request=input_data.edit_request,
            manus_api_key=manus_key,
            business_context=input_data.business_context,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Presentation editing failed: {str(e)}"
        )


@app.post("/api/presentation/export-pptx")
async def export_presentation_pptx(body: ExportPptxRequest) -> Response:
    """
    Build and return a PowerPoint (.pptx) file from presentation data.
    First slide shows business_name when provided; always ends with a Thank You slide.
    """
    presentation = body.presentation
    try:
        pptx_bytes = build_pptx_from_response(
            response=presentation.model_dump(),
            include_images=True,
            business_name=body.business_name,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to build PPTX: {str(e)}",
        )
    filename = _sanitize_filename(presentation.presentation_title) + ".pptx"
    return Response(
        content=pptx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


def _sanitize_filename(title: str) -> str:
    """Return a safe filename from presentation title."""
    safe = "".join(c for c in title if c.isalnum() or c in " -_")
    return safe.strip() or "presentation"


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
