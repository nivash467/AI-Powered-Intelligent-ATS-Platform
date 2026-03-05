/**
 * Fetches LeetCode profile data for a given username using public proxy APIs.
 * Includes a 8-second timeout to prevent slow cold starts from blocking resume upload.
 * 
 * @param {string} username - The extracted LeetCode username.
 * @returns {Promise<Object|null>} An object containing LeetCode stats, or null on failure.
 */

const TIMEOUT_MS = 8000; // 8 seconds max wait

const fetchWithTimeout = (url, options = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timeoutId));
};

export const fetchLeetCodeCandidateData = async (username) => {
    try {
        console.log(`📡 Fetching LeetCode data for: ${username}...`);

        // Primary API: leetcode-api-faisalshohag.vercel.app (fast, reliable, all data in one request)
        const res = await fetchWithTimeout(`https://leetcode-api-faisalshohag.vercel.app/${username}`, {
            headers: { 'Accept': 'application/json' }
        });

        if (!res.ok) {
            console.warn(`LeetCode API returned error for ${username}`);
            return await tryFallbackAPI(username);
        }

        const data = await res.json();

        // Check if user doesn't exist (API returns an errors array)
        if (data.errors && data.errors.length > 0) {
            console.warn(`LeetCode user not found: ${username}`);
            return null;
        }

        console.log('✅ LeetCode data fetched:', {
            profile: username,
            solved: data.totalSolved,
            easy: data.easySolved,
            medium: data.mediumSolved,
            hard: data.hardSolved
        });

        return {
            leetcode_url: `https://leetcode.com/u/${username}`,
            leetcode_username: username,
            leetcode_avatar: null, // This API doesn't provide an avatar, UI has fallback 'LC' badge
            total_solved: data.totalSolved || 0,
            easy_solved: data.easySolved || 0,
            medium_solved: data.mediumSolved || 0,
            hard_solved: data.hardSolved || 0,
            ranking: data.ranking || 0,
            reputation: data.reputation || 0
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn(`⏱️ LeetCode API timed out for ${username} (>${TIMEOUT_MS}ms). Skipping.`);
            return await tryFallbackAPI(username);
        }
        console.error(`Failed to fetch LeetCode data for ${username}:`, error);
        return await tryFallbackAPI(username);
    }
};

/**
 * Fallback API if the primary one is down. Uses alfa-leetcode-api which provides avatar but can be slow.
 */
const tryFallbackAPI = async (username) => {
    try {
        console.log(`📡 Trying fallback LeetCode API for: ${username}...`);
        const [profileRes, solvedRes] = await Promise.all([
            fetchWithTimeout(`https://alfa-leetcode-api.onrender.com/${username}`, {
                headers: { 'Accept': 'application/json' }
            }),
            fetchWithTimeout(`https://alfa-leetcode-api.onrender.com/${username}/solved`, {
                headers: { 'Accept': 'application/json' }
            })
        ]);

        if (!profileRes.ok || !solvedRes.ok) return null;

        const profileData = await profileRes.json();
        const solvedData = await solvedRes.json();

        if (!profileData.username) return null;

        return {
            leetcode_url: `https://leetcode.com/u/${profileData.username}`,
            leetcode_username: profileData.username,
            leetcode_avatar: profileData.avatar || null,
            total_solved: solvedData.solvedProblem || 0,
            easy_solved: solvedData.easySolved || 0,
            medium_solved: solvedData.mediumSolved || 0,
            hard_solved: solvedData.hardSolved || 0,
            ranking: profileData.ranking || 0,
            reputation: profileData.reputation || 0
        };
    } catch (err) {
        if (err.name === 'AbortError') {
            console.warn(`⏱️ LeetCode fallback API also timed out for ${username}`);
        } else {
            console.error('LeetCode fallback API also failed:', err);
        }
        return null;
    }
};
