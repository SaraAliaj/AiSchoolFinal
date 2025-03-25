interface Config {
    nodeApiUrl: string;
    pythonApiUrl: string;
    wsUrl: string;
}

const development: Config = {
    nodeApiUrl: 'http://localhost:3000',
    pythonApiUrl: 'http://localhost:8000',
    wsUrl: 'ws://localhost:8081'
};

const production: Config = {
    nodeApiUrl: 'https://quiz-node-backend.onrender.com',
    pythonApiUrl: 'https://quiz-python-backend.onrender.com',
    wsUrl: 'wss://quiz-python-backend.onrender.com'
};

const config: Config = import.meta.env.PROD ? production : development;

export default config; 