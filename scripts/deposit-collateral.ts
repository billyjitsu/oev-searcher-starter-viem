import {
  createPublicClient,
  createWalletClient,
  http,
  getContract,
  parseEther,
  Address,
  Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { deploymentAddresses } from "@api3/contracts";
import OevAuctionHouseAbi from "../artifacts/@api3/contracts/api3-server-v1/OevAuctionHouse.sol/OevAuctionHouse.json";
import "dotenv/config";

// Environment variables
const amount = process.env.AMOUNT || "0.0001"; // Default: 0.001 MNT

// Contract ABIs
const OevAuctionHouseABI = OevAuctionHouseAbi.abi; // Import the ABI from the JSON file

interface OevChain extends Chain {
  rpcUrls: {
    default: {
      http: string[];
    };
    public: {
      http: string[];
    };
  };
}

// Create custom chains
const oevNetwork: OevChain = {
  id: 4913,
  name: "OEV Network",
  nativeCurrency: {
    decimals: 18,
    name: "ETH",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [process.env.OEV_NETWORK_RPC_URL!],
    },
    public: {
      http: [process.env.OEV_NETWORK_RPC_URL!],
    },
  },
};

// Create wallet accounts using a private key
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const formattedPrivateKey = PRIVATE_KEY.startsWith("0x")
  ? (PRIVATE_KEY as `0x${string}`)
  : (`0x${PRIVATE_KEY}` as `0x${string}`);

// Create wallet account
const account = privateKeyToAccount(formattedPrivateKey);

// Create clients
const oevNetworkPublic = createPublicClient({
  chain: oevNetwork,
  transport: http(),
});

const oevNetworkWallet = createWalletClient({
  account,
  chain: oevNetwork,
  transport: http(),
});

async function deposit(): Promise<void> {
  const OevAuctionHouse = getContract({
    address: deploymentAddresses.OevAuctionHouse["4913"] as Address,
    abi: OevAuctionHouseABI,
    client: {
      public: oevNetworkPublic,
      wallet: oevNetworkWallet,
    },
  });

  // Deposit collateral with the auction house on OEV network
  const depositTxHash = await OevAuctionHouse.write.deposit([],{
    value: parseEther(amount),
  });

  console.log("Deposit Tx Hash", depositTxHash);
  console.log("Collateral deposited");

  // Wait for transaction receipt
  const depositReceipt = await oevNetworkPublic.waitForTransactionReceipt({
    hash: depositTxHash,
  });
}

deposit().catch(console.error);
