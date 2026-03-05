/**
 * Service to handle LinkedIn profile data extraction.
 * Note: LinkedIn does not provide a public, unauthenticated API.
 * This service provides realistic mock data based on the extracted username to
 * demonstrate the Candidate Intelligence features (Activity Score, Consistency Score, Role Fit).
 * 
 * If the username is "notfound", it will simulate an API failure to trigger the fallback UI.
 */

const TIMEOUT_MS = 3000;

export const fetchLinkedInCandidateData = async (username) => {
    return new Promise((resolve) => {
        console.log(`📡 Fetching LinkedIn data for: ${username}...`);

        setTimeout(() => {
            // Simulate API failure to show the fallback error UI
            if (username.toLowerCase().includes('notfound') || username.toLowerCase().includes('error')) {
                console.warn(`Failed to fetch LinkedIn data for ${username}: Profile not public or API blocked`);
                resolve(null);
                return;
            }

            // Generate deterministic mock data based on the username string length
            // so the data stays consistent across re-renders for the same candidate.
            const seed = username.length;

            const connections = Math.min(500, Math.max(50, seed * 45));
            const posts = Math.floor(seed * 2.5);
            const followers = connections + Math.floor(seed * 15);

            const skills = [
                "JavaScript", "React.js", "Node.js", "Python",
                "Software Engineering", "Agile Methodologies", "System Design"
            ].slice(0, Math.max(3, seed % 7 + 1));

            resolve({
                username: username,
                profile_url: `https://www.linkedin.com/in/${username}`,
                connections_count: connections,
                posts_count: posts,
                followers_count: followers,
                headline: "Software Engineer | Building Scalable Web Applications",
                about: "Passionate about building scalable backends and beautiful frontends.",
                current_role: "Software Engineer",
                skills: skills,
                experience_summary: "Software Engineer at TechCorp (2 yrs). Junior Developer at StartupInc (2 yrs).",
                education: "Bachelor of Science in Computer Science",
                certifications: ["AWS Certified Solutions Architect", "React Developer Certificate"]
            });
        }, 1500); // 1.5s simulated network delay
    });
};

/**
 * Calculates the LinkedIn Activity Score.
 * Formula: 0.40 * connection_count + 0.30 * post_count + 0.30 * skills_count
 * Normalized to 0-100.
 */
export const calculateLinkedInActivityScore = (linkedinData) => {
    if (!linkedinData) return 0;

    const connections = linkedinData.connections_count || 0;
    const posts = linkedinData.posts_count || 0;
    const skills = linkedinData.skills?.length || 0;

    // Cap values for normalization
    const connNorm = Math.min(connections / 500, 1) * 100;
    const postNorm = Math.min(posts / 50, 1) * 100;
    const skillNorm = Math.min(skills / 15, 1) * 100;

    const rawScore = (0.40 * connNorm) + (0.30 * postNorm) + (0.30 * skillNorm);
    return Math.min(Math.round(rawScore), 100);
};

/**
 * Calculates the Resume vs LinkedIn Consistency Score.
 * Mock implementation that returns a score based on presence of data.
 * In a real implementation, this would compare specific strings.
 */
export const calculateConsistencyScore = (resumeData, linkedinData) => {
    if (!linkedinData) return 0;

    let score = 0;

    // Simulate Job Title Match (+30)
    if (linkedinData.current_role) score += 30;

    // Simulate Skills Match (+30)
    if (linkedinData.skills && resumeData.foundSkills && linkedinData.skills.some(s => resumeData.foundSkills.includes(s))) {
        score += 30;
    } else if (linkedinData.skills && linkedinData.skills.length > 0) {
        score += 15; // Partial match
    }

    // Simulate Experience Match (+20)
    if (linkedinData.experience_summary && resumeData.experienceDetected > 0) score += 20;

    // Simulate Education Match (+20)
    if (linkedinData.education && resumeData.education && resumeData.education !== 'Not Found' && resumeData.education !== 'Not Detected') score += 20;

    return Math.min(score, 100);
};

/**
 * Calculates Skill Credibility Score by cross-referencing Resume skills with LinkedIn skills.
 * (If GitHub data were passed here, it could also be cross-referenced)
 */
