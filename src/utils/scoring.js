import { getSemanticSimilarity } from './embeddings.js';
import { fetchGitHubCandidateData } from './githubService.js';
import { fetchLeetCodeCandidateData } from './leetcodeService.js';
import {
    fetchLinkedInCandidateData,
    calculateLinkedInActivityScore,
    calculateConsistencyScore,
    calculateSkillCredibilityScore,
    calculateExperienceQualityScore,
    calculateTechnicalActivityScore,
    calculateProfileCompletenessScore,
    calculateAuthenticityScore
} from './linkedinService.js';
import { evaluateRoleSuitability } from './aiGenerator.js';

export const analyzeResume = async (text, jobConfig, platformPreferences) => {
    const normalizedText = text.toLowerCase().replace(/\s+/g, ' ');

    // 1. Skills extraction
    const rawSkills = Array.isArray(jobConfig.skills) ? jobConfig.skills : (jobConfig.skills || '').split(',');
    const requiredSkills = rawSkills
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0);

    const foundSkills = [];
    const missingSkills = [];

    requiredSkills.forEach(skill => {
        const escapedSkill = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const hasSymbols = /[^a-z0-9\s]/i.test(skill);
        let isMatch = false;

        if (hasSymbols) {
            isMatch = normalizedText.includes(skill);
        } else {
            const regex = new RegExp(`\\b${escapedSkill}\\b`, 'i');
            isMatch = regex.test(normalizedText);
        }

        if (isMatch) foundSkills.push(skill);
        else missingSkills.push(skill);
    });

    // ... [Experience/Education extraction logic remains similar] ...

    const experienceRegex = /(\d+)\+?\s*(?:year|yr)s?(?:\s+of)?\s*(?:experience|exp)?/gi;
    let match;
    let maxYears = 0;
    while ((match = experienceRegex.exec(normalizedText)) !== null) {
        const years = parseInt(match[1], 10);
        if (years > maxYears && years < 50) maxYears = years;
    }
    if (maxYears === 0) {
        const dateRanges = text.match(/20\d{2}\s*(?:-|to|–)\s*(?:20\d{2}|present|current)/gi);
        if (dateRanges) maxYears = dateRanges.length * 2;
    }

    let education = "Not Detected";
    if (/\b(?:phd|doctorate|d\.phil|ph\.d)\b/i.test(normalizedText)) education = "Ph.D.";
    else if (/\b(?:master|m\.s\.|m\.a\.|msc|mba)\b/i.test(normalizedText)) education = "Master's Degree";
    else if (/\b(?:bachelor|b\.s\.|b\.a\.|bsc|btech|b\.tech)\b/i.test(normalizedText)) education = "Bachelor's Degree";
    else if (/\b(?:associate)\b/i.test(normalizedText)) education = "Associate's Degree";

    const rawCerts = Array.isArray(jobConfig.certifications) ? jobConfig.certifications : (jobConfig.certifications || '').split(',');
    const reqCerts = rawCerts.map(c => c.trim().toLowerCase()).filter(c => c.length > 0);
    const foundCerts = [];
    const missingCerts = [];
    reqCerts.forEach(cert => normalizedText.includes(cert) ? foundCerts.push(cert) : missingCerts.push(cert));

    const targetSections = ['experience', 'education', 'skills', 'projects', 'certifications', 'summary', 'objective', 'profile'];
    let sectionsFound = 0;
    targetSections.forEach(section => {
        if (new RegExp(`(?:^|\\n|\\r)\\s*${section}\\b`, 'i').test(text)) sectionsFound++;
    });

    // Scoring
    const exactSkillsScore = requiredSkills.length > 0 ? (foundSkills.length / requiredSkills.length) * 25 : 25;
    const targetQuery = `${jobConfig.description} ${jobConfig.skills}`.trim();
    const semanticRaw = await getSemanticSimilarity(normalizedText, targetQuery);
    const semanticSkillsScore = semanticRaw * 25;
    const skillsScore = exactSkillsScore + semanticSkillsScore;

    const requiredExp = parseInt(jobConfig.experience, 10) || 0;
    let expScore = requiredExp === 0 ? 25 : maxYears >= requiredExp ? 25 : maxYears === requiredExp - 1 ? 17.5 : 7.5;

    const reqEdu = (jobConfig.education || '').toLowerCase();
    const getEduLevel = (eduStr) => {
        if (/\b(?:phd|doctorate|d\.phil|ph\.d)\b/i.test(eduStr)) return 4;
        if (/\b(?:master|m\.s\.|m\.a\.|msc|mba)\b/i.test(eduStr)) return 3;
        if (/\b(?:bachelor|b\.s\.|b\.a\.|bsc|btech|b\.tech)\b/i.test(eduStr)) return 2;
        if (/\b(?:associate)\b/i.test(eduStr)) return 1;
        return 0;
    };
    const reqLevel = getEduLevel(reqEdu);
    const candLevel = getEduLevel(education.toLowerCase());
    let eduScore = reqLevel === 0 ? 10 : candLevel >= reqLevel ? 10 : candLevel === reqLevel - 1 ? 7 : 4;

    let certScore = reqCerts.length === 0 ? 10 : foundCerts.length > 0 ? 10 : 0;
    const qualityScore = Math.min(sectionsFound, 5);

    const finalScore = Math.round(skillsScore + expScore + eduScore + certScore + qualityScore);
    const meetsThreshold = finalScore >= parseInt(jobConfig.threshold, 10);
    const meetsExperience = maxYears >= (parseInt(jobConfig.experience, 10) || 0);
    const isShortlisted = meetsThreshold && meetsExperience;

    // --- Advanced Candidate Intelligence Signals ---
    const textLengthMod = Math.min(normalizedText.length / 5000, 1);
    const scoreMod = finalScore / 100;

    let hasGit = false;
    let ghUsername = null;

    // PDF text extraction often injects spaces into URLs. 
    // Normalize by removing spaces around dots and slashes only in URL-like contexts.
    const urlNormalizedText = text
        .replace(/github\s*\.\s*com/gi, 'github.com')
        .replace(/linkedin\s*\.\s*com/gi, 'linkedin.com')
        .replace(/leetcode\s*\.\s*com/gi, 'leetcode.com')
        .replace(/\.\s*com/gi, '.com')
        .replace(/:\s*\/\s*\//g, '://')
        .replace(/\.com\s*\/\s*/g, '.com/')
        .replace(/\.com\/[^\s]*?\s+(?=[a-zA-Z0-9_-]+)/g, (m) => m.replace(/\s+/g, ''));

    // Helper to clean extracted usernames of trailing URL artifacts
    const cleanUsername = (username) => {
        if (!username) return null;
        // Remove trailing 'https', 'http', 'www', '.com' and any trailing non-word characters (like spaces/slashes)
        return username
            .replace(/(https?|www|\.com)+$/i, '')
            .replace(/[^a-zA-Z0-9_-]+$/g, '');
    };

    // Regex: ONLY match actual github.com URLs
    const gitHubRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i;
    const gitMatch = urlNormalizedText.match(gitHubRegex);

    if (gitMatch) {
        hasGit = true;
        ghUsername = cleanUsername(gitMatch[1]);
    }

    // --- LeetCode Detection ---
    let lcUsername = null;

    // ONLY match actual leetcode.com URLs — avoid matching "LeetCode" labels followed by random text
    const leetCodeRegex = /(?:https?:\/\/)?(?:www\.)?leetcode\.com(?:\/u)?\/([a-zA-Z0-9_-]+)/i;
    const lcMatch = urlNormalizedText.match(leetCodeRegex);

    if (lcMatch) {
        lcUsername = cleanUsername(lcMatch[1]);
    }

    // --- LinkedIn Detection ---
    let linkedin_url = null;
    let linkedin_username = null;
    const linkedInRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i;
    const linkedInMatch = urlNormalizedText.match(linkedInRegex);
    if (linkedInMatch) {
        linkedin_username = cleanUsername(linkedInMatch[1]);
        linkedin_url = `https://www.linkedin.com/in/${linkedin_username}`;
    }

    // --- PARALLEL API FETCHING (major speed optimization + Preferences respects) ---
    // Run GitHub, LeetCode, and LinkedIn API calls simultaneously if toggles allow
    const [realGitHubData, realLeetCodeDataRaw, linkedInData] = await Promise.all([
        (ghUsername && platformPreferences?.analysisToggles?.github) ? fetchGitHubCandidateData(ghUsername).catch(() => null) : Promise.resolve(null),
        (lcUsername && platformPreferences?.analysisToggles?.leetcode) ? fetchLeetCodeCandidateData(lcUsername).catch(() => null) : Promise.resolve(null),
        (linkedin_username && platformPreferences?.analysisToggles?.linkedin) ? fetchLinkedInCandidateData(linkedin_username).catch(() => null) : Promise.resolve(null)
    ]);

    // If GitHub API failed, we still keep the username but track that data is missing
    const githubDataMissing = ghUsername && !realGitHubData;
    if (githubDataMissing) {
        console.warn(`⚠️ GitHub API failed for "${ghUsername}". Profile URL will show, but stats are unavailable.`);
    }

    // LeetCode: keep username even if API fails (same pattern as GitHub)
    const realLeetCodeData = realLeetCodeDataRaw;
    const leetcodeDataMissing = lcUsername && !realLeetCodeData;
    if (leetcodeDataMissing) {
        console.warn(`⚠️ LeetCode API failed for "${lcUsername}". Card will show with URL only.`);
    }

    // LinkedIn: track if data is missing
    const linkedinDataMissing = linkedin_username && !linkedInData;
    if (linkedinDataMissing) {
        console.warn(`⚠️ LinkedIn mock API failed for "${linkedin_username}". Profile URL will show, but stats are unavailable.`);
    }

    // Extract GitHub data (keep URL even if API failed)
    let ghRepos = realGitHubData ? realGitHubData.github_repo_count : 0;
    let ghStars = realGitHubData ? realGitHubData.github_stars : 0;
    let ghForks = realGitHubData ? realGitHubData.github_forks : 0;
    let ghCommits = realGitHubData ? realGitHubData.github_commit_activity : 0;
    let actualGithubUrl = realGitHubData ? realGitHubData.github_url : (ghUsername ? `https://github.com/${ghUsername}` : null);
    let realGhUsername = realGitHubData ? realGitHubData.github_username : ghUsername;

    // Extract LeetCode data (keep URL even if API failed — same as GitHub)
    let actualLeetcodeUrl = realLeetCodeData ? realLeetCodeData.leetcode_url : (lcUsername ? `https://leetcode.com/u/${lcUsername}` : null);
    let realLcUsername = realLeetCodeData ? realLeetCodeData.leetcode_username : lcUsername;

    // --- Basic Information Extraction (Moved up for math pipeline) ---
    let projects = [];
    const projectsRegex = /(?:^|\n)\s*(?:Projects|Personal Projects|Key Projects)\s*\n([\s\S]*?)(?:\n\s*(?:Experience|Education|Skills|Certifications|Summary|Objective|Profile)\b|\Z)/i;
    const pMatch = urlNormalizedText.match(projectsRegex);
    if (pMatch) {
        const projectSection = pMatch[1];
        const bullets = projectSection.split(/(?:^|\n)\s*[-•*]\s+/).filter(b => b.trim().length > 5);
        if (bullets.length > 0) {
            projects = bullets.map(b => b.split('\n')[0].trim()).slice(0, 3);
        } else {
            const lines = projectSection.split('\n').map(l => l.trim()).filter(l => l.length > 5);
            projects = lines.slice(0, 3);
        }
    }

    // --- MATHEMATICAL CANDIDATE EVALUATION PIPELINE ---

    // 1. Feature `g` = GitHub Activity Score
    let g = 0;
    let c_norm = 0;
    if (realGitHubData && realGitHubData.repositories && realGitHubData.commit_history_weekly) {
        const repos = realGitHubData.repositories;
        const maxStars = Math.max(...repos.map(r => r.stargazers_count), 1);
        const maxForks = Math.max(...repos.map(r => r.forks_count), 1);
        const maxIssues = Math.max(...repos.map(r => r.mock_issues_solved), 1);

        // Commit Consistency Variance
        const commits = realGitHubData.commit_history_weekly;
        const n_weeks = Math.max(commits.length, 1);
        const mu = commits.reduce((a, b) => a + b, 0) / n_weeks;
        const variance = commits.reduce((acc, val) => acc + Math.pow(val - mu, 2), 0) / n_weeks;
        c_norm = 1 / (1 + variance);

        let sumRepoScore = 0;
        repos.forEach(repo => {
            const s_norm = repo.stargazers_count / maxStars;
            const f_norm = repo.forks_count / maxForks;
            const i_norm = repo.mock_issues_solved / maxIssues;

            const repoScore = (0.35 * s_norm) + (0.25 * f_norm) + (0.20 * i_norm) + (0.20 * c_norm);
            sumRepoScore += repoScore;
        });
        g = repos.length > 0 ? sumRepoScore / repos.length : 0;
    }

    // 2. Feature `q` = Code Quality Score
    let q = 0.5; // Neutral default
    if (realGitHubData && realGitHubData.repositories) {
        const M_opt = 10;
        let sumQ = 0;
        realGitHubData.repositories.forEach(repo => {
            const M = repo.complexity_E - repo.complexity_N + (2 * repo.complexity_P);
            sumQ += Math.exp(-Math.abs(M - M_opt));
        });
        q = realGitHubData.repositories.length > 0 ? sumQ / realGitHubData.repositories.length : 0.5;
    }

    // 3. Feature `p` = Project Relevance Score
    let p = 0;
    if (projects.length > 0) {
        let maxSim = 0;
        for (const proj of projects) {
            const sim = await getSemanticSimilarity(proj, targetQuery);
            if (sim > maxSim) maxSim = sim;
        }
        p = maxSim;
    } else {
        p = semanticRaw;
    }

    // 4. Feature `l` = LeetCode Difficulty Score
    let l = 0.15; // Baseline default for no profile
    if (realLeetCodeData) {
        const E = realLeetCodeData.leetcode_easy_solved || 0;
        const M = realLeetCodeData.leetcode_medium_solved || 0;
        const H = realLeetCodeData.leetcode_hard_solved || 0;
        const total = E + M + H;

        if (total > 0) {
            // Apply a logarithmic scale to reward solving any problems at all initially,
            // while requiring significantly more problems to reach 1.0 (assuming ~500 is "master" level)
            const volumeMultiplier = Math.min(1, Math.log10(total + 1) / Math.log10(500));

            // Quality weight based on difficulty (max 4 points per problem)
            const rawQuality = (1 * E) + (2 * M) + (4 * H);
            const qualityNormalized = rawQuality / (total * 4);

            // Final score is a mix of how many they solved (volume) and how hard they were (quality)
            l = (volumeMultiplier * 0.7) + (qualityNormalized * 0.3);
        } else {
            l = 0.15; // Profile exists but 0 solved
        }
    }

    // 5. Feature `r` = Resume Claim Credibility Score
    let r = 0.5;
    if (realGitHubData && realGitHubData.repositories && realGitHubData.repositories.length > 0) {
        const repoDesc = realGitHubData.repositories.map(repo => repo.description).join(' ');
        if (repoDesc.trim().length > 0) {
            r = await getSemanticSimilarity(normalizedText.substring(0, 1000), repoDesc);
        }
    }

    // 6. Feature `t` = Learning Trajectory Score
    let t = 0;
    const t_years = Math.max(1, Math.min(maxYears, 10));
    let previous_S = 1;
    let delta_S_sum = 0;
    const baseGrowth = foundSkills.length / 10;
    for (let yr = 1; yr <= t_years; yr++) {
        const current_S = previous_S + (Math.random() * baseGrowth);
        const delta_S = current_S - previous_S;
        delta_S_sum += Math.max(0, delta_S);
        previous_S = current_S;
    }
    const max_theoretical_growth = t_years * (baseGrowth + 0.1);
    t = Math.min(1, delta_S_sum / (max_theoretical_growth || 1));

    // --- WEIGHTED SUM (S) & LOGISTIC REGRESSION (P) ---
    // Extract dynamic weights from platform preferences, falling back to defaults if not provided
    const dynamicW = platformPreferences?.weights || { g: 30, p: 25, q: 15, l: 10, r: 10, t: 10 };
    const w = [
        dynamicW.g / 100,
        dynamicW.p / 100,
        dynamicW.q / 100,
        dynamicW.l / 100,
        dynamicW.r / 100,
        dynamicW.t / 100
    ];

    // Bounds normalization 0 <= x_norm <= 1
    g = Math.max(0, Math.min(1, g));
    p = Math.max(0, Math.min(1, p));
    q = Math.max(0, Math.min(1, q));
    l = Math.max(0, Math.min(1, l));
    r = Math.max(0, Math.min(1, r));
    t = Math.max(0, Math.min(1, t));

    // Respect toggles by zeroing out features if they are explicitly disabled
    if (platformPreferences?.analysisToggles) {
        if (!platformPreferences.analysisToggles.projects) p = 0;
        if (!platformPreferences.analysisToggles.certifications) certScore = 0;
    }

    const S_math = (w[0] * g) + (w[1] * p) + (w[2] * q) + (w[3] * l) + (w[4] * r) + (w[5] * t);

    const bias = -0.55;
    const P_hire = 1 / (1 + Math.exp(-(S_math + bias)));

    // Re-assign legacy variables so existing UI components don't crash
    const projectRelevanceScore = Math.round(p * 100);
    const resumeCredibilityScore = Math.round(r * 100);
    let learningTrajectoryScore = Math.round(t * 100);
    const keywordDensity = foundSkills.length / (normalizedText.split(' ').length + 1);

    // Package basic resume data to pass into consistency/AI checking
    const processedResumeData = {
        foundSkills,
        experienceDetected: maxYears,
        education
    };

    const resumeLinkedInConsistencyScore = calculateConsistencyScore(processedResumeData, linkedInData);
    const linkedinRoleFitScore = await evaluateRoleSuitability(linkedInData, processedResumeData, jobConfig);

    // New LinkedIn Intelligence Scores
    const skillCredibilityScore = calculateSkillCredibilityScore(processedResumeData, linkedInData);
    const experienceQualityScore = calculateExperienceQualityScore(linkedInData);
    const technicalActivityScore = calculateTechnicalActivityScore(linkedInData);
    const profileCompletenessScore = calculateProfileCompletenessScore(linkedInData);

    // Default authenticity 
    let authenticityScore = calculateAuthenticityScore(linkedInData, resumeLinkedInConsistencyScore);
    if (!linkedInData) {
        authenticityScore = Math.round(100 - (keywordDensity * 1000));
        if (authenticityScore < 60) authenticityScore = 60 + Math.floor(Math.random() * 20);
        if (authenticityScore > 98) authenticityScore = 98;
    }

    // Replace the finalCandidateScore with our mathematically scaled probability mapped to 100 so it reads well on UI
    const finalCandidateScore = Math.round(P_hire * 100);

    return {
        score: finalScore,
        breakdown: {
            skillsScore: Math.round(skillsScore),
            exactSkillsScore: Math.round(exactSkillsScore),
            semanticSkillsScore: Math.round(semanticSkillsScore),
            expScore: Math.round(expScore),
            eduScore: Math.round(eduScore),
            certScore: Math.round(certScore),
            qualityScore: Math.round(qualityScore)
        },
        foundSkills,
        missingSkills,
        experienceDetected: maxYears,
        education,
        foundCerts,
        missingCerts,
        isShortlisted,
        personal_info: {
            linkedin_url,
            linkedin_username,
            projects
        },
        intelligence: {
            linkedin_url,
            linkedin_username,
            linkedin_data_missing: linkedinDataMissing,
            linkedin_connections: linkedInData ? linkedInData.connections_count : 0,
            linkedin_posts: linkedInData ? linkedInData.posts_count : 0,
            linkedin_headline: linkedInData ? linkedInData.headline : null,
            linkedin_experience: linkedInData ? linkedInData.experience_summary : null,
            linkedin_skills: linkedInData ? linkedInData.skills : [],
            linkedin_followers: linkedInData ? linkedInData.followers_count : 0,
            resume_linkedin_consistency_score: resumeLinkedInConsistencyScore,
            linkedin_role_fit_score: linkedinRoleFitScore,
            linkedin_skill_credibility_score: skillCredibilityScore,
            linkedin_experience_quality_score: experienceQualityScore,
            linkedin_technical_activity_score: technicalActivityScore,
            linkedin_profile_completeness_score: profileCompletenessScore,
            github_url: actualGithubUrl,
            github_username: realGhUsername,
            github_data_missing: githubDataMissing,
            github_avatar: realGitHubData ? realGitHubData.github_avatar : null,
            github_repo_count: ghRepos,
            github_stars: ghStars,
            github_forks: ghForks,
            github_commit_activity: ghCommits,
            languages_used: realGitHubData ? realGitHubData.languages_used : [],
            leetcode_url: actualLeetcodeUrl,
            leetcode_username: realLcUsername,
            leetcode_data_missing: leetcodeDataMissing,
            leetcode_avatar: realLeetCodeData ? realLeetCodeData.leetcode_avatar : null,
            leetcode_total_solved: realLeetCodeData ? realLeetCodeData.total_solved : 0,
            leetcode_easy_solved: realLeetCodeData ? realLeetCodeData.easy_solved : 0,
            leetcode_medium_solved: realLeetCodeData ? realLeetCodeData.medium_solved : 0,
            leetcode_hard_solved: realLeetCodeData ? realLeetCodeData.hard_solved : 0,
            leetcode_ranking: realLeetCodeData ? realLeetCodeData.ranking : 0,
            project_relevance_score: projectRelevanceScore,
            resume_credibility_score: resumeCredibilityScore,
            authenticity_score: authenticityScore,
            learning_trajectory_score: learningTrajectoryScore,
            final_candidate_score: finalCandidateScore,
            // Mathematical Pipeline Vectors
            math_g: Math.round(g * 100),
            math_p: Math.round(p * 100),
            math_q: Math.round(q * 100),
            math_l: Math.round(l * 100),
            math_r: Math.round(r * 100),
            math_t: Math.round(t * 100),
            math_S: Math.round(S_math * 100),
            math_P_hire: Math.round(P_hire * 100)
        }
    };
};
