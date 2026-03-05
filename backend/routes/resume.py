import os
import tempfile
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException, status

from database.db import candidates_collection
from services.resume_parser import extract_text_from_pdf, extract_candidate_info

router = APIRouter(prefix="/resume", tags=["Resume"])


# ─────────────────────────────────────────────
# POST /resume/upload
# ─────────────────────────────────────────────
@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_resume(file: UploadFile = File(...)):
    """
    Upload a PDF resume, extract text, parse candidate info,
    and store it in the MongoDB candidates collection.
    """

    # 1. Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are accepted."
        )

    # 2. Save file temporarily
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            contents = await file.read()
            tmp.write(contents)
            tmp_path = tmp.name
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save uploaded file: {str(e)}"
        )

    # 3. Extract text from PDF
    try:
        raw_text = extract_text_from_pdf(tmp_path)
    except Exception as e:
        os.unlink(tmp_path)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to extract text from PDF: {str(e)}"
        )

    if not raw_text.strip():
        os.unlink(tmp_path)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No text could be extracted from the PDF. It may be image-based."
        )

    # 4. Extract candidate information
    candidate_info = extract_candidate_info(raw_text)

    # 5. Store in MongoDB candidates collection
    candidate_doc = {
        "name": candidate_info["name"],
        "email": candidate_info["email"],
        "skills": candidate_info["skills"],
        "projects": candidate_info["projects"],
        "github_link": candidate_info["github_link"],
        "leetcode_link": candidate_info["leetcode_link"],
        "linkedin_link": candidate_info["linkedin_link"],
        "raw_text": raw_text,
        "original_filename": file.filename,
        "uploaded_at": datetime.utcnow().isoformat()
    }

    result = candidates_collection.insert_one(candidate_doc)

    # 6. Clean up temp file
    os.unlink(tmp_path)

    # 7. Return extracted data
    return {
        "message": "Resume uploaded and parsed successfully",
        "candidate_id": str(result.inserted_id),
        "extracted_data": {
            "name": candidate_info["name"],
            "email": candidate_info["email"],
            "skills": candidate_info["skills"],
            "projects": candidate_info["projects"],
            "github_link": candidate_info["github_link"],
            "leetcode_link": candidate_info["leetcode_link"],
            "linkedin_link": candidate_info["linkedin_link"]
        }
    }
