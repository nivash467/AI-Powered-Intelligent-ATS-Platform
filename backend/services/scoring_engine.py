"""
Candidate Scoring Engine

Feature vector: x = [g, p, q, l, r, t]
  g = GitHub score
  p = Project relevance score
  q = Code quality score
  l = LeetCode score
  r = Resume credibility score
  t = Learning trajectory score

Normalization: min-max → x_norm = (x - x_min) / (x_max - x_min)
Final score:   S = w · x  (weighted dot product, scaled to 0-100)
"""

# Default weights (must sum to 1.0)
DEFAULT_WEIGHTS = {
    "github_score": 0.30,
    "project_relevance": 0.25,
    "code_quality": 0.15,
    "leetcode_score": 0.10,
    "resume_credibility": 0.10,
    "learning_trajectory": 0.10,
}

# Min-Max ranges for each feature (used for normalization)
# These represent the expected real-world ranges
FEATURE_RANGES = {
    "github_score":        {"min": 0, "max": 100},
    "project_relevance":   {"min": 0, "max": 10},
    "code_quality":        {"min": 0, "max": 10},
    "leetcode_score":      {"min": 0, "max": 4},     # L formula returns 1-4
    "resume_credibility":  {"min": 0, "max": 10},
    "learning_trajectory": {"min": 0, "max": 10},
}


def normalize(value: float, x_min: float, x_max: float) -> float:
    """
    Min-Max normalization: x_norm = (x - x_min) / (x_max - x_min)
    Clamps to [0, 1] range.
    """
    if x_max == x_min:
        return 0.0
    normalized = (value - x_min) / (x_max - x_min)
    return max(0.0, min(1.0, normalized))


def compute_feature_vector(raw_scores: dict) -> list:
    """
    Build the normalized feature vector from raw scores.
    Returns: [g_norm, p_norm, q_norm, l_norm, r_norm, t_norm]
    """
    features = []
    for key in ["github_score", "project_relevance", "code_quality",
                "leetcode_score", "resume_credibility", "learning_trajectory"]:
        value = raw_scores.get(key, 0)
        r = FEATURE_RANGES[key]
        norm = normalize(value, r["min"], r["max"])
        features.append(round(norm, 4))
    return features


def compute_ats_score(raw_scores: dict, weights: dict = None) -> dict:
    """
    Compute the final ATS score.

    S = w · x  (dot product of weights and normalized features)
    Scaled to 0-100.

    Returns a detailed breakdown with individual normalized scores
    and the final composite score.
    """
    w = weights or DEFAULT_WEIGHTS

    # Normalize each feature
    feature_vector = compute_feature_vector(raw_scores)

    # Weight keys in order
    weight_keys = ["github_score", "project_relevance", "code_quality",
                   "leetcode_score", "resume_credibility", "learning_trajectory"]
    weight_vector = [w.get(k, DEFAULT_WEIGHTS[k]) for k in weight_keys]

    # Weighted dot product: S = w · x
    weighted_sum = sum(f * wt for f, wt in zip(feature_vector, weight_vector))

    # Scale to 0-100
    final_score = round(weighted_sum * 100, 2)

    # Build breakdown
    breakdown = {}
    for i, key in enumerate(weight_keys):
        breakdown[key] = {
            "raw": raw_scores.get(key, 0),
            "normalized": feature_vector[i],
            "weight": weight_vector[i],
            "weighted_contribution": round(feature_vector[i] * weight_vector[i] * 100, 2)
        }

    return {
        "feature_vector": feature_vector,
        "weights": weight_vector,
        "final_score": final_score,
        "breakdown": breakdown
    }
