interface Config {
    nodeApiUrl: string;
    pythonApiUrl: string;
    wsUrl: string;
}

const development: Config = {
    nodeApiUrl: 'http://localhost:3000',
    pythonApiUrl: 'http://localhost:8000',
    wsUrl: 'ws://localhost:8000'
};

const production: Config = {
    nodeApiUrl: 'https://quiz-node-backend.onrender.com',
    pythonApiUrl: 'https://quiz-python-backend.onrender.com',
    wsUrl: 'wss://quiz-python-backend.onrender.com'
};

// Get runtime environment - check if window location is production
const isProd = typeof window !== 'undefined' && 
    (window.location.hostname === 'aiacademia.tech' || 
     window.location.hostname.includes('render.com'));

// Use environment-aware configuration
const config: Config = isProd || import.meta.env.PROD ? production : development;

console.log('Using configuration:', config);

export default config; 