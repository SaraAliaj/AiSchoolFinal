interface Config {
    nodeApiUrl: string;
    pythonApiUrl: string;
    wsUrl: string;
    getWebSocketUrl: () => string;
}

const development: Config = {
    nodeApiUrl: 'http://localhost:3000',
    pythonApiUrl: 'http://localhost:8000',
    wsUrl: 'ws://localhost:8000',
    getWebSocketUrl: function() {
        return this.wsUrl;
    }
};

const production: Config = {
    nodeApiUrl: 'https://quiz-node-backend.onrender.com',
    pythonApiUrl: 'https://quiz-python-backend.onrender.com',
    wsUrl: 'wss://quiz-python-backend.onrender.com',
    getWebSocketUrl: function() {
        // Dynamically create WebSocket URL based on current hostname
        if (typeof window !== 'undefined') {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            
            // If we're on the aiacademia.tech domain, use the correct backend
            if (window.location.hostname === 'aiacademia.tech') {
                return 'wss://quiz-python-backend.onrender.com';
            }
            
            // For Render preview URLs or localhost, derive from current hostname
            // This handles both production and development without hardcoding
            if (window.location.hostname.includes('render.com')) {
                return 'wss://quiz-python-backend.onrender.com';
            }
            
            // Fallback for development or unknown environments
            return this.wsUrl;
        }
        return this.wsUrl;
    }
};

// Get runtime environment - check if window location is production
const isProd = typeof window !== 'undefined' && 
    (window.location.hostname === 'aiacademia.tech' || 
     window.location.hostname.includes('render.com'));

// Use environment-aware configuration
const config: Config = isProd || import.meta.env.PROD ? production : development;

console.log('Using configuration:', config);
console.log('WebSocket URL:', config.getWebSocketUrl());

export default config; 