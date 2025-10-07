import { ethers } from "hardhat";
import * as fs from "fs";
import { run } from "hardhat";

async function verifyContract(address: string, constructorArguments: any[] = []) {
    try {
        await run("verify:verify", {
            address,
            constructorArguments,
        });
        console.log(`✅ Contract ${address} verified`);
    } catch (error: any) {
        if (error.message.toLowerCase().includes("already verified")) {
            console.log("Contract already verified!");
        } else {
            console.error("Error verifying contract:", error);
        }
    }
}

async function saveDeployment(deployments: Record<string, string>, network: string) {
    const deploymentPath = `./deployments/${network}`;
    if (!fs.existsSync(deploymentPath)) {
        fs.mkdirSync(deploymentPath, { recursive: true });
    }
    
    fs.writeFileSync(
        `${deploymentPath}/addresses.json`,
        JSON.stringify(deployments, null, 2)
    );
    
    // Also save as TypeScript for frontend
    const tsContent = `
// Auto-generated on ${new Date().toISOString()}
export const CONTRACT_ADDRESSES = ${JSON.stringify(deployments, null, 2)} as const;
`;
    fs.writeFileSync(
        `${deploymentPath}/addresses.ts`,
        tsContent
    );
}

async function main() {
    // Get network information
    const network = await ethers.provider.getNetwork();
    console.log(`Deploying to network: ${network.name} (${network.chainId})`);

    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    
    // Check deployer balance
    const balance = await deployer.getBalance();
    console.log("Account balance:", ethers.utils.formatEther(balance));
    if (balance.lt(ethers.utils.parseEther("0.0006"))) {
        throw new Error("Insufficient balance for deployment - please make sure you have at least 0.0008 ETH");
    }

    const deployments: Record<string, string> = {};

    // 1. Deploy MockERC20 (USDC) - only for testnet
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    await usdc.deployed();
    console.log("MockERC20 (USDC) deployed to:", usdc.address);
    deployments.USDC = usdc.address;
    
    // Mint initial USDC to deployer for testing
    const initialMint = ethers.utils.parseUnits("1000000", 6); // Mint 1 million USDC
    await usdc.mint(deployer.address, initialMint);
    console.log("Minted", ethers.utils.formatUnits(initialMint, 6), "USDC to deployer");

    // 2. Deploy AdminResolver
    const Admin = await ethers.getContractFactory("AdminResolver");
    const adminResolver = await Admin.deploy();
    await adminResolver.deployed();
    console.log("AdminResolver deployed to:", adminResolver.address);
    deployments.AdminResolver = adminResolver.address;

    // 3. Deploy and initialize ResolutionModule
    const Resolution = await ethers.getContractFactory("ResolutionModuleUpgradeable");
    const resolution = await Resolution.deploy();
    await resolution.deployed();
    console.log("ResolutionModule deployed to:", resolution.address);
    deployments.ResolutionModule = resolution.address;
    
    await resolution.initialize(usdc.address, adminResolver.address);
    console.log("ResolutionModule initialized");

    // 4. Deploy Market implementation
    const Market = await ethers.getContractFactory("MarketUpgradeable");
    const marketImpl = await Market.deploy();
    await marketImpl.deployed();
    console.log("Market implementation deployed to:", marketImpl.address);
    deployments.MarketImplementation = marketImpl.address;

    // 4.5 Deploy AMMPool implementation as a template
    const AMMPool = await ethers.getContractFactory("AMMPool");
    const ammPoolTemplate = await AMMPool.deploy(
        marketImpl.address,
        usdc.address,
        true
    );
    await ammPoolTemplate.deployed();
    console.log("AMMPool template deployed to:", ammPoolTemplate.address);
    deployments.AMMPoolTemplate = ammPoolTemplate.address;

    // 5. Deploy and initialize Factory
    const Factory = await ethers.getContractFactory("MarketFactoryUpgradeable");
    const factory = await Factory.deploy();
    await factory.deployed();
    console.log("MarketFactory deployed to:", factory.address);
    deployments.MarketFactory = factory.address;
    
    await factory.initialize(marketImpl.address, usdc.address);
    console.log("MarketFactory initialized");

    // Save deployments
    await saveDeployment(deployments, network.name);
    console.log(`\nDeployment addresses saved to /deployments/${network.name}/`);

    // Verify contracts if on a supported network
    if (network.chainId !== 31337 && network.chainId !== 1337) { // Skip for local networks
        console.log("\nVerifying contracts...");
        await verifyContract(usdc.address, ["USDC", "USDC", 6]);
        await verifyContract(adminResolver.address);
        await verifyContract(resolution.address);
        await verifyContract(marketImpl.address);
        await verifyContract(ammPoolTemplate.address, [marketImpl.address, usdc.address, true]);
        await verifyContract(factory.address);
    }

    // Print all deployment addresses
    console.log("\nDeployment Summary:");
    console.log("-------------------");
    Object.entries(deployments).forEach(([name, address]) => {
        console.log(`${name}: ${address}`);
    });
}

// Execute the deployment script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });