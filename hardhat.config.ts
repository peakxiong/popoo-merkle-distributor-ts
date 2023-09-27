import {HardhatUserConfig} from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import '@openzeppelin/hardhat-upgrades';
import * as dotenv from "dotenv";

dotenv.config();


let private_key = [process.env.ADMIN_PK, process.env.SENDER_PK] as string[]

// @ts-ignore
const config: HardhatUserConfig = {
    solidity: "0.8.19", defaultNetwork: "bscTestnet", networks: {
        localhost: {
            url: process.env.RPC_URL || "http://localhost:8545", timeout: 180000000, gas: 12000000
        }, bscTestnet: {
            url: "https://bsc-testnet.nodereal.io/v1/e9a36765eb8a40b9bd12e680a1fd2bc5",
            chainId: 97,
            allowUnlimitedContractSize: true,
            accounts: private_key,
        }, bsc: {
            url: "https://bsc-mainnet.nodereal.io/v1/f7c78bdb88e342a390c4427d49a00701", chainId: 56
        }
    }, etherscan: {
        apiKey: {
            mainnet: "3HYT8NFACY14NB9X2P64VP5D1ZDYD2TT3V",
            bsc: "HKQ72BFRFXGUUI5JS7WJ8GYXMYF6PSF3AB",
            bscTestnet: "HKQ72BFRFXGUUI5JS7WJ8GYXMYF6PSF3AB",
            polygon: "JMPTG9P517V687FXIAP9VIGGV1IWTPA1G2"
        }, customChains: [{
            network: "bscTestnet", chainId: 97, urls: {
                apiURL: "https://api-testnet.bscscan.com/api", browserURL: "https://testnet.bscscan.com"
            }
        }, {
            network: "polygon", chainId: 137, urls: {
                apiURL: "https://api.polygonscan.com/api", browserURL: "https://polygonscan.com"
            }
        }]
    }
};

export default config;
