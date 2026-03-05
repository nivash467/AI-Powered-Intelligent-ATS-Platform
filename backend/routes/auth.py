import os
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, status
from passlib.context import CryptContext
from jose import jwt
from dotenv import load_dotenv

from database.db import users_collection
from models.user import UserSignup, UserLogin, UserResponse, TokenResponse, UserProfileUpdate

load_dotenv()

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Config
SECRET_KEY = os.getenv("JWT_SECRET", "ats_platform_secret_key_2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours


def create_access_token(data: dict) -> str:
    """Generate a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def user_to_response(user: dict) -> UserResponse:
    """Convert a MongoDB user document to a UserResponse schema."""
    return UserResponse(
        id=str(user["_id"]),
        full_name=user["full_name"],
        email=user["email"],
        phone_number=user["phone_number"],
        role=user["role"],
        company_name=user["company_name"],
        industry=user.get("industry"),
        company_size=user.get("company_size"),
        location=user.get("location"),
        company_website=user.get("company_website"),
        created_at=user.get("created_at", "")
    )


# ─────────────────────────────────────────────
# POST /auth/signup
# ─────────────────────────────────────────────
@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserSignup):
    """Register a new HR user account."""

    # 1. Check for duplicate email
    existing = users_collection.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists."
        )

    # 2. Hash password with bcrypt
    hashed_password = pwd_context.hash(user_data.password)

    # 3. Store in MongoDB users collection
    new_user = {
        "full_name": user_data.full_name,
        "email": user_data.email.lower(),
        "phone_number": user_data.phone_number,
        "role": user_data.role,
        "password": hashed_password,
        "company_name": user_data.company_name,
        "industry": user_data.industry,
        "company_size": user_data.company_size,
        "location": user_data.location,
        "company_website": user_data.company_website,
        "created_at": datetime.utcnow().isoformat()
    }

    users_collection.insert_one(new_user)

    # 4. Return success message
    return {"message": "HR account created successfully"}


# ─────────────────────────────────────────────
# POST /auth/login
# ─────────────────────────────────────────────
@router.post("/login")
async def login(credentials: UserLogin):
    """Authenticate an HR user and return a JWT token."""

    # 1. Find user by email
    user = users_collection.find_one({"email": credentials.email.lower()})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # 2. Verify password using bcrypt
    if not pwd_context.verify(credentials.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # 3. Generate JWT token
    token = create_access_token({
        "sub": str(user["_id"]),
        "email": user["email"]
    })

    # 4. Return token and user info
    return {
        "token": token,
        "user": {
            "name": user["full_name"],
            "role": user["role"]
        }
    }


# ─────────────────────────────────────────────
# GET /auth/health
# ─────────────────────────────────────────────
@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "auth"}


# ─────────────────────────────────────────────
# GET /auth/profile
# ─────────────────────────────────────────────
@router.get("/profile", response_model=UserResponse)
async def get_profile(email: str):
    """Get HR profile details by email."""
    user = users_collection.find_one({"email": email.lower()})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with email '{email}' not found."
        )
    return user_to_response(user)


# ─────────────────────────────────────────────
# PUT /auth/update-profile
# ─────────────────────────────────────────────
@router.put("/update-profile")
async def update_profile(profile_data: UserProfileUpdate):
    """Update HR profile details."""
    print(f"Profile update request received for: {profile_data.email}")

    # 1. Prepare fields to update
    updated_fields = {
        k: v for k, v in profile_data.dict().items() 
        if v is not None and k != "email"
    }

    if not updated_fields:
        print("No fields provided to update in request.")
        return {"message": "No fields provided to update"}

    # 2. Update the user record in MongoDB users collection
    result = users_collection.update_one(
        {"email": profile_data.email.lower()},
        {"$set": updated_fields}
    )

    print(f"MongoDB Update Result: Matched {result.matched_count}, Modified {result.modified_count}")

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with email '{profile_data.email}' not found."
        )

    # 3. Retrieve and print updated user document
    updated_user = users_collection.find_one({"email": profile_data.email.lower()})
    # Remove password from log for security
    if updated_user and "password" in updated_user:
        updated_user["password"] = "*****"
    print(f"Updated user: {updated_user}")

    return {"message": "Profile updated successfully"}

