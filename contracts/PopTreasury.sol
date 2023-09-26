// SPDX-License-Identifier: MIT

pragma solidity >=0.8.17;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";


contract PopTreasury is AccessControlUpgradeable {
    using SafeMath for uint;
    using SafeERC20 for IERC20;

    uint256 public todaySend;
    uint256 public maxSend;
    uint256 public time;

    address public PPT;
    bytes32 public constant SENDER_ROLE = keccak256("SENDER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    bool private initialized;

    function initialize(address PPTAddress, address admin, address sender, uint256 max) public {
        require(!initialized, "Contract instance has already been initialized");
        initialized = true;
        PPT = PPTAddress;
        maxSend = max;
        time = block.timestamp;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(SENDER_ROLE, sender);
    }

    function setMaxSend(uint256 max) public onlyRole(ADMIN_ROLE) {
        maxSend = max;
    }

    function setPPTAddress(address PPTAddress) public onlyRole(ADMIN_ROLE) {
        PPT = PPTAddress;
    }

    function _flush() private {
        time = block.timestamp;
        todaySend = 0;
    }

    function setFlush() public onlyRole(ADMIN_ROLE) {
        _flush();
    }

    function sendPPT(address[] memory _to, uint[] memory _value) public onlyRole(SENDER_ROLE) {
        require(_to.length == _value.length, 'invalid input');
        require(_to.length <= 255, 'exceed max allowed');

        if (block.timestamp > time + 86400) {
            _flush();
        }

        for (uint8 i = 0; i < _to.length; i++) {
            todaySend = todaySend.add(_value[i]);
            require(todaySend <= maxSend, 'daily limit exceeded');
            IERC20(PPT).safeTransfer(_to[i], _value[i]);
        }
    }

    function revokeToken(address token, address recipient) public onlyRole(ADMIN_ROLE) {
        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransfer(recipient, balance);
    }

    function revokeEther(address recipient) public onlyRole(ADMIN_ROLE) {
        payable(recipient).transfer(address(this).balance);
    }
}