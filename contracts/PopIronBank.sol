// SPDX-License-Identifier: MIT

pragma solidity >=0.8.17;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";


contract PopIronBank is AccessControlUpgradeable {
    using SafeMath for uint;
    using SafeERC20 for IERC20;

    uint256 public todaySend;
    uint256 public maxSend;
    uint256 public fee;
    address public feeAddress;

    uint256 public time;

    address public PPT;
    bytes32 public constant SENDER_ROLE = keccak256("SENDER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    bool private initialized;

    struct Result {
        bool success;
        bytes returnData;
    }

    struct Call3 {
        address target;
        bool allowFailure;
        bytes callData;
    }

    function initialize(address PPTAddress, address admin, address sender, uint256 start_time) public {
        require(!initialized, "Contract instance has already been initialized");
        initialized = true;
        PPT = PPTAddress;
        time = start_time;
        feeAddress = admin;

        maxSend = 100000000000000000000000;
        fee = 1000000000000000000;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(SENDER_ROLE, sender);
    }

    function setMaxSend(uint256 max) public onlyRole(ADMIN_ROLE) {
        maxSend = max;
    }

    function setNetworkFee(uint256 networkFee) public onlyRole(ADMIN_ROLE) {
        fee = networkFee;
    }

    function setNetworkFeeAddress(address recipient) public onlyRole(ADMIN_ROLE) {
        feeAddress = recipient;
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
        uint256 totalFee = 0;
        for (uint8 i = 0; i < _to.length; i++) {
            todaySend = todaySend.add(_value[i]);
            require(todaySend <= maxSend, 'daily limit exceeded');
            IERC20(PPT).safeTransfer(_to[i], _value[i].sub(fee));
            totalFee = totalFee.add(fee);
        }
        IERC20(PPT).safeTransfer(feeAddress, totalFee);
    }

    function revokeToken(address token, address recipient) public onlyRole(ADMIN_ROLE) {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance >= 0, 'token balance is zero');
        IERC20(token).safeTransfer(recipient, balance);
    }

    function revokeEther(address recipient) public onlyRole(ADMIN_ROLE) {
        payable(recipient).transfer(address(this).balance);
    }


    /// @notice Aggregate calls, ensuring each returns success if required
    /// @param calls An array of Call3 structs
    /// @return returnData An array of Result structs
    function aggregate3(Call3[] calldata calls) public payable onlyRole(SENDER_ROLE) returns (Result[] memory returnData) {
        uint256 length = calls.length;
        returnData = new Result[](length);
        Call3 calldata calli;
        for (uint256 i = 0; i < length;) {
            Result memory result = returnData[i];
            calli = calls[i];
            (result.success, result.returnData) = calli.target.call(calli.callData);
            assembly {
            // Revert if the call fails and failure is not allowed
            // `allowFailure := calldataload(add(calli, 0x20))` and `success := mload(result)`
                if iszero(or(calldataload(add(calli, 0x20)), mload(result))) {
                // set "Error(string)" signature: bytes32(bytes4(keccak256("Error(string)")))
                    mstore(0x00, 0x08c379a000000000000000000000000000000000000000000000000000000000)
                // set data offset
                    mstore(0x04, 0x0000000000000000000000000000000000000000000000000000000000000020)
                // set length of revert string
                    mstore(0x24, 0x0000000000000000000000000000000000000000000000000000000000000017)
                // set revert string: bytes32(abi.encodePacked("Multicall3: call failed"))
                    mstore(0x44, 0x4d756c746963616c6c333a2063616c6c206661696c6564000000000000000000)
                    revert(0x00, 0x64)
                }
            }
            unchecked {++i;}
        }
    }
}