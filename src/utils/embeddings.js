import { pipeline, env } from '@xenova/transformers';

// Configure transformers.js for running in the browser
// By default it fetches models from HuggingFace hub
env.allowLocalModels = false;
env.useBrowserCache = true;

// Singleton pattern to load the model only once
class FeatureExtractorPipeline {
    static task = 'feature-extraction';
    static model = 'Xenova/all-MiniLM-L6-v2';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = await pipeline(this.task, this.model, {
                progress_callback
            });
        }
        return this.instance;
    }
}

/**
 * Calculates the cosine similarity between two vectors.
 */
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculates semantic similarity between the resume text and the job description.
 * 
 * @param {string} resumeText - The parsed text of the resume.
 * @param {string} jobDescription - The job description text.
 * @returns {Promise<number>} - A similarity score between 0 and 1.
 */
export async function getSemanticSimilarity(resumeText, jobDescription) {
    if (!resumeText || !jobDescription) return 0;

    try {
        const extractor = await FeatureExtractorPipeline.getInstance();

        // The all-MiniLM-L6-v2 model has a max sequence length of 256.
        // For large resumes, we can either extract chunks and average, 
        // or just rely on the model's built-in truncation which grabs the most 
        // important first ~256 tokens (usually the summary and some experience).
        // To be safe and avoid memory bloat purely in the browser, we'll let it truncate implicitly,
        // or pass chunks. Let's slice string to ~2000 chars roughly ~400 words just to be sure it doesn't hang.
        const safeResumeText = resumeText.slice(0, 2000);
        const safeJobDesc = jobDescription.slice(0, 2000);

        // Compute embeddings
        const outputResume = await extractor(safeResumeText, { pooling: 'mean', normalize: true });
        const outputJob = await extractor(safeJobDesc, { pooling: 'mean', normalize: true });

        // Output is a Tensor. The data is available in the .data property.
        const vectorResume = Array.from(outputResume.data);
        const vectorJob = Array.from(outputJob.data);

        const similarity = cosineSimilarity(vectorResume, vectorJob);

        // Cosine similarity can technically be -1 to 1, but for text embeddings
        // it's usually between 0 (completely different) and 1 (exact match).
        return Math.max(0, similarity);
    } catch (error) {
        console.error("Error calculating semantic similarity:", error);
        return 0;
    }
}
