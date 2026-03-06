from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UserSignup(BaseModel):
    """Schema for user registration request."""
    full_name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=5, max_length=100)
    phone_number: str = Field(..., min_length=5, max_length=20)
    role: str = Field(default="Recruiter")
    password: str = Field(..., min_length=8, max_length=128)
    company_name: str = Field(..., min_length=1, max_length=100)
    industry: Optional[str] = None
    company_size: Optional[str] = None
    location: Optional[str] = None
    company_website: Optional[str] = None


class UserLogin(BaseModel):
    """Schema for user login request."""
    email: str
    password: str


class UserResponse(BaseModel):
    """Schema for user data returned in responses (no password)."""
    id: str
    full_name: str
    email: str
    phone_number: str
    role: str
    company_name: str
    industry: Optional[str] = None
    company_size: Optional[str] = None
    location: Optional[str] = None
    company_website: Optional[str] = None
    created_at: Optional[str] = None


class TokenResponse(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UserProfileUpdate(BaseModel):
    """Schema for updating user profile details."""
    email: str  # Search key
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    company_name: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    location: Optional[str] = None
    company_website: Optional[str] = None
