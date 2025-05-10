import {
  createWalletClient,
  http,
  Hex,
  Address,
  createPublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { deploymentAddresses } from "@api3/contracts";
import OevFeedUpdater from "../artifacts/contracts/OevFeedUpdater.sol/OevFeedUpdater.json";
import fs from "fs";
import path from "path";
import "dotenv/config";

const OevFeedUpdaterABI = OevFeedUpdater.abi;
const OevFeedUpdaterBytecode = OevFeedUpdater.bytecode;

// Deployment configuration
const DAPP_ID = 1n; // Base Price Feed Dapp ID
const RPC_URL = process.env.TARGET_NETWORK_RPC_URL!;
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const DEPLOYMENTS_FOLDER = path.resolve(__dirname, "../deployments");

async function deployContract() {
  const formattedPrivateKey = PRIVATE_KEY.startsWith("0x")
    ? (PRIVATE_KEY as `0x${string}`)
    : (`0x${PRIVATE_KEY}` as `0x${string}`);

  // Create wallet account
  const account = privateKeyToAccount(formattedPrivateKey);

  // Create wallet and public clients
  const walletClient = createWalletClient({
    account,
    transport: http(RPC_URL),
  });

  const publicClient = createPublicClient({
    transport: http(RPC_URL),
  });

  // Get chain information
  const chainId = await publicClient.getChainId();

  // Create chain object
  const chain = {
    id: chainId,
    name: `Chain ${chainId}`,
    nativeCurrency: {
      decimals: 18,
      name: "Ether",
      symbol: "ETH",
    },
    rpcUrls: {
      default: {
        http: [RPC_URL],
      },
      public: {
        http: [RPC_URL],
      },
    },
  };

  console.log("Deploying OevFeedUpdater contract...");

  // Define constructor arguments
  const constructorArgs = [
    DAPP_ID, // _dappId
    deploymentAddresses.Api3ServerV1OevExtension["4913"] as Address, // _api3ServerV1OevExtension address
  ];
  console.log("Constructor arguments:", constructorArgs);

  try {
    // Deploy the contract and get the transaction hash
    const hash = await walletClient.deployContract({
      abi: OevFeedUpdaterABI,
      bytecode: OevFeedUpdaterBytecode as Hex,
      args: constructorArgs,
      account,
      chain,
    });

    console.log(`Deployment transaction hash: ${hash}`);

    // Wait for the transaction receipt
    console.log("Waiting for transaction confirmation...");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Get the deployed contract address from the receipt
    const address = receipt.contractAddress;

    if (!address) {
      throw new Error("Contract address not found in transaction receipt");
    }

    console.log(`Contract deployed at address: ${address}`);

    // Save deployment details
    if (!fs.existsSync(DEPLOYMENTS_FOLDER)) {
      fs.mkdirSync(DEPLOYMENTS_FOLDER, { recursive: true });
    }

    // Load existing deployments if available
    let deployments = {};
    const deploymentsFile = path.join(DEPLOYMENTS_FOLDER, "deployments.json");
    if (fs.existsSync(deploymentsFile)) {
      deployments = JSON.parse(fs.readFileSync(deploymentsFile, "utf8"));
    }

    // Update with new deployment
    deployments = {
      ...deployments,
      OevFeedUpdater: address,
    };

    // Save updated deployments
    fs.writeFileSync(deploymentsFile, JSON.stringify(deployments, null, 2));

    console.log("Deployment details saved to deployments/deployments.json");

    return { hash, address };
  } catch (error) {
    console.error("Error during deployment:", error);
    throw error;
  }
}

deployContract().catch((error) => {
  console.error("Error deploying contract:", error);
  process.exit(1);
});
