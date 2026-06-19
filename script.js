async function apiCall(endpoint, options = {}) {
    const url = CONFIG.apiBaseUrl + endpoint;
    const headers = {
        'api-token': CONFIG.apiToken,
        'Content-Type': 'application/json',
        ...options.headers,
    };
    try {
        const res = await fetch(url, {
            ...options,
            headers,
            mode: 'cors',
            cache: 'no-cache',
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `HTTP ${res.status}`);
        }
        return await res.json();
    } catch (error) {
        console.error('API Error:', error);
        showToast('⚠️ خطأ في الاتصال بالسيرفر');
        throw error;
    }
}
