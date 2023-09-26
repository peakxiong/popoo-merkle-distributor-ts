import hre, {ethers, upgrades} from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

let ppt_address = process.env.PPT_ADDRESS
let admin_address = process.env.ADMIN !== undefined ? process.env.ADMIN : ""
let sender_address = process.env.SENDER !== undefined ? process.env.SENDER : ""
const max = hre.ethers.parseEther("100000");

async function main() {
    const multisend = await ethers.getContractFactory("PopTreasury");
    console.log("Deploying PopTreasury...");
    const multisend_fac = await upgrades.deployProxy(multisend, [ppt_address, admin_address, sender_address, max], {initializer: 'initialize'});
    console.log("PopTreasury deployed to:", multisend_fac.address);

}

async function verify() {
    let address = "0x5378E1510022Bc6D8859753B9064EDB03afEE4C7"
    await hre.run("verify:verify", {
        address: address
    });
}

verify().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
