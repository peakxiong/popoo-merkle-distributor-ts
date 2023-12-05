import { expect } from "chai";
import hre, { ethers, upgrades } from "hardhat";
import {
  parseEther,
  formatEther,
  Interface,
  verifyTypedData,
  TypedDataDomain,
  BigNumberish,
  Signature,
} from "ethers";
import { PopToken, PopIronBank } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const permitInterface = new Interface([
  "function permit( address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s ) public",
  "function transferFrom( address from, address to, uint256 amount ) external returns (bool)",
  "function sendPPT(address[] memory _to, uint[] memory _value) public",
]);

describe("Pop Iron Bank", () => {
  let IronBank: PopIronBank;
  let PopToken: PopToken;
  let owner: HardhatEthersSigner,
    admin_1: HardhatEthersSigner,
    admin_2: HardhatEthersSigner,
    sender_1: HardhatEthersSigner,
    sender_2: HardhatEthersSigner;

  let ADMIN_ROLE =
    "0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775";
  let DEFAULT_ADMIN_ROLE =
    "0x0000000000000000000000000000000000000000000000000000000000000000";
  let SENDER_ROLE =
    "0x76d12de99ad2ca162840505be9b657c2e7a650cc3ee0284048f3f9def3c1adf2";

  let amount = "200000";

  before("deploy contracts", async () => {
    [owner, admin_1, admin_2, sender_1, sender_2] = await ethers.getSigners();
    console.log(
      owner.address,
      admin_1.address,
      admin_2.address,
      sender_1.address,
      sender_2.address
    );

    const PopTokenFac = await ethers.getContractFactory("PopToken");
    PopToken = await PopTokenFac.deploy(parseEther("200000000"));

    let ownerBalance = await PopToken.balanceOf(owner.address);
    expect(await PopToken.totalSupply()).to.equal(ownerBalance);
    console.log("popToken", PopToken.target);

    let IronBankFac = await ethers.getContractFactory("PopIronBank");

    let start_time = new Date(new Date().setHours(0, 0, 0, 0)).getTime() / 1000;
    // @ts-ignore
    IronBank = await upgrades.deployProxy(
      IronBankFac,
      [PopToken.target, admin_1.address, sender_1.address, start_time],
      { initializer: "initialize" }
    );
    console.log("IronBank", IronBank.target);
  });

  describe("PopToken", () => {
    it("check PopToken base info", async () => {
      expect(await PopToken.name()).to.equal("Pop Token");
      expect(await PopToken.symbol()).to.equal("PPT");
      expect(await PopToken.totalSupply()).to.equal(parseEther("200000000"));

      await expect(PopToken.transfer(IronBank.target, parseEther(amount)))
        .to.emit(PopToken, "Transfer")
        .withArgs(owner.address, IronBank.target, parseEther(amount));
    });

    it("check IronBank base info", async () => {
      expect(await IronBank.hasRole(ADMIN_ROLE, admin_1.address)).to.equal(
        true
      );
      expect(await IronBank.hasRole(SENDER_ROLE, sender_1.address)).to.equal(
        true
      );
      expect(await IronBank.PPT()).to.equal(PopToken.target);
    });

    it("set IronBank role", async () => {
      expect(await IronBank.hasRole(ADMIN_ROLE, admin_2.address)).to.equal(
        false
      );
      await IronBank.connect(admin_1).grantRole(ADMIN_ROLE, admin_2.address);
      expect(await IronBank.hasRole(ADMIN_ROLE, admin_2.address)).to.equal(
        true
      );

      expect(await IronBank.hasRole(SENDER_ROLE, sender_2.address)).to.equal(
        false
      );
      await IronBank.connect(admin_1).grantRole(SENDER_ROLE, sender_2.address);
      expect(await IronBank.hasRole(SENDER_ROLE, sender_2.address)).to.equal(
        true
      );
    });

    it("sendPPT", async () => {
      let bankBalanceBefore = await PopToken.balanceOf(IronBank.target);
      expect(bankBalanceBefore).to.equal(parseEther(amount));

      let sendAmount = "20000";
      await IronBank.connect(sender_1).sendPPT(
        [admin_1.address, admin_2.address],
        [parseEther(sendAmount), parseEther(sendAmount)]
      );
      await IronBank.connect(sender_2).sendPPT(
        [admin_1.address, admin_2.address],
        [parseEther(sendAmount), parseEther(sendAmount)]
      );

      let bankBalanceAfter = await PopToken.balanceOf(IronBank.target);
      let bankExpectBalanceBefore =
        Number(formatEther(bankBalanceBefore)) - Number(sendAmount) * 4;
      expect(bankBalanceAfter).to.equal(
        parseEther(String(bankExpectBalanceBefore))
      );

      // check fee 2 ppt send to admin_1
      let admin_1_balance = await PopToken.balanceOf(admin_1.address);
      expect(admin_1_balance).to.equal(parseEther("40002"));
      let admin_2_balance = await PopToken.balanceOf(admin_2.address);
      expect(admin_2_balance).to.equal(parseEther("39998"));

      expect(await IronBank.todaySend()).to.equal(parseEther("80000"));

      await expect(
        IronBank.connect(sender_1).sendPPT(
          [admin_1.address, admin_2.address],
          [parseEther(sendAmount), parseEther(sendAmount)]
        )
      ).to.be.revertedWith("daily limit exceeded");

      await time.increase(87000);

      await expect(
        IronBank.connect(sender_1).sendPPT(
          [admin_1.address, admin_2.address],
          [parseEther(sendAmount), parseEther(sendAmount)]
        )
      ).not.to.be.reverted;
      expect(await IronBank.todaySend()).to.equal(parseEther("40000"));
    });

    it("set IronBank and owner as sender role", async () => {
      expect(await IronBank.hasRole(SENDER_ROLE, IronBank.target)).to.equal(
        false
      );
      await IronBank.connect(admin_1).grantRole(SENDER_ROLE, IronBank.target);
      expect(await IronBank.hasRole(SENDER_ROLE, IronBank.target)).to.equal(
        true
      );

      expect(await IronBank.hasRole(SENDER_ROLE, owner.address)).to.equal(
        false
      );
      await IronBank.connect(admin_1).grantRole(SENDER_ROLE, owner.address);
      expect(await IronBank.hasRole(SENDER_ROLE, owner.address)).to.equal(true);
    });

    it("exec aggregate3 call ", async () => {
      // Offline signature authorization iron bank transfer from owner to sender_2 1 ppt

      let add_ppt = "1";
      let send_before = formatEther(await PopToken.balanceOf(sender_2.address));
      let value = parseEther(add_ppt);
      let deadline =
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      let nonces = await PopToken.nonces(owner.address);
      const domain: TypedDataDomain = {
        name: await PopToken.symbol(),
        version: "1",
        chainId: hre.network.config.chainId as BigNumberish,
        verifyingContract: PopToken.target as string,
      };
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const values = {
        owner: owner.address,
        spender: IronBank.target,
        value: value,
        nonce: nonces,
        deadline: deadline,
      };
      const signature = await owner.signTypedData(domain, types, values);
      let sig = Signature.from(signature);
      expect(verifyTypedData(domain, types, values, sig)).to.equal(
        owner.address
      );
      const permitCalls = [
        {
          target: PopToken.target,
          allowFailure: false,
          callData: permitInterface.encodeFunctionData("permit", [
            values.owner,
            values.spender,
            values.value,
            values.deadline,
            sig.v,
            sig.r,
            sig.s,
          ]),
        },
        {
          target: PopToken.target,
          allowFailure: false,
          callData: permitInterface.encodeFunctionData("transferFrom", [
            values.owner,
            sender_2.address,
            values.value,
          ]),
        },
      ];
      await IronBank.aggregate3(permitCalls);
      let send_after = formatEther(await PopToken.balanceOf(sender_2.address));
      expect(Number(send_after) - Number(send_before)).to.equal(
        Number(add_ppt)
      );
    });
  });
});
