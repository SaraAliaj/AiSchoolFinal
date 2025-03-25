interface Config {
    nodeApiUrl: string;
    pythonApiUrl: string;
    wsUrl: string;
}

const development: Config = {
    nodeApiUrl: 'http://localhost:3000',
    pythonApiUrl: 'http://localhost:8000',
    wsUrl: 'ws://localhost:8080'
};

const production: Config = {
    nodeApiUrl: import.meta.env.VITE_NODE_API_URL || '',
    pythonApiUrl: import.meta.env.VITE_PYTHON_API_URL || '',
    wsUrl: `wss://${import.meta.env.VITE_WS_URL}`
};

const config: Config = import.meta.env.PROD ? production : development;

export default config; 