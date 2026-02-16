const client_id = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const client_secret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

const basic = btoa(`${client_id}:${client_secret}`);
const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;
const SEARCH_ENDPOINT = `/api/spotify/search`;
const AUDIO_FEATURES_ENDPOINT = `/api/spotify/audio-features`;

// 1. Get Access Token (Client Credentials - for Search)
// We use corsproxy.io to bypass CORS on the token endpoint
export const getClientAccessToken = async () => {
    if (!client_id || !client_secret) {
        console.error('Spotify Credentials Missing! Check .env.local');
        throw new Error('Missing VITE_SPOTIFY_CLIENT_ID or VITE_SPOTIFY_CLIENT_SECRET');
    }

    console.log('Fetching Spotify Token...');
    try {
        // Use local Vite proxy to avoid CORS
        const response = await fetch('/api/spotify-token', {
            method: 'POST',
            headers: {
                Authorization: `Basic ${basic}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
            }).toString(),
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('Token Fetch Failed:', response.status, text);
            throw new Error(`Token Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (err) {
        console.error('Token Network Error:', err);
        throw err;
    }
};

// 3. Search Tracks
// 3. Search Tracks
export const searchTracks = async (query: string, accessToken?: string) => {
    try {
        const token = accessToken || (await getClientAccessToken()).access_token;
        if (!token) throw new Error('No access token received');

        const response = await fetch(`${SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}&type=track&limit=5`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('Search API Failed:', response.status, text);
            throw new Error(`Search Error: ${response.status}`);
        }

        return response.json();
    } catch (error: any) {
        console.error('Spotify Search Error:', error);
        throw new Error(error.message || 'Spotify search failed');
    }
};


