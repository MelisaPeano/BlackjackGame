from typing import Annotated, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status

from app.core.errors import GameError
from app.core.security import create_access_token, decode_access_token
from app.models.user import TokenResponse, UserLoginRequest, UserRegisterRequest, UserResponse
from app.services.user_service import UserService

router = APIRouter(tags=["Autenticación"])


def get_user_service(request: Request) -> UserService:
    """Inyección de dependencias: Obtiene la instancia de UserService desde el estado global de la app."""
    service = getattr(request.app.state, "user_service", None)
    if service is None:
        service = UserService()
        request.app.state.user_service = service
    return service


async def get_current_user(
    authorization: Annotated[Optional[str], Header()] = None,
    service: UserService = Depends(get_user_service),
) -> UserResponse:
    """Inyección de dependencias: Valida el token JWT en la cabecera Authorization y retorna el usuario autenticado."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autorización faltante o formato inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ", 1)[1].strip()
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await service.get_by_username(payload["sub"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )
    return user


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserRegisterRequest,
    service: UserService = Depends(get_user_service),
):
    """Endpoint para registrar un nuevo jugador. Hashea la contraseña y retorna el usuario con su token JWT."""
    try:
        user = await service.register_user(user_in)
    except GameError as e:
        if e.code == "USER_ALREADY_EXISTS":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=e.message)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)

    token = create_access_token(data={"sub": user.username, "role": user.role})
    return TokenResponse(access_token=token, token_type="bearer", user=user)


@router.post("/login", response_model=TokenResponse)
async def login(
    login_in: UserLoginRequest,
    service: UserService = Depends(get_user_service),
):
    """Endpoint para iniciar sesión. Valida credenciales y genera un token JWT."""
    try:
        user = await service.authenticate_user(login_in)
    except GameError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=e.message)

    token = create_access_token(data={"sub": user.username, "role": user.role})
    return TokenResponse(access_token=token, token_type="bearer", user=user)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    """Endpoint protegido: Retorna la información de perfil y fichas del usuario autenticado."""
    return current_user
