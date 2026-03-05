import { generateAIResponse } from './aiService';

export const generateJobConfig = async (jobTitle) => {
    jobTitle = jobTitle.trim();
    if (!jobTitle) throw new Error("Job title is required");

    const prompt = `Generate a job configuration for the role: ${jobTitle}

Return ONLY valid JSON in the following format:

{
    "job_title": "",
    "job_description": "",
    "required_skills": [],
    "minimum_experience": 0,
    "education_level": "",
    "certifications": []
}

Do not include any explanation, comments, or additional text. Output must be valid JSON.`;

    let rawResponse = "";
    try {
        rawResponse = await generateAIResponse(prompt);

        // Safe JSON Extraction
        const firstBrace = rawResponse.indexOf('{');
        const lastBrace = rawResponse.lastIndexOf('}');

        if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
            throw new Error("No valid JSON structure found in the response.");
        }

        const extractedJsonStr = rawResponse.substring(firstBrace, lastBrace + 1);

        let config;
        try {
            config = JSON.parse(extractedJsonStr);
        } catch (parseError) {
            throw new Error(`Parse error: ${parseError.message}`);
        }

        // Response Validation & Default Values
        const validatedConfig = {
            job_title: config.job_title || jobTitle,
            job_description: config.job_description || `A professional summary of the ${jobTitle} role.`,
            required_skills: Array.isArray(config.required_skills) ? config.required_skills.join(", ") : (config.required_skills || "General Knowledge"),
            minimum_experience: typeof config.minimum_experience === 'number' ? config.minimum_experience : (parseInt(config.minimum_experience) || 0),
            education_level: config.education_level || "Any / Unspecified",
            certifications: Array.isArray(config.certifications) ? config.certifications.join(", ") : (String(config.certifications || ""))
        };

        return {
            ...validatedConfig,
            isAiGenerated: true // Internal flag for UI
        };
    } catch (error) {
        console.error("Failed to generate or parse AI job config.");
        console.error("Raw response from AI:", rawResponse);
        console.error("Error details:", error);

        throw new Error("AI response formatting error. Please try generating again.");
    }
};

export const evaluateRoleSuitability = async (linkedinData, resumeData, jobRole) => {
    // If we have no job config or skills to compare against, default to 0
    if (!jobRole || !jobRole.job_title) return 0;

    const resumeSkills = resumeData?.foundSkills?.join(', ') || 'None listed';

    // We only use LinkedIn data if the API fetch simulated success
    const linkedInExp = linkedinData?.experience_summary || 'Not provided';
    const linkedInSkills = linkedinData?.skills?.join(', ') || 'Not provided';

    const prompt = `Given the candidate's professional data and the job role requirements, evaluate whether the candidate is suitable for the role. Provide a single suitability score from 0 to 100.

Job Title: ${jobRole.job_title}
Required Skills: ${jobRole.required_skills}

Candidate Resume Skills: ${resumeSkills}
Candidate LinkedIn Experience: ${linkedInExp}
Candidate LinkedIn Skills: ${linkedInSkills}

Based tightly on how these align, return ONLY a number between 0 and 100 representing the fit score. Do not return any text, explanation, or JSON. Just the number.`;

    try {
        const rawResponse = await generateAIResponse(prompt);
        // Extract just the numbers from the AI response safely
        const matches = rawResponse.match(/\d+/);
        if (matches) {
            const score = parseInt(matches[0], 10);
            return Math.min(Math.max(score, 0), 100);
        }
        return 0; // Default if AI didn't return a number
    } catch (error) {
        console.error("Failed to evaluate role suitability:", error);
        return 0;
    }
};
