"""
Webmail — Auth 路由
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.auth import (
    ErrorResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth import (
    get_current_user,
    login_user,
    refresh_user_token,
    register_user,
)

router = APIRouter(tags=["auth"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="用户注册",
    responses={409: {"model": ErrorResponse}},
)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """注册新用户。需要邮箱+密码+可选名称。密码强度: 8+字符, 大小写+数字。"""
    try:
        return await register_user(db, request)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="用户登录",
    responses={401: {"model": ErrorResponse}},
)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """用户登录。返回 access_token + refresh_token + 用户信息。"""
    try:
        return await login_user(db, request)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="刷新令牌",
    responses={401: {"model": ErrorResponse}},
)
async def refresh(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """通过 refresh_token 获取新的 token 对。"""
    try:
        return await refresh_user_token(db, request.refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.get(
    "/me",
    response_model=UserResponse,
    summary="当前用户信息",
)
async def me(current_user=Depends(get_current_user)):
    """获取当前登录用户的完整信息。需要 JWT。"""
    return UserResponse.model_validate(current_user)
