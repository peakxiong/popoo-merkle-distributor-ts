import hre, {ethers, upgrades} from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

let ppt_address = process.env.PPT_ADDRESS
let admin_address = process.env.ADMIN !== undefined ? process.env.ADMIN : ""
let sender_address = process.env.SENDER !== undefined ? process.env.SENDER : ""

async function main() {
    const multisend = await ethers.getContractFactory("PopIronBank");
    console.log("Deploying PopIronBank...");
    let start_time = new Date(new Date().setHours(0, 0, 0, 0)).getTime() / 1000;
    const multisend_fac = await upgrades.deployProxy(multisend, [ppt_address, admin_address, sender_address, start_time], {initializer: 'initialize'});
    console.log("PopTreasury deployed to:", multisend_fac);
}


async function verify() {
    let address = "0x5b87038dd2Af16cC4D4c22Bbe78F18ccb078BccF"
    await hre.run("verify:verify", {
        address: address
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
