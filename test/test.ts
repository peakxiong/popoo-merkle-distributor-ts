import {expect} from 'chai';
import hre, {ethers, upgrades} from "hardhat";
import {parseEther, formatEther} from 'ethers'
import {PopToken, PopIronBank} from '../typechain-types';
import {HardhatEthersSigner} from "@nomicfoundation/hardhat-ethers/signers";
import {time} from "@nomicfoundation/hardhat-network-helpers";


describe("Pop Iron Bank", () => {
    let IronBank: PopIronBank;
    let PopToken: PopToken;
    let owner: HardhatEthersSigner,
        admin_1: HardhatEthersSigner,
        admin_2: HardhatEthersSigner,
        sender_1: HardhatEthersSigner,
        sender_2: HardhatEthersSigner;


    let ADMIN_ROLE = "0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775"
    let DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000"
    let SENDER_ROLE = "0x76d12de99ad2ca162840505be9b657c2e7a650cc3ee0284048f3f9def3c1adf2"

    let amount = "200000";

    before('deploy contracts', async () => {
        [owner, admin_1, admin_2, sender_1, sender_2] = await ethers.getSigners();

        const PopTokenFac = await ethers.getContractFactory('PopToken');
        PopToken = await PopTokenFac.deploy(parseEther("200000000"));

        let ownerBalance = await PopToken.balanceOf(owner.address);
        expect(await PopToken.totalSupply()).to.equal(ownerBalance);
        console.log("popToken", PopToken.target)

        let IronBankFac = await ethers.getContractFactory("PopIronBank")

        let start_time = new Date(new Date().setHours(0, 0, 0, 0)).getTime() / 1000;
        // @ts-ignore
        IronBank = await upgrades.deployProxy(IronBankFac, [PopToken.target, admin_1.address, sender_1.address, start_time], {initializer: 'initialize'})
        console.log("IronBank", IronBank.target);
    })

    describe('PopToken', () => {
        it('check PopToken base info', async () => {
            expect(await PopToken.name()).to.equal("Pop Token");
            expect(await PopToken.symbol()).to.equal("PPT");
            expect(await PopToken.totalSupply()).to.equal(parseEther("200000000"));

            await expect(PopToken.transfer(IronBank.target, parseEther(amount)))
                .to.emit(PopToken, 'Transfer')
                .withArgs(owner.address, IronBank.target, parseEther(amount));
        });

        it('check IronBank base info', async () => {
            expect(await IronBank.hasRole(ADMIN_ROLE, admin_1.address)).to.equal(true);
            expect(await IronBank.hasRole(SENDER_ROLE, sender_1.address)).to.equal(true);
            expect(await IronBank.PPT()).to.equal(PopToken.target);
        });

        it('set IronBank role', async () => {
            expect(await IronBank.hasRole(ADMIN_ROLE, admin_2.address)).to.equal(false);
            await IronBank.connect(admin_1).grantRole(ADMIN_ROLE, admin_2.address);
            expect(await IronBank.hasRole(ADMIN_ROLE, admin_2.address)).to.equal(true);

            expect(await IronBank.hasRole(SENDER_ROLE, sender_2.address)).to.equal(false);
            await IronBank.connect(admin_1).grantRole(SENDER_ROLE, sender_2.address);
            expect(await IronBank.hasRole(SENDER_ROLE, sender_2.address)).to.equal(true);
        });

        it('sendPPT', async () => {
            let bankBalanceBefore = await PopToken.balanceOf(IronBank.target);
            expect(bankBalanceBefore).to.equal(parseEther(amount));

            let sendAmount = "20000"
            await IronBank.connect(sender_1).sendPPT([admin_1.address, admin_2.address], [parseEther(sendAmount), parseEther(sendAmount)])
            await IronBank.connect(sender_2).sendPPT([admin_1.address, admin_2.address], [parseEther(sendAmount), parseEther(sendAmount)])

            let bankBalanceAfter = await PopToken.balanceOf(IronBank.target);
            let bankExpectBalanceBefore = Number(formatEther(bankBalanceBefore)) - (Number(sendAmount) * 4)
            expect(bankBalanceAfter).to.equal(parseEther(String(bankExpectBalanceBefore)));

            // check fee 2 ppt send to admin_1
            let admin_1_balance = await PopToken.balanceOf(admin_1.address);
            expect(admin_1_balance).to.equal(parseEther("40002"));
            let admin_2_balance = await PopToken.balanceOf(admin_2.address);
            expect(admin_2_balance).to.equal(parseEther("39998"));

            expect(await IronBank.todaySend()).to.equal(parseEther("80000"));

            await expect(IronBank.connect(sender_1)
                .sendPPT([admin_1.address, admin_2.address], [parseEther(sendAmount), parseEther(sendAmount)]))
                .to.be.revertedWith("daily limit exceeded");

            await time.increase(87000);

            await expect(IronBank.connect(sender_1)
                .sendPPT([admin_1.address, admin_2.address], [parseEther(sendAmount), parseEther(sendAmount)]))
                .not.to.be.reverted;
            expect(await IronBank.todaySend()).to.equal(parseEther("40000"));
        });
    })
})