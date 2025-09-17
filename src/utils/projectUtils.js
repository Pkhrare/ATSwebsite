import ApiCaller from '../components/apiCall/ApiCaller';

// Fetches the current global counter for unique project IDs
async function globalProjectCounter() {
    try {
        const records = await ApiCaller(`/records/counter/dummy`, {
            method: 'GET',
        });
        return records;
    } catch (e) {
        console.error('Failed to load counter:', e);
        return null;
    }
}

// Generates a unique, human-readable Project ID
export async function generateProjectID(state, projectType, startDate) {
    if (!state || !projectType || !startDate) return '';
    const serviceType = projectType.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const formattedDate = new Date(startDate).toISOString().slice(2, 10).replace(/-/g, '').slice(0, 6);

    const counter_obj = await globalProjectCounter();
    if (!counter_obj) return '';

    const counter = counter_obj.fields['Counter'];
    await ApiCaller(`/records/counter/dummy`, {
        method: 'PATCH',
        body: JSON.stringify({ fields: { 'Counter': counter + 1 } }),
    });

    return `${state}${serviceType}-${formattedDate}P${counter + 1}`;
}
