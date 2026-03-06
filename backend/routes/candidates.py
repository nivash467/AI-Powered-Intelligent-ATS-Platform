from fastapi import APIRouter
from database.db import candidates_collection, analysis_collection

router = APIRouter(prefix="/candidates", tags=["Candidates"])


# ─────────────────────────────────────────────
# GET /candidates/ranked
# ─────────────────────────────────────────────
@router.get("/ranked")
async def get_ranked_candidates():
    """
    Fetch all candidates from MongoDB, attach their ATS score,
    and return a ranked list sorted by score (highest first).
    """

    candidates = list(candidates_collection.find({}, {"_id": 0, "raw_text": 0}))

    ranked = []
    for c in candidates:
        # Look up the latest score for this candidate (by email or name)
        score_doc = analysis_collection.find_one(
            {"type": "candidate_score", "raw_scores": {"$exists": True}},
            sort=[("scored_at", -1)]
        )

        ats_score = score_doc["final_score"] if score_doc else 0

        ranked.append({
            "name": c.get("name", "Unknown"),
            "email": c.get("email"),
            "skills": c.get("skills", []),
            "github_link": c.get("github_link"),
            "leetcode_link": c.get("leetcode_link"),
            "score": ats_score
        })

    # Sort by score descending
    ranked.sort(key=lambda x: x["score"], reverse=True)

    return ranked
