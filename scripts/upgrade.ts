import hre, {ethers, upgrades} from "hardhat";
import * as dotenv from "dotenv";
import * as POP_IRON_BANK_JSON from '../artifacts/contracts/PopIronBank.sol/PopIronBank.json'
import {Contract} from "ethers";
import {HardhatEthersSigner} from "@nomicfoundation/hardhat-ethers/signers";

dotenv.config();


let ppt_address = process.env.PPT_ADDRESS
let admin_address = process.env.ADMIN !== undefined ? process.env.ADMIN : ""
let sender_address = process.env.SENDER !== undefined ? process.env.SENDER : ""

async function main() {
    const PopIronBank = await ethers.getContractFactory("PopIronBank");
    console.log("upgrading PopIronBank...");
    let pop_treasury = process.env.TRANSPARENTUPGRADEABLEPROXY !== undefined ? process.env.TRANSPARENTUPGRADEABLEPROXY : ""
    const PopTreasury_fac = await upgrades.upgradeProxy(pop_treasury, PopIronBank);
    console.log("PopTreasury deployed to:", PopTreasury_fac);
}

async function verify() {
    let address = "0x40021be80505EDd5b88c6572190587E335Ee3D7E"
    await hre.run("verify:verify", {
        address: address
    });
}

async function test_sender(proxy: Contract) {
    // hre.ethers.getContract()
    let out_addresses = ["0xD98Ab04B56b99C0966742684dB06bF24E326C3db", "0x9E9aD3E273749C91BD2Af49B305B270378683EBD"]
    let out_amount = [hre.ethers.parseEther("10"), hre.ethers.parseEther("10")]
    console.log(out_amount)
    let send_tx = await proxy.sendPPT(out_addresses, out_amount, {
        gasLimit: 10000000,
        gasPrice: hre.ethers.parseUnits("5", "gwei")
    })
    console.log(send_tx)
    let send_rec = await send_tx.wait()
    console.log(send_rec)
}


async function test_add_sender(proxy: Contract) {
    let oz_address = ["0x75b58d0bd1da27669de65e93547e2f6a579cde28", "0xb4b58a3e072f06ab8b8c20f90a852afb20cd46aa", "0xe03b8bc5ddd6cd960ad9c499f90f95782aa4ef40", "0x6bA1B2cdd82d07c84df3De19979C26E3fA364154", "0xC80588a2308129a87B6fA0c3E6d129D571835843", "0x034dE27775E4F210985CA5e30e4C2f339097FA09", "0x9f7bBbD3Dc330b0D45fE79100b579112c35726e7", "0xc0bCb4b21D95E854F4a39789eD556fDF9464E766", "0x0c5cFdFFf5C88A908cd5E2C1520C049438F5f76C", "0x5Ca32118293316c941490C6641Fa34ca9F0c348e", "0x6d63Fb280E9BdC3F6D805A59CB3F1dBb2A20c4d5"]
    for (const address of oz_address) {
        console.log(address)
        let send_tx = await proxy.grantRole("0x76d12de99ad2ca162840505be9b657c2e7a650cc3ee0284048f3f9def3c1adf2", address, {
            gasLimit: 100000,
            gasPrice: hre.ethers.parseUnits("5", "gwei")
        })
        console.log(send_tx)
        let send_rec = await send_tx.wait()
        console.log(send_rec)
        console.log(await proxy.hasRole("0x76d12de99ad2ca162840505be9b657c2e7a650cc3ee0284048f3f9def3c1adf2", address))
    }
}

async function test_revoke(proxy: Contract) {
    // let out_addresses = ["0xD98Ab04B56b99C0966742684dB06bF24E326C3db", "0x9E9aD3E273749C91BD2Af49B305B270378683EBD"]
    // let out_amount = [hre.ethers.parseEther("10"), hre.ethers.parseEther("10")]

    let ppt_address = "0xab1a4d4f1d656d2450692d237fdd6c7f9146e814"
    let to = "0x2917115014beea46CA2d6aD3935c26C21439Fbc2"
    let send_tx = await proxy.revokeToken(ppt_address, to, {
        value: hre.ethers.parseEther("0.1"),
        gasLimit: 10000000,
        gasPrice: hre.ethers.parseUnits("5", "gwei")
    })
    console.log(send_tx)
    let send_rec = await send_tx.wait()
    console.log(send_rec)
}

async function test_revoke_eth(proxy: HardhatEthersSigner, admin_proxy: Contract) {
    let to = "0x2917115014beea46CA2d6aD3935c26C21439Fbc2"
    let send_tx = await proxy.sendTransaction({
        value: hre.ethers.parseEther("0.1"),
        to: process.env.TRANSPARENTUPGRADEABLEPROXY,
        gasLimit: 10000000,
        gasPrice: hre.ethers.parseUnits("5", "gwei")
    })
    console.log(send_tx)
    let send_rec = await send_tx.wait(5)
    console.log(send_rec)

    send_tx = await admin_proxy.revokeEther(ppt_address, to, {
        gasLimit: 10000000,
        gasPrice: hre.ethers.parseUnits("5", "gwei")
    })
    console.log(send_tx)
    send_rec = await send_tx.wait()
    console.log(send_rec)
}

async function test() {
    let pop_treasury = process.env.TRANSPARENTUPGRADEABLEPROXY !== undefined ? process.env.TRANSPARENTUPGRADEABLEPROXY : ""
    const [admin, sender] = await hre.ethers.getSigners();
    console.log(admin.address, sender.address)
    let admin_proxy = new ethers.Contract(pop_treasury, POP_IRON_BANK_JSON.abi, admin)
    let sender_proxy = new ethers.Contract(pop_treasury, POP_IRON_BANK_JSON.abi, sender)
    // let ti = await admin_proxy.time()
    // console.log(ti)
    // await test_sender(sender_proxy)
    await test_revoke(admin_proxy)
    // await test_revoke_eth(admin, admin_proxy)
}

test().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});




