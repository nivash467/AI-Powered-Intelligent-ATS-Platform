import re
import httpx
from typing import Optional


GITHUB_API = "https://api.github.com"


def extract_username(profile_link: str) -> str:
    """Extract GitHub username from a profile URL."""
    # Handle formats: https://github.com/username, github.com/username, username
    match = re.search(r'(?:https?://)?(?:www\.)?github\.com/([a-zA-Z0-9\-_]+)', profile_link)
    if match:
        return match.group(1)
    # If no URL pattern, assume it's a raw username
    clean = profile_link.strip().strip("/")
    if " " not in clean and len(clean) > 0:
        return clean
    return None


async def fetch_github_data(username: str) -> dict:
    """
    Fetch GitHub profile data using the public API.
    Returns repos, stars, forks, languages, and commit activity metrics.
    """

    async with httpx.AsyncClient(timeout=15.0) as client:
        headers = {"Accept": "application/vnd.github.v3+json"}

        # ─── 1. Fetch user profile ───────────────
        user_resp = await client.get(f"{GITHUB_API}/users/{username}", headers=headers)
        if user_resp.status_code != 200:
            return None
        user_data = user_resp.json()

        # ─── 2. Fetch repositories (up to 100) ──
        repos_resp = await client.get(
            f"{GITHUB_API}/users/{username}/repos",
            headers=headers,
            params={"per_page": 100, "sort": "updated"}
        )
        repos = repos_resp.json() if repos_resp.status_code == 200 else []

        # ─── 3. Calculate metrics ────────────────
        total_repos = len(repos)
        total_stars = sum(r.get("stargazers_count", 0) for r in repos)
        total_forks = sum(r.get("forks_count", 0) for r in repos)
        total_open_issues = sum(r.get("open_issues_count", 0) for r in repos)

        # Gather languages across all repos
        language_set = set()
        for r in repos:
            lang = r.get("language")
            if lang:
                language_set.add(lang)

        # ─── 4. Fetch commit activity (recent repos) ──
        # Check recent 5 repos for commit frequency
        total_commits = 0
        repos_with_commits = 0
        for repo in repos[:5]:
            try:
                commits_resp = await client.get(
                    f"{GITHUB_API}/repos/{username}/{repo['name']}/commits",
                    headers=headers,
                    params={"per_page": 30}
                )
                if commits_resp.status_code == 200:
                    commit_count = len(commits_resp.json())
                    total_commits += commit_count
                    if commit_count > 0:
                        repos_with_commits += 1
            except Exception:
                continue

        # Commit consistency: ratio of repos with recent commits
        commit_consistency = (repos_with_commits / max(len(repos[:5]), 1))

        return {
            "username": username,
            "avatar_url": user_data.get("avatar_url"),
            "bio": user_data.get("bio"),
            "public_repos": user_data.get("public_repos", total_repos),
            "followers": user_data.get("followers", 0),
            "repositories": total_repos,
            "stars": total_stars,
            "forks": total_forks,
            "open_issues": total_open_issues,
            "languages": sorted(list(language_set)),
            "total_recent_commits": total_commits,
            "commit_consistency": round(commit_consistency, 2),
        }


def calculate_github_score(data: dict) -> float:
    """
    Calculate GitHub score using the weighted formula:

    RepoScore = (0.35 × stars_norm) +
                (0.25 × forks_norm) +
                (0.20 × issues_norm) +
                (0.20 × commit_consistency)

    Each metric is normalized to 0–1 range using saturation caps.
    """

    # Normalize with saturation caps (reasonable maximums for scoring)
    stars_norm = min(data["stars"] / 500, 1.0)          # 500+ stars = perfect
    forks_norm = min(data["forks"] / 200, 1.0)          # 200+ forks = perfect
    issues_norm = min(data["open_issues"] / 100, 1.0)   # 100+ issues = perfect
    commit_consistency = data["commit_consistency"]       # Already 0-1

    score = (
        0.35 * stars_norm +
        0.25 * forks_norm +
        0.20 * issues_norm +
        0.20 * commit_consistency
    )

    # Scale to 0-100
    return round(score * 100, 2)
