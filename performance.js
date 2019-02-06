const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());

const compiledFactoryPath = './contracts/build/NonConfidentialMultipartyRegisteredEDeliveryFactory.json';
const compiledDeliveryPath = './contracts/build/NonConfidentialMultipartyRegisteredEDelivery.json';
const compiledFactory = require(compiledFactoryPath);
const compiledDelivery = require(compiledDeliveryPath);

const compiledNotification2partyPath = './contracts_2party/build/NonConfidentialNotification.json';
const compiledNotification2party = require(compiledNotification2partyPath);

// To prevent warning "MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 data listeners added. Use emitter.setMaxListeners() to increase limit"
require('events').EventEmitter.defaultMaxListeners = 0;

const performance = async (functionToTest, functionName, account) => {
    let balance1 = await web3.eth.getBalance(account);
    let hrstart = process.hrtime();
    let returnValue = await functionToTest();
    let hrend = process.hrtime(hrstart);
    let balance2 = await web3.eth.getBalance(account);
    console.log('Delay of function '+functionName+'(): %ds %dms', hrend[0], hrend[1] / 1000000);
    console.log('Cost of function '+functionName+'(): \t\t%s', (balance1-balance2).toLocaleString('en').padStart(25));
    return returnValue;
};

// Test multiparty contract
const testPerformance = async (numberReceivers, repetitions) => {
    let accounts = await web3.eth.getAccounts();
    let gasPrice = await web3.eth.getGasPrice();
    
    let factoryContract = [];
    let deliveryContract = [];
    
    // Add n receivers to the array of receivers
    let arrayReceivers = [];
    for (let i = 1; i<=numberReceivers; i++) {
        arrayReceivers.push(accounts[i%10]);    // i%10 --> There are only 10 addresses.
    }

    console.log('');
    console.log('For %d receiver/s', numberReceivers);
    console.log('------------------------');

    // Deploy factory
    for (let i = 0; i < repetitions; i++) {
        factoryContract.push(await performance(
            async () => {
                return await new web3.eth.Contract(JSON.parse(compiledFactory.interface))
                    .deploy({ data: compiledFactory.bytecode, arguments: [] })
                    .send({ from: accounts[0], gas: '3000000' });
            },
            'deploy',
            accounts[0]
        ));
    }

    // createDelivery()
    for (let i = 0; i < repetitions; i++) {
        await performance(
            async () => {
                await factoryContract[i].methods
                    .createDelivery(arrayReceivers, web3.utils.keccak256("Test message"), 600, 1200)
                    .send({ from: accounts[0], gas: '3000000', value: '1' });
            },
            'createDelivery',
            accounts[0]
        );

        // Get the deployed delivery contract
        let addresses = await factoryContract[i].methods.getDeliveries().call();
        let deliveryContractAddress = addresses[0];
        deliveryContract.push(await new web3.eth.Contract(JSON.parse(compiledDelivery.interface), deliveryContractAddress));
    }

    // accept() from accounts[1]
    for (let i = 0; i < repetitions; i++) {
        await performance(
            async () => {
                await deliveryContract[i].methods.accept()
                    .send({ from: arrayReceivers[0], gas: '3000000' });
            },
            'accept',
            arrayReceivers[0]
        );
    }
    
    // accept() from accounts[] of the rest of receivers
    for (let i = 0; i < repetitions; i++) {
        for (let j = 1; j<numberReceivers; j++) {
            await deliveryContract[i].methods.accept()
                .send({ from: arrayReceivers[j], gas: '3000000' });
        }
    }

    // finish()
    for (let i = 0; i < repetitions; i++) {
        await performance(
            async () => {
                await deliveryContract[i].methods.finish("Test message")
                    .send({ from: accounts[0], gas: '3000000' });
            },
            'finish',
            accounts[0]
        );
    }
};

// Test 2-party contract
const testPerformance2party = async (repetitions) => {
    let accounts = await web3.eth.getAccounts();
    let gasPrice = await web3.eth.getGasPrice();
    
    let notification2partyContract = [];
    
    console.log('');
    console.log('For 2-party notification');
    console.log('------------------------');

    // Deploy factory
    for (let i = 0; i < repetitions; i++) {
        notification2partyContract.push(await performance(
            async () => {
                return await new web3.eth.Contract(JSON.parse(compiledNotification2party.interface))
                    .deploy({ data: compiledNotification2party.bytecode, arguments: [accounts[1], web3.utils.keccak256("Test message"), 600] })
                    .send({ from: accounts[0], gas: '3000000', value: '1' });
            },
            'createDelivery-deploy',
            accounts[0]
        )); 
    }

    // accept() from accounts[1]
    for (let i = 0; i < repetitions; i++) {
        await performance(
            async () => {
                await notification2partyContract[i].methods.accept()
                    .send({ from: accounts[1], gas: '3000000' });
            },
            'accept',
            accounts[1]
        );
    }

    // finish()
    for (let i = 0; i < repetitions; i++) {
        await performance(
            async () => {
                await notification2partyContract[i].methods.finish("Test message")
                    .send({ from: accounts[0], gas: '3000000' });
            },
            'finish',
            accounts[0]
        );
    }
};

const init = async (repetitions) => {
        await testPerformance(1, repetitions);
        await testPerformance(2, repetitions);
        await testPerformance(10, repetitions);
        await testPerformance2party(repetitions);
}

init(10)