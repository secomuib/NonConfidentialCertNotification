const HDWalletProvider = require('truffle-hdwallet-provider');
const Web3 = require('web3');

// For ganache
/*const ganache = require('ganache-cli');
const web3 = new Web3(ganache.provider());*/
// For ganache

// For Rinkeby
const provider = new HDWalletProvider(
    'tragic square news business dad cricket nurse athlete tide split about ring',
    'https://rinkeby.infura.io/6Fb0b6c4nUVQBb8qAKcx'
);
const web3 = new Web3(provider);
// For Rinkeby

const compile = require('./compile');
const compiledFactory = compile.NonConfidentialMultipartyRegisteredEDeliveryFactory;
const compiledDelivery = compile.NonConfidentialMultipartyRegisteredEDelivery;

// To prevent warning "MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 data listeners added. Use emitter.setMaxListeners() to increase limit"
require('events').EventEmitter.defaultMaxListeners = 0;

// before deploy a contract
const init = async (callback) => {
    let accounts = await web3.eth.getAccounts();
    let gasPrice = await web3.eth.getGasPrice();

    callback(accounts, gasPrice);
};

const performance = async (functionToTest, account) => {
    let balance1 = await web3.eth.getBalance(account);
    console.time('Delay of function '+functionToTest.name+'(): ');
    functionToTest(account);
    console.timeEnd('Delay of function '+functionToTest.name+'(): ');
    let balance2 = await web3.eth.getBalance(account);
    console.log('Cost of function '+functionToTest.name+'(): '+(balance1-balance2));
    console.log('Cost of function '+functionToTest.name+'(): '+(balance1));
    console.log('Cost of function '+functionToTest.name+'(): '+(balance2));
};

init(async (accounts, gasPrice) => {
    let factoryContract;
    let deliveryContract;
    let deliveryContractAddress;
    let balance1;
    let balance2;
    
    // Deploy factory
    balance1 = await web3.eth.getBalance(accounts[0]);
    console.time('Delay of function deploy()');
    factoryContract = await new web3.eth.Contract(JSON.parse(compiledFactory.interface))
        .deploy({ data: compiledFactory.bytecode, arguments: [] })
        .send({ from: accounts[0], gas: '3000000' });
    console.timeEnd('Delay of function deploy()');
    balance2 = await web3.eth.getBalance(accounts[0]);
    console.log('Cost of function deploy(): \t\t'+(balance1-balance2).toLocaleString('en').padStart(25));

    // createDelivery()
    balance1 = await web3.eth.getBalance(accounts[0]);
    console.time('Delay of function createDelivery()');
    await factoryContract.methods
        .createDelivery([accounts[1],accounts[2]], web3.utils.keccak256("Test message"), 600, 1200)
        .send({ from: accounts[0], gas: '3000000', value: '100' });
    console.timeEnd('Delay of function createDelivery()');
    balance2 = await web3.eth.getBalance(accounts[0]);
    console.log('Cost of function createDelivery(): \t'+(balance1-balance2).toLocaleString('en').padStart(25));

    const addresses = await factoryContract.methods.getDeliveries().call();
    deliveryContractAddress = addresses[0];
    deliveryContract = await new web3.eth.Contract(JSON.parse(compiledDelivery.interface), deliveryContractAddress);

    // accept()
    balance1 = await web3.eth.getBalance(accounts[1]);
    console.time('Delay of function accept()');
    await deliveryContract.methods.accept()
        .send({ from: accounts[1] });
    console.timeEnd('Delay of function accept()');
    balance2 = await web3.eth.getBalance(accounts[1]);
    console.log('Cost of function accept(): \t\t'+(balance1-balance2).toLocaleString('en').padStart(25));
    
    await deliveryContract.methods.accept()
        .send({ from: accounts[2] });

    // finish()
    balance1 = await web3.eth.getBalance(accounts[0]);
    console.time('Delay of function finish()');
    await deliveryContract.methods.finish("Test message")
        .send({ from: accounts[0] });
    console.timeEnd('Delay of function finish()');
    balance2 = await web3.eth.getBalance(accounts[0]);
    console.log('Cost of function finish(): \t\t'+(balance1-balance2).toLocaleString('en').padStart(25));
});

