# Access-Condition-MolchDAO
This contract is VWBL's access condition contract which defined MolchDAO member only can view digital content

# Test
1. Start a local Ethereum network basedn on a snapshot of the mainnet.
```
npx hardhat node --fork mainet-eth-rpc --fork-block-number block-number
```

2. In a separate terminal, run the test command with the `localhost` network.
```
npx hardhat test --network localhost
```


