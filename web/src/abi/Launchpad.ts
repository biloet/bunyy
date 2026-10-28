export const launchpadAbi = [
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "totalSupply",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "saleSupply",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "virtualEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "virtualToken",
            "type": "uint256"
          },
          {
            "internalType": "uint16",
            "name": "tradeFeeBps",
            "type": "uint16"
          },
          {
            "internalType": "uint256",
            "name": "creationFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "migrationFee",
            "type": "uint256"
          }
        ],
        "internalType": "struct Launchpad.Params",
        "name": "initialParams",
        "type": "tuple"
      },
      {
        "internalType": "address",
        "name": "initialFeeRecipient",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "factory",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "weth_",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AlreadyMigrated",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CurveComplete",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CurveNotComplete",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DexNotConfigured",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EthTransferFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsufficientPayment",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidMetadata",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidParams",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OnlySelf",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Slippage",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnknownToken",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroAmount",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "realEth",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "CurveCompleted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "factory",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "weth",
        "type": "address"
      }
    ],
    "name": "DexUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "feeRecipient",
        "type": "address"
      }
    ],
    "name": "FeeRecipientUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "pair",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "ethLiquidity",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenLiquidity",
        "type": "uint256"
      }
    ],
    "name": "Migrated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "totalSupply",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "saleSupply",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "virtualEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "virtualToken",
            "type": "uint256"
          },
          {
            "internalType": "uint16",
            "name": "tradeFeeBps",
            "type": "uint16"
          },
          {
            "internalType": "uint256",
            "name": "creationFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "migrationFee",
            "type": "uint256"
          }
        ],
        "indexed": false,
        "internalType": "struct Launchpad.Params",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "ParamsUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "symbol",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "imageURI",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "description",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "TokenCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "trader",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isBuy",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "ethAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "fee",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "virtualEth",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "virtualToken",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "realEth",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "Trade",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "MAX_FEE_BPS",
    "outputs": [
      {
        "internalType": "uint16",
        "name": "",
        "type": "uint16"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "allTokens",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "minTokensOut",
        "type": "uint256"
      }
    ],
    "name": "buy",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "symbol",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "imageURI",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "description",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "minTokensOut",
        "type": "uint256"
      }
    ],
    "name": "createToken",
    "outputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "currentPrice",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "dexFactory",
    "outputs": [
      {
        "internalType": "contract IUniswapV2Factory",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "feeRecipient",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "getCurve",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "creator",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "virtualEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "virtualToken",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "realEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "realToken",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "reserveToken",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "complete",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "migrated",
            "type": "bool"
          },
          {
            "internalType": "uint64",
            "name": "createdAt",
            "type": "uint64"
          },
          {
            "internalType": "string",
            "name": "imageURI",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "description",
            "type": "string"
          }
        ],
        "internalType": "struct Launchpad.Curve",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "offset",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "limit",
        "type": "uint256"
      }
    ],
    "name": "getTokens",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "page",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "migrate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "migrateFromSelf",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "params",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "totalSupply",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "saleSupply",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "virtualEth",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "virtualToken",
        "type": "uint256"
      },
      {
        "internalType": "uint16",
        "name": "tradeFeeBps",
        "type": "uint16"
      },
      {
        "internalType": "uint256",
        "name": "creationFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "migrationFee",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "progressBps",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "quoteBuy",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "tokensOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "cost",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "fee",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenAmount",
        "type": "uint256"
      }
    ],
    "name": "quoteSell",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "ethOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "fee",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minEthOut",
        "type": "uint256"
      }
    ],
    "name": "sell",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "factory",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "weth_",
        "type": "address"
      }
    ],
    "name": "setDex",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newRecipient",
        "type": "address"
      }
    ],
    "name": "setFeeRecipient",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "totalSupply",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "saleSupply",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "virtualEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "virtualToken",
            "type": "uint256"
          },
          {
            "internalType": "uint16",
            "name": "tradeFeeBps",
            "type": "uint16"
          },
          {
            "internalType": "uint256",
            "name": "creationFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "migrationFee",
            "type": "uint256"
          }
        ],
        "internalType": "struct Launchpad.Params",
        "name": "newParams",
        "type": "tuple"
      }
    ],
    "name": "setParams",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "tokenCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "weth",
    "outputs": [
      {
        "internalType": "contract IWETH",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
