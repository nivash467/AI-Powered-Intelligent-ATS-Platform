import re
import httpx


LEETCODE_GRAPHQL = "https://leetcode.com/graphql"


def extract_username(profile_link: str) -> str:
    """Extract LeetCode username from a profile URL."""
    # Handle: https://leetcode.com/u/username, leetcode.com/username, raw username
    match = re.search(r'(?:https?://)?(?:www\.)?leetcode\.com/(?:u/)?([a-zA-Z0-9\-_]+)', profile_link)
    if match:
        return match.group(1)
    clean = profile_link.strip().strip("/")
    if " " not in clean and len(clean) > 0:
        return clean
    return None


async def fetch_leetcode_data(username: str) -> dict:
    """
    Fetch LeetCode profile data using the public GraphQL endpoint.
    Returns total/easy/medium/hard solved counts and global ranking.
    """

    # Query for problem stats
    stats_query = {
        "query": """
        query getUserProfile($username: String!) {
            matchedUser(username: $username) {
                username
                profile {
                    ranking
                    reputation
                    starRating
                }
                submitStatsGlobal {
                    acSubmissionNum {
                        difficulty
                        count
                    }
                }
            }
        }
        """,
        "variables": {"username": username}
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            LEETCODE_GRAPHQL,
            json=stats_query,
            headers={
                "Content-Type": "application/json",
                "Referer": "https://leetcode.com"
            }
        )

        if resp.status_code != 200:
            return None

        data = resp.json()
        user = data.get("data", {}).get("matchedUser")
        if not user:
            return None

        # Parse submission stats
        submissions = user.get("submitStatsGlobal", {}).get("acSubmissionNum", [])

        stats = {"All": 0, "Easy": 0, "Medium": 0, "Hard": 0}
        for item in submissions:
            difficulty = item.get("difficulty", "")
            count = item.get("count", 0)
            if difficulty in stats:
                stats[difficulty] = count

        profile = user.get("profile", {})

        return {
            "username": user.get("username", username),
            "total_solved": stats["All"],
            "easy_solved": stats["Easy"],
            "medium_solved": stats["Medium"],
            "hard_solved": stats["Hard"],
            "global_ranking": profile.get("ranking", 0),
            "reputation": profile.get("reputation", 0),
        }


def calculate_leetcode_score(data: dict) -> float:
    """
    Compute LeetCode difficulty score:

    L = (1 × Easy + 2 × Medium + 4 × Hard) / TotalSolved

    Returns a score where higher = harder problems solved.
    Max possible = 4.0 (all hard), Min = 1.0 (all easy).
    """
    total = data["total_solved"]
    if total == 0:
        return 0.0

    weighted = (
        1 * data["easy_solved"] +
        2 * data["medium_solved"] +
        4 * data["hard_solved"]
    )

    score = round(weighted / total, 2)
    return score
