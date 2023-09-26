import hre, {ethers, upgrades} from "hardhat";
import * as dotenv from "dotenv";
import * as pop_treasury_json from '../artifacts/contracts/PopTreasury.sol/PopTreasury.json'

dotenv.config();


let ppt_address = process.env.PPT_ADDRESS
let admin_address = process.env.ADMIN !== undefined ? process.env.ADMIN : ""
let sender_address = process.env.SENDER !== undefined ? process.env.SENDER : ""
const max = hre.ethers.parseEther("100000");

async function main() {
    const PopTreasury = await ethers.getContractFactory("PopTreasury");
    console.log("Deploying PopTreasury...");
    let pop_treasury = process.env.TRANSPARENTUPGRADEABLEPROXY !== undefined ? process.env.TRANSPARENTUPGRADEABLEPROXY : ""
    const PopTreasury_fac = await upgrades.upgradeProxy(pop_treasury, PopTreasury);
    console.log("PopTreasury deployed to:", PopTreasury_fac);
}

async function verify() {
    // let address = "0x5378E1510022Bc6D8859753B9064EDB03afEE4C7"
    let address = "0xC978059B083d6014961FcA182e3Dbf83cf8FFcE5"
    await hre.run("verify:verify", {
        address: address
    });
}

async function test() {
    let address = "0x2c853f6a1887Def78f51518eA71AE3685320EA35"
    const [admin] = await hre.ethers.getSigners();
    console.log(admin.address)
    let proxy = new ethers.Contract(address, pop_treasury_json.abi, admin)
    let ti = await proxy.time()
    console.log(ti)
}

test().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
