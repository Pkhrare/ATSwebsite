const API_URL = 'https://ats-backend-805977745256.us-central1.run.app/api';

export default async function ApiCaller(endpoint, options = {}) {
    const token = import.meta.env.VITE_BEARER_TOKEN;
    const headers = {
        "Authorization": `Bearer ${token}`,
        ...options.headers
    };

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || 'API request failed');
    }

    const data = await response.json();
    console.log(`API Response from ${endpoint}:`, data);
    return data;
}
