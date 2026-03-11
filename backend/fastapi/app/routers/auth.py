"""Auth endpoints — anonymous for now, OAuth later."""

from fastapi import APIRouter
from app.schemas import TokenResponse

router = APIRouter()


@router.post("/anonymous", response_model=TokenResponse)
async def anonymous_login():
    """Create an anonymous session. Returns a JWT for API auth."""
    # TODO: Generate real JWT
    return TokenResponse(access_token="anonymous-token-placeholder")


@router.get("/me")
async def get_current_user():
    """Get the current authenticated user."""
    # TODO: Extract from JWT
    return {
        "id": "anonymous",
        "display_name": "Anonymous User",
        "auth_provider": "anonymous",
    }
