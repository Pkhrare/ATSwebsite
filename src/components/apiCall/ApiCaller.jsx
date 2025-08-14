const API_URL = 'https://ats-backend-805977745256.us-central1.run.app/api';

export default async function ApiCaller(endpoint, options = {}) {
    const token = process.env.BEARER_TOKEN;
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${token}`,
            ...options.headers
        },
    });
    if (!response.ok) throw new Error((await response.json()).error || 'API request failed');
    return response.json();
}
