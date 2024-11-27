// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Oracle.sol";

contract OracleFactory {
    address public immutable governanceToken;
    address[] public oracles;

    event OracleCreated(address oracle);

    constructor(address _governanceToken) {
        governanceToken = _governanceToken;
    }

    function createOracle() external returns (address) {
        Oracle oracle = new Oracle(governanceToken, msg.sender);
        oracles.push(address(oracle));
        emit OracleCreated(address(oracle));
        return address(oracle);
    }

    function getOracles() external view returns (address[] memory) {
        return oracles;
    }
}
