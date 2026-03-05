from datetime import datetime
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from database.db import analysis_collection
from services.github_analyzer import extract_username as gh_extract_username, fetch_github_data, calculate_github_score
from services.leetcode_analyzer import extract_username as lc_extract_username, fetch_leetcode_data, calculate_leetcode_score
from services.ollama_analyzer import analyze_resume_with_llm
from services.scoring_engine import compute_ats_score, DEFAULT_WEIGHTS

router = APIRouter(prefix="/analyze", tags=["Analysis"])


class GitHubAnalysisRequest(BaseModel):
    github_profile_link: str


class LeetCodeAnalysisRequest(BaseModel):
    leetcode_profile_link: str


class ResumeAIRequest(BaseModel):
    resume_text: str


class CandidateScoreRequest(BaseModel):
    github_score: float = 0
    project_relevance: float = 0
    code_quality: float = 0
    leetcode_score: float = 0
    resume_credibility: float = 0
    learning_trajectory: float = 0
    # Optional custom weights (must sum to 1.0)
    custom_weights: dict = None


# ─────────────────────────────────────────────
# POST /analyze/github
# ─────────────────────────────────────────────
@router.post("/github")
async def analyze_github(request: GitHubAnalysisRequest):
    """
    Analyze a GitHub profile: fetch repos, stars, forks, languages,
    commit activity, and compute a weighted GitHub Score.
    """

    # 1. Extract username from link
    username = gh_extract_username(request.github_profile_link)
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid GitHub profile link. Example: https://github.com/username"
        )

    # 2. Fetch data from GitHub public API
    github_data = await fetch_github_data(username)
    if not github_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"GitHub user '{username}' not found."
        )

    # 3. Calculate GitHub Score
    github_score = calculate_github_score(github_data)

    # 4. Store result in MongoDB analysis collection
    analysis_doc = {
        "type": "github",
        "username": username,
        "profile_link": request.github_profile_link,
        "repositories": github_data["repositories"],
        "stars": github_data["stars"],
        "forks": github_data["forks"],
        "languages": github_data["languages"],
        "open_issues": github_data["open_issues"],
        "commit_consistency": github_data["commit_consistency"],
        "total_recent_commits": github_data["total_recent_commits"],
        "github_score": github_score,
        "analyzed_at": datetime.utcnow().isoformat()
    }
    analysis_collection.insert_one(analysis_doc)

    # 5. Return result
    return {
        "repositories": github_data["repositories"],
        "stars": github_data["stars"],
        "forks": github_data["forks"],
        "languages": github_data["languages"],
        "github_score": github_score
    }


# ─────────────────────────────────────────────
# POST /analyze/leetcode
# ─────────────────────────────────────────────
@router.post("/leetcode")
async def analyze_leetcode(request: LeetCodeAnalysisRequest):
    """
    Analyze a LeetCode profile: fetch solved problem counts,
    global ranking, and compute a weighted difficulty score.
    """

    # 1. Extract username from link
    username = lc_extract_username(request.leetcode_profile_link)
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid LeetCode profile link. Example: https://leetcode.com/u/username"
        )

    # 2. Fetch data from LeetCode GraphQL API
    leetcode_data = await fetch_leetcode_data(username)
    if not leetcode_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"LeetCode user '{username}' not found."
        )

    # 3. Calculate LeetCode difficulty score
    leetcode_score = calculate_leetcode_score(leetcode_data)

    # 4. Store result in MongoDB analysis collection
    analysis_doc = {
        "type": "leetcode",
        "username": username,
        "profile_link": request.leetcode_profile_link,
        "total_solved": leetcode_data["total_solved"],
        "easy_solved": leetcode_data["easy_solved"],
        "medium_solved": leetcode_data["medium_solved"],
        "hard_solved": leetcode_data["hard_solved"],
        "global_ranking": leetcode_data["global_ranking"],
        "leetcode_score": leetcode_score,
        "analyzed_at": datetime.utcnow().isoformat()
    }
    analysis_collection.insert_one(analysis_doc)

    # 5. Return result
    return {
        "total_solved": leetcode_data["total_solved"],
        "easy_solved": leetcode_data["easy_solved"],
        "medium_solved": leetcode_data["medium_solved"],
        "hard_solved": leetcode_data["hard_solved"],
        "global_ranking": leetcode_data["global_ranking"],
        "leetcode_score": leetcode_score
    }


# ─────────────────────────────────────────────
# POST /analyze/resume-ai
# ─────────────────────────────────────────────
@router.post("/resume-ai")
async def analyze_resume_ai(request: ResumeAIRequest):
    """
    Analyze resume text using Ollama LLM (llama3:8b).
    Returns structured JSON with skills, project complexity,
    technology categories, and experience level.
    """

    if not request.resume_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume text cannot be empty."
        )

    # Send to Ollama LLM
    analysis = await analyze_resume_with_llm(request.resume_text)

    # Store in MongoDB
    analysis_doc = {
        "type": "resume_ai",
        "skills": analysis.get("skills", []),
        "project_complexity_score": analysis.get("project_complexity_score", 0),
        "technology_categories": analysis.get("technology_categories", []),
        "experience_level": analysis.get("experience_level", "Unknown"),
        "analyzed_at": datetime.utcnow().isoformat()
    }
    analysis_collection.insert_one(analysis_doc)

    return {
        "skills": analysis.get("skills", []),
        "project_complexity_score": analysis.get("project_complexity_score", 0),
        "technology_categories": analysis.get("technology_categories", []),
        "experience_level": analysis.get("experience_level", "Unknown")
    }


# ─────────────────────────────────────────────
# POST /analyze/score
# ─────────────────────────────────────────────
@router.post("/score")
async def compute_candidate_score(request: CandidateScoreRequest):
    """
    Compute the final ATS score from a candidate's feature vector.

    Feature vector: x = [g, p, q, l, r, t]
    Normalization:  min-max → 0-1
    Final score:    S = w · x  (scaled to 0-100)
    """

    raw_scores = {
        "github_score": request.github_score,
        "project_relevance": request.project_relevance,
        "code_quality": request.code_quality,
        "leetcode_score": request.leetcode_score,
        "resume_credibility": request.resume_credibility,
        "learning_trajectory": request.learning_trajectory,
    }

    # Compute score (with optional custom weights)
    result = compute_ats_score(raw_scores, request.custom_weights)

    # Store in MongoDB
    analysis_doc = {
        "type": "candidate_score",
        "raw_scores": raw_scores,
        "feature_vector": result["feature_vector"],
        "weights": result["weights"],
        "final_score": result["final_score"],
        "breakdown": result["breakdown"],
        "scored_at": datetime.utcnow().isoformat()
    }
    analysis_collection.insert_one(analysis_doc)

    return {
        "final_score": result["final_score"],
        "feature_vector": result["feature_vector"],
        "breakdown": result["breakdown"]
    }
