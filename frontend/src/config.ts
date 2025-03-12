interface Config {
    nodeApiUrl: string;
    pythonApiUrl: string;
    wsUrl: string;
}

const development: Config = {
    nodeApiUrl: 'http://localhost:3000',
    pythonApiUrl: 'http://localhost:8000',
    wsUrl: 'ws://localhost:8765'
};

const production: Config = {
    nodeApiUrl: `https://${import.meta.env.VITE_NODE_API_URL}:${import.meta.env.VITE_NODE_API_PORT}`,
    pythonApiUrl: `https://${import.meta.env.VITE_PYTHON_API_URL}:${import.meta.env.VITE_PYTHON_API_PORT}`,
    wsUrl: `wss://${import.meta.env.VITE_WS_URL}:${import.meta.env.VITE_WS_PORT || '8765'}`
};

const config: Config = import.meta.env.PROD ? production : development;

export default config; 