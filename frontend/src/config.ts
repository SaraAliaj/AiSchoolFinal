interface Config {
    apiUrl: string;
    wsUrl: string;
}

const development: Config = {
    apiUrl: 'http://localhost:8000',
    wsUrl: 'ws://localhost:8000'
};

const production: Config = {
    apiUrl: import.meta.env.VITE_API_URL || 'https://your-backend-app.onrender.com',
    wsUrl: import.meta.env.VITE_WS_URL || 'wss://your-backend-app.onrender.com'
};

const config: Config = import.meta.env.PROD ? production : development;

export default config; 