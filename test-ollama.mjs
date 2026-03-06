const prompt = `You are an expert technical recruiter and HR specialist.
Generate a structured job configuration for the role: "Machine Learning".

You must respond ONLY with a valid JSON object matching the exact schema below. Do not include any markdown formatting, code blocks, or conversational text. Your entire response must be parseable by JSON.parse().

Expected JSON Schema:
{
    "job_title": "Machine Learning",
    "job_description": "A professional 2-3 sentence summary of the role.",
    "required_skills": "A comma-separated string of 6 to 10 key technical and soft skills.",
    "minimum_experience": 3,
    "education_level": "One of: 'Any / Unspecified', 'Associate\\'s Degree', 'Bachelor\\'s Degree', 'Master\\'s Degree', 'Ph.D.'",
    "certifications": "A notable certification name if applicable, otherwise an empty string."
}`;

async function testOllama() {
    try {
        console.log('Sending request to Ollama...');
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3:8b',
                prompt: prompt,
                stream: false,
            }),
        });

        if (!response.ok) {
            console.error('HTTP Error:', response.status, response.statusText);
            return;
        }

        const data = await response.json();
        console.log('Raw Response Length:', data.response.length);
        console.log('Raw Response:', data.response);

        let cleaned = data.response.replace(/```json/gi, '').replace(/```/g, '').trim();

        // Sometimes it starts with something else or ends with something else
        console.log('Cleaned Response Length:', cleaned.length);

        try {
            const parsed = JSON.parse(cleaned);
            console.log('Successfully parsed JSON:', Object.keys(parsed));
        } catch (e) {
            console.error('JSON Parse Error:', e.message);
        }
    } catch (err) {
        console.error('Fetch Error:', err.message);
    }
}

testOllama();