export const calculateSkillCredibilityScore = (resumeData, linkedinData) => {
    if (!linkedinData) return 0;
    if (!resumeData || !resumeData.foundSkills || resumeData.foundSkills.length === 0) return 0;

    const resumeSkills = resumeData.foundSkills.map(s => s.toLowerCase());
    const linkedInSkills = (linkedinData.skills || []).map(s => s.toLowerCase());

    if (linkedInSkills.length === 0) return 0;

    // Count how many resume skills are also explicitly listed on LinkedIn
    const matches = resumeSkills.filter(rs => linkedInSkills.some(ls => ls.includes(rs) || rs.includes(ls)));

    // Base score on proportion of matched skills, but gracefully handle partial profiles
    const rawScore = (matches.length / Math.min(resumeSkills.length, linkedInSkills.length)) * 100;

    // Add a small penalty if LinkedIn lists massive amounts of skills not on resume (potential stuffing)
    const discrepancyPenalty = Math.max(0, (linkedInSkills.length - resumeSkills.length) * 2);

    return Math.max(0, Math.min(Math.round(rawScore - discrepancyPenalty), 100));
};

/**
 * Calculates Experience Quality Score based on career progression markers in experience_summary.
 */
export const calculateExperienceQualityScore = (linkedinData) => {
    if (!linkedinData || !linkedinData.experience_summary) return 0;

    const expText = linkedinData.experience_summary.toLowerCase();
    let score = 50; // Base score for having experience

    // Progression markers
    if (expText.includes('senior') || expText.includes('lead') || expText.includes('principal') || expText.includes('manager')) score += 30;
    else if (expText.includes('mid') || expText.includes('associate')) score += 15;

    // Depth markers (mentions of years)
    const yearMatch = expText.match(/(\d+)\s*(?:year|yr)s?/);
    if (yearMatch) {
        const years = parseInt(yearMatch[1], 10);
        score += Math.min(years * 5, 20); // up to 20 pts for listed tenure
    }

    return Math.min(score, 100);
};

/**
 * Calculates Technical Activity Score based on technical keywords in the profile.
 */
export const calculateTechnicalActivityScore = (linkedinData) => {
    if (!linkedinData) return 0;

    const fullProfileText = [
        linkedinData.headline,
        linkedinData.about,
        linkedinData.experience_summary,
        ...(linkedinData.skills || [])
    ].join(' ').toLowerCase();

    const techKeywords = [
        'software', 'developer', 'engineer', 'frontend', 'backend', 'full-stack', 'fullstack',
        'machine learning', 'ai', 'artificial intelligence', 'data', 'cloud', 'aws', 'gcp', 'azure',
        'architecture', 'system design', 'devops', 'kubernetes', 'docker', 'agile', 'scrum'
    ];

    let matchCount = 0;
    techKeywords.forEach(kw => {
        if (fullProfileText.includes(kw)) matchCount++;
    });

    const maxExpectedKeywords = 8;
    const rawScore = (matchCount / maxExpectedKeywords) * 100;

    return Math.min(Math.round(rawScore), 100);
};

/**
 * Calculates Profile Completeness Score based on presence of key sections.
 */
export const calculateProfileCompletenessScore = (linkedinData) => {
    if (!linkedinData) return 0;

    let score = 0;
    if (linkedinData.headline) score += 15;
    if (linkedinData.about) score += 20;
    if (linkedinData.experience_summary) score += 25;
    if (linkedinData.skills && linkedinData.skills.length > 0) score += 20;
    if (linkedinData.education) score += 10;
    if (linkedinData.certifications && linkedinData.certifications.length > 0) score += 10;

    return Math.min(score, 100);
};

/**
 * Calculates Authenticity Score by detecting suspicious signals or excellent coherence.
 */
export const calculateAuthenticityScore = (linkedinData, resumeConsistencyScore) => {
    if (!linkedinData) return 0;

    let score = 80; // Baseline assumption of truth

    // Penalize if there are 500+ connections but absolutely no experience/about section
    if (linkedinData.connections_count >= 500 && !linkedinData.experience_summary && !linkedinData.about) {
        score -= 30;
    }

    // Reward for having detailed text sections
    if (linkedinData.about && linkedinData.about.length > 50) score += 10;
    if (linkedinData.experience_summary && linkedinData.experience_summary.length > 100) score += 10;

    // Consistency is a strong indicator of authenticity
    if (resumeConsistencyScore < 30) score -= 40; // Massive divergence -> highly suspicious
    else if (resumeConsistencyScore > 80) score += 10; // Strong alignment -> highly authentic

    // Cap
    if (score > 99) return 99; // Never 100% certain
    if (score < 10) return 10; // Floor

    return score;
};
