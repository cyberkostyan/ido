module.exports = {
    rpc: {
        host:"localhost",
        port:8545
    },
    networks: {
        development: {
            host: "localhost",
            port: 8545, // port where your blockchain is running 
            network_id: "*",
            gas: 6000000
        }
    },
    solc: {
        optimizer: {
            enabled: true,
            runs: 200
        }
    }
};
