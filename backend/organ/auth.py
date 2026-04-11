import os

from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_bearer_scheme = HTTPBearer(auto_error=False)


def verify_api_key(
    credentials: HTTPAuthorizationCredentials = Security(_bearer_scheme),
) -> None:
    api_key = os.environ.get("ORGAN_API_KEY", "")
    if not api_key:
        raise RuntimeError("ORGAN_API_KEY environment variable is not set")
    if credentials is None or credentials.credentials != api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
