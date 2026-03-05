const OLLAMA_API_URL = 'http://localhost:11434/api/generate';
const DEFAULT_MODEL = 'llama3:8b';

/**
 * Generates an AI response using the local Ollama API.
 * @param {string} prompt - The input prompt for the AI.
 * @returns {Promise<string>} The generated response text.
 */
export const generateAIResponse = async (prompt) => {
    try {
        const response = await fetch(OLLAMA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: DEFAULT_MODEL,
                prompt: prompt,
                stream: false,
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error('Error generating AI response from Ollama:', error);
        // Ensure proper error handling if the Ollama server is not running
        if (error.name === 'TypeError' && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
            throw new Error('Could not connect to Ollama. Ensure it is running on localhost:11434 and OLLAMA_ORIGINS="*" is set for CORS.');
        }
        throw new Error(`AI generation failed: ${error.message}`);
    }
};
