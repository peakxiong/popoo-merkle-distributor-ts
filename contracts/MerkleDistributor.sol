// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.8.17;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
//import {IMerkleDistributor} from "./interfaces/IMerkleDistributor.sol";
import {BokkyPooBahsDateTimeLibrary} from  "./BokkyPooBahsDateTimeLibrary.sol";

    error AlreadyClaimed();
    error InvalidProof();


contract MerkleDistributor is Ownable {
    using SafeERC20 for IERC20;

    event Claimed(uint256 index, address account, uint256 amount);
    event RemainingWithdrawn(address account, uint256 amount);
    event Revoked(address account, uint256 amount);

    address public immutable token;
    bytes32 public merkleRoot;

    // This is a packed array of booleans.
    mapping(address => uint256) private claimedBitMap;

    constructor(address token_, bytes32 merkleRoot_) {
        token = token_;
        merkleRoot = merkleRoot_;
    }

    function isClaimed(address account) public view returns (bool) {
        (uint year, uint month, uint day, uint hour,,) = BokkyPooBahsDateTimeLibrary.timestampToDateTime(block.timestamp);
        if (claimedBitMap[account] == 0) return false;
        else if (claimedBitMap[account] < year * 1000000 + month * 10000 + day * 100 + hour) return false;
        else return true;
    }

    function _setClaimed(address account) private {
        (uint year, uint month, uint day, uint hour,,) = BokkyPooBahsDateTimeLibrary.timestampToDateTime(block.timestamp);
        claimedBitMap[account] = year * 1000000 + month * 10000 + day * 100 + hour;
    }

    function claim(
        uint256 index,
        address account,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) public virtual
    {
        if (isClaimed(account)) revert AlreadyClaimed();
        // Verify the merkle proof.
        bytes32 node = keccak256(abi.encodePacked(index, account, amount));
        if (!MerkleProof.verify(merkleProof, merkleRoot, node)) revert InvalidProof();
        // Mark it claimed and send the token.
        _setClaimed(account);
        IERC20(token).safeTransfer(account, amount);
        emit Claimed(index, account, amount);
    }

    function setMerkleRoot(bytes32 merkleRoot_) external onlyOwner {
        merkleRoot = merkleRoot_;
    }

    function revoke(address recipient) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransfer(recipient, balance);
        emit RemainingWithdrawn(recipient, balance);
    }
}