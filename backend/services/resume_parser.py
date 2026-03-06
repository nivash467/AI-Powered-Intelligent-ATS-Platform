import re
import pdfplumber


def extract_text_from_pdf(file_path: str) -> str:
    """Extract all text content from a PDF file using pdfplumber."""
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text.strip()


def extract_candidate_info(text: str) -> dict:
    """
    Parse resume text and extract structured candidate information:
    name, email, skills, projects, github, leetcode, linkedin.
    """

    info = {
        "name": None,
        "email": None,
        "skills": [],
        "projects": [],
        "github_link": None,
        "leetcode_link": None,
        "linkedin_link": None,
    }

    lines = text.split("\n")
    lines = [l.strip() for l in lines if l.strip()]

    # ─── 1. Extract Email ────────────────────────
    email_pattern = r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}'
    email_match = re.search(email_pattern, text)
    if email_match:
        info["email"] = email_match.group(0).lower()

    # ─── 2. Extract Name ─────────────────────────
    # Heuristic: first non-empty line that isn't an email/URL/section header
    section_headers = {
        "summary", "objective", "education", "experience", "skills",
        "projects", "certifications", "achievements", "references",
        "contact", "profile", "about", "work experience", "technical skills",
        "professional experience", "personal details", "personal information"
    }
    for line in lines:
        clean = line.strip()
        # Skip if it's an email, URL, phone, or section header
        if re.search(email_pattern, clean):
            continue
        if re.search(r'https?://', clean):
            continue
        if re.search(r'[\+]?\d[\d\-\(\)\s]{7,}', clean):
            continue
        if clean.lower().replace(":", "").strip() in section_headers:
            continue
        if len(clean) < 2 or len(clean) > 60:
            continue
        # Likely the candidate's name
        info["name"] = clean
        break

    # ─── 3. Extract Links ────────────────────────
    # GitHub
    github_pattern = r'(?:https?://)?(?:www\.)?github\.com/([a-zA-Z0-9\-_]+)'
    github_match = re.search(github_pattern, text, re.IGNORECASE)
    if github_match:
        info["github_link"] = f"https://github.com/{github_match.group(1)}"

    # LeetCode
    leetcode_pattern = r'(?:https?://)?(?:www\.)?leetcode\.com/(?:u/)?([a-zA-Z0-9\-_]+)'
    leetcode_match = re.search(leetcode_pattern, text, re.IGNORECASE)
    if leetcode_match:
        info["leetcode_link"] = f"https://leetcode.com/u/{leetcode_match.group(1)}"

    # LinkedIn
    linkedin_pattern = r'(?:https?://)?(?:www\.)?linkedin\.com/in/([a-zA-Z0-9\-_]+)'
    linkedin_match = re.search(linkedin_pattern, text, re.IGNORECASE)
    if linkedin_match:
        info["linkedin_link"] = f"https://linkedin.com/in/{linkedin_match.group(1)}"

    # ─── 4. Extract Skills ───────────────────────
    skills_section = extract_section(lines, ["skills", "technical skills", "key skills", "core competencies"])
    if skills_section:
        # Split by common delimiters: commas, pipes, bullets, semicolons
        raw_skills = re.split(r'[,|;•·▪►●○◦\-]|\s{2,}', skills_section)
        info["skills"] = [
            s.strip().strip("•·▪►●○◦- ") for s in raw_skills
            if s.strip() and len(s.strip()) > 1 and len(s.strip()) < 50
        ]

    # ─── 5. Extract Projects ─────────────────────
    projects_section = extract_section(lines, ["projects", "personal projects", "academic projects", "key projects"])
    if projects_section:
        # Each project is typically on its own line or starts with a bullet/dash
        project_lines = projects_section.split("\n")
        for pl in project_lines:
            pl = pl.strip().strip("•·▪►●○◦- ")
            # Take the first part before any description
            if pl and len(pl) > 3 and not pl.lower().startswith("http"):
                # If line has a colon or dash separator, take only the project name
                name_part = re.split(r'[:\-–—]', pl)[0].strip()
                if name_part and len(name_part) > 2 and len(name_part) < 100:
                    info["projects"].append(name_part)

    return info


def extract_section(lines: list, section_names: list) -> str:
    """
    Extract text belonging to a specific resume section.
    Returns the content between the section header and the next section.
    """
    common_sections = {
        "summary", "objective", "education", "experience", "work experience",
        "professional experience", "skills", "technical skills", "key skills",
        "core competencies", "projects", "personal projects", "academic projects",
        "certifications", "achievements", "awards", "references", "interests",
        "hobbies", "languages", "publications", "contact", "profile",
        "professional summary", "career objective", "key projects"
    }

    capture = False
    content_lines = []

    for line in lines:
        clean = line.strip().lower().rstrip(":")
        if clean in [s.lower() for s in section_names]:
            capture = True
            continue
        if capture:
            # Stop if we hit another section header
            if clean in common_sections and clean not in [s.lower() for s in section_names]:
                break
            content_lines.append(line)

    return "\n".join(content_lines).strip() if content_lines else None
