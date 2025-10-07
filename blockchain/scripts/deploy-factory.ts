import { ethers } from "hardhat";
import * as fs from "fs";
import { run } from "hardhat";

// I ran out of gas for deploy script before it could run factory so a seperate deploy script for factory. 
// Previously deployed contract addresses
const MARKET_IMPL_ADDRESS = "0x71D1957c6eD43FE86fAEe4663915EaA96a57033F"; // Add your deployed market implementation address here
const USDC_ADDRESS = "0x17dded11695B2F3cD4d821789785462274764e24"; // Add your deployed USDC address here

async function main() {
    // Get network information
    const network = await ethers.provider.getNetwork();
    console.log(`Deploying Factory to network: ${network.name} (${network.chainId})`);

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with the account:", deployer.address);
    
    // Check deployer balance
    const balance = await deployer.getBalance();
    console.log("Account balance:", ethers.utils.formatEther(balance));
    if (balance.lt(ethers.utils.parseEther("0.0006"))) {
        throw new Error("Insufficient balance for deployment");
    }

    console.log("Deploying MarketFactory with:");
    console.log("Market Implementation:", MARKET_IMPL_ADDRESS);
    console.log("USDC:", USDC_ADDRESS);

    // Deploy and initialize Factory with appropriate gas settings for Abstract testnet
    const Factory = await ethers.getContractFactory("MarketFactoryUpgradeable");
    console.log("Deploying with gas price:", ethers.utils.formatUnits(await ethers.provider.getGasPrice(), "gwei"), "gwei");
    
    const factory = await Factory.deploy();
    console.log("Waiting for deployment transaction...");
    await factory.deployed();
    console.log("MarketFactory deployed to:", factory.address);
    
    console.log("Initializing factory...");
    const initTx = await factory.initialize(MARKET_IMPL_ADDRESS, USDC_ADDRESS);
    console.log("Waiting for initialization transaction...");
    await initTx.wait();
    console.log("MarketFactory initialized");

    // Verify contract if on a supported network
    if (network.chainId !== 31337 && network.chainId !== 1337) {
        try {
            await run("verify:verify", {
                address: factory.address,
                constructorArguments: []
            });
            console.log("Factory contract verified");
        } catch (error: any) {
            console.error("Error verifying contract:", error);
        }
    }

    // Update deployment file if it exists
    try {
        const deploymentPath = `./deployments/${network.name}/addresses.json`;
        if (fs.existsSync(deploymentPath)) {
            const deployments = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
            deployments.MarketFactory = factory.address;
            fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2));
            console.log("Deployment addresses updated");
        }
    } catch (error) {
        console.error("Error updating deployment file:", error);
    }
}

// Execute the deployment script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });