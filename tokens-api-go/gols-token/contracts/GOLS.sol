// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GOLS is ERC20, Ownable {
    constructor() 
        ERC20("GOLS Token", "GOLS") 
        Ownable(msg.sender)
    {
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    /// 🏆 Função extra para Mintar GOLS
    function mintGoal() external onlyOwner {
        _mint(msg.sender, 1 * 10 ** decimals());
    }
}
