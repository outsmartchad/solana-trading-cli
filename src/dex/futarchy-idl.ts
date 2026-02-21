export type Futarchy = {
    version: "0.6.0";
    name: "futarchy";
    instructions: [
      {
        name: "initializeDao";
        accounts: [
          {
            name: "dao";
            isMut: true;
            isSigner: false;
          },
          {
            name: "daoCreator";
            isMut: false;
            isSigner: true;
          },
          {
            name: "payer";
            isMut: true;
            isSigner: true;
          },
          {
            name: "systemProgram";
            isMut: false;
            isSigner: false;
          },
          {
            name: "baseMint";
            isMut: false;
            isSigner: false;
          },
          {
            name: "quoteMint";
            isMut: false;
            isSigner: false;
          },
          {
            name: "squadsMultisig";
            isMut: true;
            isSigner: false;
          },
          {
            name: "squadsMultisigVault";
            isMut: false;
            isSigner: false;
          },
          {
            name: "squadsProgram";
            isMut: false;
            isSigner: false;
          },
          {
            name: "squadsProgramConfig";
            isMut: false;
            isSigner: false;
          },
          {
            name: "squadsProgramConfigTreasury";
            isMut: true;
            isSigner: false;
          },
          {
            name: "spendingLimit";
            isMut: true;
            isSigner: false;
          },
          {
            name: "futarchyAmmBaseVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "futarchyAmmQuoteVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "tokenProgram";
            isMut: false;
            isSigner: false;
          },
          {
            name: "associatedTokenProgram";
            isMut: false;
            isSigner: false;
          },
          {
            name: "eventAuthority";
            isMut: false;
            isSigner: false;
          },
          {
            name: "program";
            isMut: false;
            isSigner: false;
          },
        ];
        args: [
          {
            name: "params";
            type: {
              defined: "InitializeDaoParams";
            };
          },
        ];
      },
      {
        name: "initializeProposal";
        accounts: [
          {
            name: "proposal";
            isMut: true;
            isSigner: false;
          },
          {
            name: "squadsProposal";
            isMut: false;
            isSigner: false;
          },
          {
            name: "dao";
            isMut: true;
            isSigner: false;
          },
          {
            name: "question";
            isMut: false;
            isSigner: false;
          },
          {
            name: "quoteVault";
            isMut: false;
            isSigner: false;
          },
          {
            name: "baseVault";
            isMut: false;
            isSigner: false;
          },
          {
            name: "proposer";
            isMut: false;
            isSigner: true;
          },
          {
            name: "payer";
            isMut: true;
            isSigner: true;
          },
          {
            name: "systemProgram";
            isMut: false;
            isSigner: false;
          },
          {
            name: "eventAuthority";
            isMut: false;
            isSigner: false;
          },
          {
            name: "program";
            isMut: false;
            isSigner: false;
          },
        ];
        args: [];
      },
      {
        name: "stakeToProposal";
        accounts: [
          {
            name: "proposal";
            isMut: true;
            isSigner: false;
          },
          {
            name: "dao";
            isMut: true;
            isSigner: false;
          },
          {
            name: "stakerBaseAccount";
            isMut: true;
            isSigner: false;
          },
          {
            name: "proposalBaseAccount";
            isMut: true;
            isSigner: false;
          },
          {
            name: "stakeAccount";
            isMut: true;
            isSigner: false;
          },
          {
            name: "staker";
            isMut: false;
            isSigner: true;
          },
          {
            name: "payer";
            isMut: true;
            isSigner: true;
          },
          {
            name: "tokenProgram";
            isMut: false;
            isSigner: false;
          },
          {
            name: "associatedTokenProgram";
            isMut: false;
            isSigner: false;
          },
          {
            name: "systemProgram";
            isMut: false;
            isSigner: false;
          },
          {
            name: "eventAuthority";
            isMut: false;
            isSigner: false;
          },
          {
            name: "program";
            isMut: false;
            isSigner: false;
          },
        ];
        args: [
          {
            name: "params";
            type: {
              defined: "StakeToProposalParams";
            };
          },
        ];
      },
      {
        name: "unstakeFromProposal";
        accounts: [
          {
            name: "proposal";
            isMut: true;
            isSigner: false;
          },
          {
            name: "dao";
            isMut: true;
            isSigner: false;
          },
          {
            name: "stakerBaseAccount";
            isMut: true;
            isSigner: false;
          },
          {
            name: "proposalBaseAccount";
            isMut: true;
            isSigner: false;
          },
          {
            name: "stakeAccount";
            isMut: true;
            isSigner: false;
          },
          {
            name: "staker";
            isMut: false;
            isSigner: true;
          },
          {
            name: "tokenProgram";
            isMut: false;
            isSigner: false;
          },
          {
            name: "associatedTokenProgram";
            isMut: false;
            isSigner: false;
          },
          {
            name: "eventAuthority";
            isMut: false;
            isSigner: false;
          },
          {
            name: "program";
            isMut: false;
            isSigner: false;
          },
        ];
        args: [
          {
            name: "params";
            type: {
              defined: "UnstakeFromProposalParams";
            };
          },
        ];
      },
      {
        name: "launchProposal";
        accounts: [
          {
            name: "proposal";
            isMut: true;
            isSigner: false;
          },
          {
            name: "baseVault";
            isMut: false;
            isSigner: false;
          },
          {
            name: "quoteVault";
            isMut: false;
            isSigner: false;
          },
          {
            name: "passBaseMint";
            isMut: false;
            isSigner: false;
          },
          {
            name: "passQuoteMint";
            isMut: false;
            isSigner: false;
          },
          {
            name: "failBaseMint";
            isMut: false;
            isSigner: false;
          },
          {
            name: "failQuoteMint";
            isMut: false;
            isSigner: false;
          },
          {
            name: "dao";
            isMut: true;
            isSigner: false;
          },
          {
            name: "payer";
            isMut: true;
            isSigner: true;
          },
          {
            name: "ammPassBaseVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "ammPassQuoteVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "ammFailBaseVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "ammFailQuoteVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "systemProgram";
            isMut: false;
            isSigner: false;
          },
          {
            name: "tokenProgram";
            isMut: false;
            isSigner: false;
          },
          {
            name: "associatedTokenProgram";
            isMut: false;
            isSigner: false;
          },
          {
            name: "eventAuthority";
            isMut: false;
            isSigner: false;
          },
          {
            name: "program";
            isMut: false;
            isSigner: false;
          },
        ];
        args: [];
      },
      {
        name: "finalizeProposal";
        accounts: [
          {
            name: "proposal";
            isMut: true;
            isSigner: false;
          },
          {
            name: "dao";
            isMut: true;
            isSigner: false;
          },
          {
            name: "question";
            isMut: true;
            isSigner: false;
          },
          {
            name: "squadsProposal";
            isMut: true;
            isSigner: false;
          },
          {
            name: "squadsMultisig";
            isMut: false;
            isSigner: false;
          },
          {
            name: "squadsMultisigProgram";
            isMut: false;
            isSigner: false;
          },
          {
            name: "ammPassBaseVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "ammPassQuoteVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "ammFailBaseVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "ammFailQuoteVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "ammBaseVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "ammQuoteVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "vaultProgram";
            isMut: false;
            isSigner: false;
          },
          {
            name: "vaultEventAuthority";
            isMut: false;
            isSigner: false;
          },
          {
            name: "tokenProgram";
            isMut: false;
            isSigner: false;
          },
          {
            name: "quoteVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "quoteVaultUnderlyingTokenAccount";
            isMut: true;
            isSigner: false;
          },
          {
            name: "passQuoteMint";
            isMut: true;
            isSigner: false;
          },
          {
            name: "failQuoteMint";
            isMut: true;
            isSigner: false;
          },
          {
            name: "passBaseMint";
            isMut: true;
            isSigner: false;
          },
          {
            name: "failBaseMint";
            isMut: true;
            isSigner: false;
          },
          {
            name: "baseVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "baseVaultUnderlyingTokenAccount";
            isMut: true;
            isSigner: false;
          },
          {
            name: "eventAuthority";
            isMut: false;
            isSigner: false;
          },
          {
            name: "program";
            isMut: false;
            isSigner: false;
          },
        ];
        args: [];
      },
      {
        name: "updateDao";
        accounts: [
          {
            name: "dao";
            isMut: true;
            isSigner: false;
          },
          {
            name: "squadsMultisigVault";
            isMut: false;
            isSigner: true;
          },
          {
            name: "eventAuthority";
            isMut: false;
            isSigner: false;
          },
          {
            name: "program";
            isMut: false;
            isSigner: false;
          },
        ];
        args: [
          {
            name: "daoParams";
            type: {
              defined: "UpdateDaoParams";
            };
          },
        ];
      },
      {
        name: "spotSwap";
        accounts: [
          {
            name: "dao";
            isMut: true;
            isSigner: false;
          },
          {
            name: "userBaseAccount";
            isMut: true;
            isSigner: false;
          },
          {
            name: "userQuoteAccount";
            isMut: true;
            isSigner: false;
          },
          {
            name: "ammBaseVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "ammQuoteVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "user";
            isMut: false;
            isSigner: true;
          },
          {
            name: "tokenProgram";
            isMut: false;
            isSigner: false;
          },
          {
            name: "eventAuthority";
            isMut: false;
            isSigner: false;
          },
          {
            name: "program";
            isMut: false;
            isSigner: false;
          },
        ];
        args: [
          {
            name: "params";
            type: {
              defined: "SpotSwapParams";
            };
          },
        ];
      },
      {
        name: "conditionalSwap";
        accounts: [
          {
            name: "dao";
            isMut: true;
            isSigner: false;
          },
          {
            name: "ammBaseVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "ammQuoteVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "proposal";
            isMut: false;
            isSigner: false;
          },
          {
            name: "ammPassBaseVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "ammPassQuoteVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "ammFailBaseVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "ammFailQuoteVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "trader";
            isMut: false;
            isSigner: true;
          },
          {
            name: "userInputAccount";
            isMut: true;
            isSigner: false;
          },
          {
            name: "userOutputAccount";
            isMut: true;
            isSigner: false;
          },
          {
            name: "baseVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "baseVaultUnderlyingTokenAccount";
            isMut: true;
            isSigner: false;
          },
          {
            name: "quoteVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "quoteVaultUnderlyingTokenAccount";
            isMut: true;
            isSigner: false;
          },
          {
            name: "passBaseMint";
            isMut: true;
            isSigner: false;
          },
          {
            name: "failBaseMint";
            isMut: true;
            isSigner: false;
          },
          {
            name: "passQuoteMint";
            isMut: true;
            isSigner: false;
          },
          {
            name: "failQuoteMint";
            isMut: true;
            isSigner: false;
          },
          {
            name: "conditionalVaultProgram";
            isMut: false;
            isSigner: false;
          },
          {
            name: "vaultEventAuthority";
            isMut: false;
            isSigner: false;
          },
          {
            name: "question";
            isMut: false;
            isSigner: false;
          },
          {
            name: "tokenProgram";
            isMut: false;
            isSigner: false;
          },
          {
            name: "eventAuthority";
            isMut: false;
            isSigner: false;
          },
          {
            name: "program";
            isMut: false;
            isSigner: false;
          },
        ];
        args: [
          {
            name: "params";
            type: {
              defined: "ConditionalSwapParams";
            };
          },
        ];
      },
      {
        name: "provideLiquidity";
        accounts: [
          {
            name: "dao";
            isMut: true;
            isSigner: false;
          },
          {
            name: "liquidityProvider";
            isMut: false;
            isSigner: true;
          },
          {
            name: "liquidityProviderBaseAccount";
            isMut: true;
            isSigner: false;
          },
          {
            name: "liquidityProviderQuoteAccount";
            isMut: true;
            isSigner: false;
          },
          {
            name: "payer";
            isMut: true;
            isSigner: true;
          },
          {
            name: "systemProgram";
            isMut: false;
            isSigner: false;
          },
          {
            name: "ammBaseVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "ammQuoteVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "ammPosition";
            isMut: true;
            isSigner: false;
          },
          {
            name: "tokenProgram";
            isMut: false;
            isSigner: false;
          },
          {
            name: "eventAuthority";
            isMut: false;
            isSigner: false;
          },
          {
            name: "program";
            isMut: false;
            isSigner: false;
          },
        ];
        args: [
          {
            name: "params";
            type: {
              defined: "ProvideLiquidityParams";
            };
          },
        ];
      },
      {
        name: "withdrawLiquidity";
        accounts: [
          {
            name: "dao";
            isMut: true;
            isSigner: false;
          },
          {
            name: "positionAuthority";
            isMut: false;
            isSigner: true;
          },
          {
            name: "liquidityProviderBaseAccount";
            isMut: true;
            isSigner: false;
          },
          {
            name: "liquidityProviderQuoteAccount";
            isMut: true;
            isSigner: false;
          },
          {
            name: "ammBaseVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "ammQuoteVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "ammPosition";
            isMut: true;
            isSigner: false;
          },
          {
            name: "tokenProgram";
            isMut: false;
            isSigner: false;
          },
          {
            name: "eventAuthority";
            isMut: false;
            isSigner: false;
          },
          {
            name: "program";
            isMut: false;
            isSigner: false;
          },
        ];
        args: [
          {
            name: "params";
            type: {
              defined: "WithdrawLiquidityParams";
            };
          },
        ];
      },
      {
        name: "collectFees";
        accounts: [
          {
            name: "dao";
            isMut: true;
            isSigner: false;
          },
          {
            name: "admin";
            isMut: false;
            isSigner: true;
          },
          {
            name: "baseTokenAccount";
            isMut: true;
            isSigner: false;
          },
          {
            name: "quoteTokenAccount";
            isMut: true;
            isSigner: false;
          },
          {
            name: "ammBaseVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "ammQuoteVault";
            isMut: true;
            isSigner: false;
          },
          {
            name: "tokenProgram";
            isMut: false;
            isSigner: false;
          },
          {
            name: "eventAuthority";
            isMut: false;
            isSigner: false;
          },
          {
            name: "program";
            isMut: false;
            isSigner: false;
          },
        ];
        args: [];
      },
      {
        name: "executeSpendingLimitChange";
        accounts: [
          {
            name: "proposal";
            isMut: true;
            isSigner: false;
          },
          {
            name: "dao";
            isMut: true;
            isSigner: false;
          },
          {
            name: "squadsProposal";
            isMut: true;
            isSigner: false;
          },
          {
            name: "squadsMultisig";
            isMut: false;
            isSigner: false;
          },
          {
            name: "squadsMultisigProgram";
            isMut: false;
            isSigner: false;
          },
          {
            name: "vaultTransaction";
            isMut: false;
            isSigner: false;
          },
          {
            name: "eventAuthority";
            isMut: false;
            isSigner: false;
          },
          {
            name: "program";
            isMut: false;
            isSigner: false;
          },
        ];
        args: [];
      },
    ];
    accounts: [
      {
        name: "ammPosition";
        type: {
          kind: "struct";
          fields: [
            {
              name: "dao";
              type: "publicKey";
            },
            {
              name: "positionAuthority";
              type: "publicKey";
            },
            {
              name: "liquidity";
              type: "u128";
            },
          ];
        };
      },
      {
        name: "dao";
        type: {
          kind: "struct";
          fields: [
            {
              name: "amm";
              docs: ["Embedded FutarchyAmm - 1:1 relationship"];
              type: {
                defined: "FutarchyAmm";
              };
            },
            {
              name: "nonce";
              docs: ["`nonce` + `dao_creator` are PDA seeds"];
              type: "u64";
            },
            {
              name: "daoCreator";
              type: "publicKey";
            },
            {
              name: "pdaBump";
              type: "u8";
            },
            {
              name: "squadsMultisig";
              type: "publicKey";
            },
            {
              name: "squadsMultisigVault";
              type: "publicKey";
            },
            {
              name: "baseMint";
              type: "publicKey";
            },
            {
              name: "quoteMint";
              type: "publicKey";
            },
            {
              name: "proposalCount";
              type: "u32";
            },
            {
              name: "passThresholdBps";
              type: "u16";
            },
            {
              name: "secondsPerProposal";
              type: "u32";
            },
            {
              name: "twapInitialObservation";
              docs: [
                "For manipulation-resistance the TWAP is a time-weighted average observation,",
                "where observation tries to approximate price but can only move by",
                "`twap_max_observation_change_per_update` per update. Because it can only move",
                "a little bit per update, you need to check that it has a good initial observation.",
                "Otherwise, an attacker could create a very high initial observation in the pass",
                "market and a very low one in the fail market to force the proposal to pass.",
                "",
                "We recommend setting an initial observation around the spot price of the token,",
                "and max observation change per update around 2% the spot price of the token.",
                "For example, if the spot price of META is $400, we'd recommend setting an initial",
                "observation of 400 (converted into the AMM prices) and a max observation change per",
                "update of 8 (also converted into the AMM prices). Observations can be updated once",
                "a minute, so 2% allows the proposal market to reach double the spot price or 0",
                "in 50 minutes.",
              ];
              type: "u128";
            },
            {
              name: "twapMaxObservationChangePerUpdate";
              type: "u128";
            },
            {
              name: "twapStartDelaySeconds";
              docs: [
                "Forces TWAP calculation to start after `twap_start_delay_seconds` seconds",
              ];
              type: "u32";
            },
            {
              name: "minQuoteFutarchicLiquidity";
              docs: [
                "As an anti-spam measure and to help liquidity, you need to lock up some liquidity",
                "in both futarchic markets in order to create a proposal.",
                "",
                "For example, for META, we can use a `min_quote_futarchic_liquidity` of",
                "5000 * 1_000_000 (5000 USDC) and a `min_base_futarchic_liquidity` of",
                "10 * 1_000_000_000 (10 META).",
              ];
              type: "u64";
            },
            {
              name: "minBaseFutarchicLiquidity";
              type: "u64";
            },
            {
              name: "baseToStake";
              docs: [
                "Minimum amount of base tokens that must be staked to launch a proposal",
              ];
              type: "u64";
            },
            {
              name: "seqNum";
              type: "u64";
            },
            {
              name: "initialSpendingLimit";
              type: {
                option: {
                  defined: "InitialSpendingLimit";
                };
              };
            },
          ];
        };
      },
      {
        name: "proposal";
        type: {
          kind: "struct";
          fields: [
            {
              name: "number";
              type: "u32";
            },
            {
              name: "proposer";
              type: "publicKey";
            },
            {
              name: "timestampEnqueued";
              type: "i64";
            },
            {
              name: "state";
              type: {
                defined: "ProposalState";
              };
            },
            {
              name: "baseVault";
              type: "publicKey";
            },
            {
              name: "quoteVault";
              type: "publicKey";
            },
            {
              name: "dao";
              type: "publicKey";
            },
            {
              name: "pdaBump";
              type: "u8";
            },
            {
              name: "question";
              type: "publicKey";
            },
            {
              name: "durationInSeconds";
              type: "u32";
            },
            {
              name: "squadsProposal";
              type: "publicKey";
            },
            {
              name: "passBaseMint";
              type: "publicKey";
            },
            {
              name: "passQuoteMint";
              type: "publicKey";
            },
            {
              name: "failBaseMint";
              type: "publicKey";
            },
            {
              name: "failQuoteMint";
              type: "publicKey";
            },
          ];
        };
      },
      {
        name: "stakeAccount";
        type: {
          kind: "struct";
          fields: [
            {
              name: "proposal";
              type: "publicKey";
            },
            {
              name: "staker";
              type: "publicKey";
            },
            {
              name: "amount";
              type: "u64";
            },
            {
              name: "bump";
              type: "u8";
            },
          ];
        };
      },
    ];
    types: [
      {
        name: "CommonFields";
        type: {
          kind: "struct";
          fields: [
            {
              name: "slot";
              type: "u64";
            },
            {
              name: "unixTimestamp";
              type: "i64";
            },
            {
              name: "daoSeqNum";
              type: "u64";
            },
          ];
        };
      },
      {
        name: "ConditionalSwapParams";
        type: {
          kind: "struct";
          fields: [
            {
              name: "market";
              type: {
                defined: "Market";
              };
            },
            {
              name: "swapType";
              type: {
                defined: "SwapType";
              };
            },
            {
              name: "inputAmount";
              type: "u64";
            },
            {
              name: "minOutputAmount";
              type: "u64";
            },
          ];
        };
      },
      {
        name: "InitializeDaoParams";
        type: {
          kind: "struct";
          fields: [
            {
              name: "twapInitialObservation";
              type: "u128";
            },
            {
              name: "twapMaxObservationChangePerUpdate";
              type: "u128";
            },
            {
              name: "twapStartDelaySeconds";
              type: "u32";
            },
            {
              name: "minQuoteFutarchicLiquidity";
              type: "u64";
            },
            {
              name: "minBaseFutarchicLiquidity";
              type: "u64";
            },
            {
              name: "baseToStake";
              type: "u64";
            },
            {
              name: "passThresholdBps";
              type: "u16";
            },
            {
              name: "secondsPerProposal";
              type: "u32";
            },
            {
              name: "nonce";
              type: "u64";
            },
            {
              name: "initialSpendingLimit";
              type: {
                option: {
                  defined: "InitialSpendingLimit";
                };
              };
            },
          ];
        };
      },
      {
        name: "ProvideLiquidityParams";
        type: {
          kind: "struct";
          fields: [
            {
              name: "quoteAmount";
              docs: ["How much quote token you will deposit to the pool"];
              type: "u64";
            },
            {
              name: "maxBaseAmount";
              docs: ["The maximum base token you will deposit to the pool"];
              type: "u64";
            },
            {
              name: "minLiquidity";
              docs: ["The minimum liquidity you will be assigned"];
              type: "u128";
            },
            {
              name: "positionAuthority";
              docs: [
                "The account that will own the LP position, usually the same as the",
                "liquidity provider",
              ];
              type: "publicKey";
            },
          ];
        };
      },
      {
        name: "SpotSwapParams";
        type: {
          kind: "struct";
          fields: [
            {
              name: "inputAmount";
              type: "u64";
            },
            {
              name: "swapType";
              type: {
                defined: "SwapType";
              };
            },
            {
              name: "minOutputAmount";
              type: "u64";
            },
          ];
        };
      },
      {
        name: "StakeToProposalParams";
        type: {
          kind: "struct";
          fields: [
            {
              name: "amount";
              type: "u64";
            },
          ];
        };
      },
      {
        name: "UnstakeFromProposalParams";
        type: {
          kind: "struct";
          fields: [
            {
              name: "amount";
              type: "u64";
            },
          ];
        };
      },
      {
        name: "UpdateDaoParams";
        type: {
          kind: "struct";
          fields: [
            {
              name: "passThresholdBps";
              type: {
                option: "u16";
              };
            },
            {
              name: "secondsPerProposal";
              type: {
                option: "u32";
              };
            },
            {
              name: "twapInitialObservation";
              type: {
                option: "u128";
              };
            },
            {
              name: "twapMaxObservationChangePerUpdate";
              type: {
                option: "u128";
              };
            },
            {
              name: "minQuoteFutarchicLiquidity";
              type: {
                option: "u64";
              };
            },
            {
              name: "minBaseFutarchicLiquidity";
              type: {
                option: "u64";
              };
            },
            {
              name: "baseToStake";
              type: {
                option: "u64";
              };
            },
          ];
        };
      },
      {
        name: "WithdrawLiquidityParams";
        type: {
          kind: "struct";
          fields: [
            {
              name: "liquidityToWithdraw";
              docs: ["How much liquidity to withdraw"];
              type: "u128";
            },
            {
              name: "minBaseAmount";
              docs: ["Minimum base tokens to receive"];
              type: "u64";
            },
            {
              name: "minQuoteAmount";
              docs: ["Minimum quote tokens to receive"];
              type: "u64";
            },
          ];
        };
      },
      {
        name: "InitialSpendingLimit";
        type: {
          kind: "struct";
          fields: [
            {
              name: "amountPerMonth";
              type: "u64";
            },
            {
              name: "members";
              type: {
                vec: "publicKey";
              };
            },
          ];
        };
      },
      {
        name: "FutarchyAmm";
        type: {
          kind: "struct";
          fields: [
            {
              name: "state";
              type: {
                defined: "PoolState";
              };
            },
            {
              name: "totalLiquidity";
              type: "u128";
            },
            {
              name: "baseMint";
              type: "publicKey";
            },
            {
              name: "quoteMint";
              type: "publicKey";
            },
            {
              name: "ammBaseVault";
              type: "publicKey";
            },
            {
              name: "ammQuoteVault";
              type: "publicKey";
            },
          ];
        };
      },
      {
        name: "TwapOracle";
        type: {
          kind: "struct";
          fields: [
            {
              name: "aggregator";
              docs: [
                "Running sum of slots_per_last_update * last_observation.",
                "",
                "Assuming latest observations are as big as possible (u64::MAX * 1e12),",
                "we can store 18 million slots worth of observations, which turns out to",
                "be ~85 days worth of slots.",
                "",
                "Assuming that latest observations are 100x smaller than they could theoretically",
                "be, we can store 8500 days (23 years) worth of them. Even this is a very",
                "very conservative assumption - META/USDC prices should be between 1e9 and",
                "1e15, which would overflow after 1e15 years worth of slots.",
                "",
                "So in the case of an overflow, the aggregator rolls back to 0. It's the",
                "client's responsibility to sanity check the assets or to handle an",
                "aggregator at T2 being smaller than an aggregator at T1.",
              ];
              type: "u128";
            },
            {
              name: "lastUpdatedTimestamp";
              type: "i64";
            },
            {
              name: "createdAtTimestamp";
              type: "i64";
            },
            {
              name: "lastPrice";
              docs: [
                "A price is the number of quote units per base unit multiplied by 1e12.",
                "You cannot simply divide by 1e12 to get a price you can display in the UI",
                "because the base and quote decimals may be different. Instead, do:",
                "ui_price = (price * (10**(base_decimals - quote_decimals))) / 1e12",
              ];
              type: "u128";
            },
            {
              name: "lastObservation";
              docs: [
                "If we did a raw TWAP over prices, someone could push the TWAP heavily with",
                "a few extremely large outliers. So we use observations, which can only move",
                "by `max_observation_change_per_update` per update.",
              ];
              type: "u128";
            },
            {
              name: "maxObservationChangePerUpdate";
              docs: ["The most that an observation can change per update."];
              type: "u128";
            },
            {
              name: "initialObservation";
              docs: ["What the initial `latest_observation` is set to."];
              type: "u128";
            },
            {
              name: "startDelaySeconds";
              docs: [
                "Number of seconds after amm.created_at_slot to start recording TWAP",
              ];
              type: "u32";
            },
          ];
        };
      },
      {
        name: "Pool";
        type: {
          kind: "struct";
          fields: [
            {
              name: "oracle";
              type: {
                defined: "TwapOracle";
              };
            },
            {
              name: "quoteReserves";
              type: "u64";
            },
            {
              name: "baseReserves";
              type: "u64";
            },
            {
              name: "quoteProtocolFeeBalance";
              type: "u64";
            },
            {
              name: "baseProtocolFeeBalance";
              type: "u64";
            },
          ];
        };
      },
      {
        name: "PoolState";
        type: {
          kind: "enum";
          variants: [
            {
              name: "Spot";
              fields: [
                {
                  name: "spot";
                  type: {
                    defined: "Pool";
                  };
                },
              ];
            },
            {
              name: "Futarchy";
              fields: [
                {
                  name: "spot";
                  type: {
                    defined: "Pool";
                  };
                },
                {
                  name: "pass";
                  type: {
                    defined: "Pool";
                  };
                },
                {
                  name: "fail";
                  type: {
                    defined: "Pool";
                  };
                },
              ];
            },
          ];
        };
      },
      {
        name: "Market";
        type: {
          kind: "enum";
          variants: [
            {
              name: "Spot";
            },
            {
              name: "Pass";
            },
            {
              name: "Fail";
            },
          ];
        };
      },
      {
        name: "SwapType";
        type: {
          kind: "enum";
          variants: [
            {
              name: "Buy";
            },
            {
              name: "Sell";
            },
          ];
        };
      },
      {
        name: "Token";
        type: {
          kind: "enum";
          variants: [
            {
              name: "Base";
            },
            {
              name: "Quote";
            },
          ];
        };
      },
      {
        name: "ProposalState";
        type: {
          kind: "enum";
          variants: [
            {
              name: "Draft";
              fields: [
                {
                  name: "amountStaked";
                  type: "u64";
                },
              ];
            },
            {
              name: "Pending";
            },
            {
              name: "Passed";
            },
            {
              name: "Failed";
            },
          ];
        };
      },
    ];
    events: [
      {
        name: "CollectFeesEvent";
        fields: [
          {
            name: "common";
            type: {
              defined: "CommonFields";
            };
            index: false;
          },
          {
            name: "dao";
            type: "publicKey";
            index: false;
          },
          {
            name: "baseTokenAccount";
            type: "publicKey";
            index: false;
          },
          {
            name: "quoteTokenAccount";
            type: "publicKey";
            index: false;
          },
          {
            name: "ammBaseVault";
            type: "publicKey";
            index: false;
          },
          {
            name: "ammQuoteVault";
            type: "publicKey";
            index: false;
          },
          {
            name: "quoteMint";
            type: "publicKey";
            index: false;
          },
          {
            name: "baseMint";
            type: "publicKey";
            index: false;
          },
          {
            name: "quoteFeesCollected";
            type: "u64";
            index: false;
          },
          {
            name: "baseFeesCollected";
            type: "u64";
            index: false;
          },
          {
            name: "postAmmState";
            type: {
              defined: "FutarchyAmm";
            };
            index: false;
          },
        ];
      },
      {
        name: "InitializeDaoEvent";
        fields: [
          {
            name: "common";
            type: {
              defined: "CommonFields";
            };
            index: false;
          },
          {
            name: "dao";
            type: "publicKey";
            index: false;
          },
          {
            name: "baseMint";
            type: "publicKey";
            index: false;
          },
          {
            name: "quoteMint";
            type: "publicKey";
            index: false;
          },
          {
            name: "passThresholdBps";
            type: "u16";
            index: false;
          },
          {
            name: "secondsPerProposal";
            type: "u32";
            index: false;
          },
          {
            name: "twapInitialObservation";
            type: "u128";
            index: false;
          },
          {
            name: "twapMaxObservationChangePerUpdate";
            type: "u128";
            index: false;
          },
          {
            name: "minQuoteFutarchicLiquidity";
            type: "u64";
            index: false;
          },
          {
            name: "minBaseFutarchicLiquidity";
            type: "u64";
            index: false;
          },
          {
            name: "baseToStake";
            type: "u64";
            index: false;
          },
          {
            name: "initialSpendingLimit";
            type: {
              option: {
                defined: "InitialSpendingLimit";
              };
            };
            index: false;
          },
          {
            name: "squadsMultisig";
            type: "publicKey";
            index: false;
          },
          {
            name: "squadsMultisigVault";
            type: "publicKey";
            index: false;
          },
        ];
      },
      {
        name: "UpdateDaoEvent";
        fields: [
          {
            name: "common";
            type: {
              defined: "CommonFields";
            };
            index: false;
          },
          {
            name: "dao";
            type: "publicKey";
            index: false;
          },
          {
            name: "passThresholdBps";
            type: "u16";
            index: false;
          },
          {
            name: "secondsPerProposal";
            type: "u32";
            index: false;
          },
          {
            name: "twapInitialObservation";
            type: "u128";
            index: false;
          },
          {
            name: "twapMaxObservationChangePerUpdate";
            type: "u128";
            index: false;
          },
          {
            name: "minQuoteFutarchicLiquidity";
            type: "u64";
            index: false;
          },
          {
            name: "minBaseFutarchicLiquidity";
            type: "u64";
            index: false;
          },
          {
            name: "baseToStake";
            type: "u64";
            index: false;
          },
        ];
      },
      {
        name: "InitializeProposalEvent";
        fields: [
          {
            name: "common";
            type: {
              defined: "CommonFields";
            };
            index: false;
          },
          {
            name: "proposal";
            type: "publicKey";
            index: false;
          },
          {
            name: "dao";
            type: "publicKey";
            index: false;
          },
          {
            name: "question";
            type: "publicKey";
            index: false;
          },
          {
            name: "quoteVault";
            type: "publicKey";
            index: false;
          },
          {
            name: "baseVault";
            type: "publicKey";
            index: false;
          },
          {
            name: "proposer";
            type: "publicKey";
            index: false;
          },
          {
            name: "number";
            type: "u32";
            index: false;
          },
          {
            name: "pdaBump";
            type: "u8";
            index: false;
          },
          {
            name: "durationInSeconds";
            type: "u32";
            index: false;
          },
          {
            name: "squadsProposal";
            type: "publicKey";
            index: false;
          },
          {
            name: "squadsMultisig";
            type: "publicKey";
            index: false;
          },
          {
            name: "squadsMultisigVault";
            type: "publicKey";
            index: false;
          },
        ];
      },
      {
        name: "StakeToProposalEvent";
        fields: [
          {
            name: "common";
            type: {
              defined: "CommonFields";
            };
            index: false;
          },
          {
            name: "proposal";
            type: "publicKey";
            index: false;
          },
          {
            name: "staker";
            type: "publicKey";
            index: false;
          },
          {
            name: "amount";
            type: "u64";
            index: false;
          },
          {
            name: "totalStaked";
            type: "u64";
            index: false;
          },
        ];
      },
      {
        name: "UnstakeFromProposalEvent";
        fields: [
          {
            name: "common";
            type: {
              defined: "CommonFields";
            };
            index: false;
          },
          {
            name: "proposal";
            type: "publicKey";
            index: false;
          },
          {
            name: "staker";
            type: "publicKey";
            index: false;
          },
          {
            name: "amount";
            type: "u64";
            index: false;
          },
          {
            name: "totalStaked";
            type: "u64";
            index: false;
          },
        ];
      },
      {
        name: "LaunchProposalEvent";
        fields: [
          {
            name: "common";
            type: {
              defined: "CommonFields";
            };
            index: false;
          },
          {
            name: "proposal";
            type: "publicKey";
            index: false;
          },
          {
            name: "dao";
            type: "publicKey";
            index: false;
          },
          {
            name: "totalStaked";
            type: "u64";
            index: false;
          },
          {
            name: "postAmmState";
            type: {
              defined: "FutarchyAmm";
            };
            index: false;
          },
        ];
      },
      {
        name: "FinalizeProposalEvent";
        fields: [
          {
            name: "common";
            type: {
              defined: "CommonFields";
            };
            index: false;
          },
          {
            name: "proposal";
            type: "publicKey";
            index: false;
          },
          {
            name: "dao";
            type: "publicKey";
            index: false;
          },
          {
            name: "passMarketTwap";
            type: "u128";
            index: false;
          },
          {
            name: "failMarketTwap";
            type: "u128";
            index: false;
          },
          {
            name: "threshold";
            type: "u128";
            index: false;
          },
          {
            name: "state";
            type: {
              defined: "ProposalState";
            };
            index: false;
          },
          {
            name: "squadsProposal";
            type: "publicKey";
            index: false;
          },
          {
            name: "squadsMultisig";
            type: "publicKey";
            index: false;
          },
          {
            name: "postAmmState";
            type: {
              defined: "FutarchyAmm";
            };
            index: false;
          },
        ];
      },
      {
        name: "SpotSwapEvent";
        fields: [
          {
            name: "common";
            type: {
              defined: "CommonFields";
            };
            index: false;
          },
          {
            name: "dao";
            type: "publicKey";
            index: false;
          },
          {
            name: "user";
            type: "publicKey";
            index: false;
          },
          {
            name: "swapType";
            type: {
              defined: "SwapType";
            };
            index: false;
          },
          {
            name: "inputAmount";
            type: "u64";
            index: false;
          },
          {
            name: "outputAmount";
            type: "u64";
            index: false;
          },
          {
            name: "minOutputAmount";
            type: "u64";
            index: false;
          },
          {
            name: "postAmmState";
            type: {
              defined: "FutarchyAmm";
            };
            index: false;
          },
        ];
      },
      {
        name: "ConditionalSwapEvent";
        fields: [
          {
            name: "common";
            type: {
              defined: "CommonFields";
            };
            index: false;
          },
          {
            name: "dao";
            type: "publicKey";
            index: false;
          },
          {
            name: "proposal";
            type: "publicKey";
            index: false;
          },
          {
            name: "trader";
            type: "publicKey";
            index: false;
          },
          {
            name: "market";
            type: {
              defined: "Market";
            };
            index: false;
          },
          {
            name: "swapType";
            type: {
              defined: "SwapType";
            };
            index: false;
          },
          {
            name: "inputAmount";
            type: "u64";
            index: false;
          },
          {
            name: "outputAmount";
            type: "u64";
            index: false;
          },
          {
            name: "minOutputAmount";
            type: "u64";
            index: false;
          },
          {
            name: "postAmmState";
            type: {
              defined: "FutarchyAmm";
            };
            index: false;
          },
        ];
      },
      {
        name: "ProvideLiquidityEvent";
        fields: [
          {
            name: "common";
            type: {
              defined: "CommonFields";
            };
            index: false;
          },
          {
            name: "dao";
            type: "publicKey";
            index: false;
          },
          {
            name: "liquidityProvider";
            type: "publicKey";
            index: false;
          },
          {
            name: "positionAuthority";
            type: "publicKey";
            index: false;
          },
          {
            name: "quoteAmount";
            type: "u64";
            index: false;
          },
          {
            name: "baseAmount";
            type: "u64";
            index: false;
          },
          {
            name: "liquidityMinted";
            type: "u128";
            index: false;
          },
          {
            name: "minLiquidity";
            type: "u128";
            index: false;
          },
          {
            name: "postAmmState";
            type: {
              defined: "FutarchyAmm";
            };
            index: false;
          },
        ];
      },
      {
        name: "WithdrawLiquidityEvent";
        fields: [
          {
            name: "common";
            type: {
              defined: "CommonFields";
            };
            index: false;
          },
          {
            name: "dao";
            type: "publicKey";
            index: false;
          },
          {
            name: "liquidityProvider";
            type: "publicKey";
            index: false;
          },
          {
            name: "liquidityWithdrawn";
            type: "u128";
            index: false;
          },
          {
            name: "minBaseAmount";
            type: "u64";
            index: false;
          },
          {
            name: "minQuoteAmount";
            type: "u64";
            index: false;
          },
          {
            name: "baseAmount";
            type: "u64";
            index: false;
          },
          {
            name: "quoteAmount";
            type: "u64";
            index: false;
          },
          {
            name: "postAmmState";
            type: {
              defined: "FutarchyAmm";
            };
            index: false;
          },
        ];
      },
    ];
    errors: [
      {
        code: 6000;
        name: "AmmTooOld";
        msg: "Amms must have been created within 5 minutes (counted in slots) of proposal initialization";
      },
      {
        code: 6001;
        name: "InvalidInitialObservation";
        msg: "An amm has an `initial_observation` that doesn't match the `dao`'s config";
      },
      {
        code: 6002;
        name: "InvalidMaxObservationChange";
        msg: "An amm has a `max_observation_change_per_update` that doesn't match the `dao`'s config";
      },
      {
        code: 6003;
        name: "InvalidStartDelaySlots";
        msg: "An amm has a `start_delay_slots` that doesn't match the `dao`'s config";
      },
      {
        code: 6004;
        name: "InvalidSettlementAuthority";
        msg: "One of the vaults has an invalid `settlement_authority`";
      },
      {
        code: 6005;
        name: "ProposalTooYoung";
        msg: "Proposal is too young to be executed or rejected";
      },
      {
        code: 6006;
        name: "MarketsTooYoung";
        msg: "Markets too young for proposal to be finalized. TWAP might need to be cranked";
      },
      {
        code: 6007;
        name: "ProposalAlreadyFinalized";
        msg: "This proposal has already been finalized";
      },
      {
        code: 6008;
        name: "InvalidVaultNonce";
        msg: "A conditional vault has an invalid nonce. A nonce should encode the proposal number";
      },
      {
        code: 6009;
        name: "ProposalNotPassed";
        msg: "This proposal can't be executed because it isn't in the passed state";
      },
      {
        code: 6010;
        name: "InsufficientLiquidity";
        msg: "More liquidity needs to be in the AMM to launch this proposal";
      },
      {
        code: 6011;
        name: "ProposalDurationTooShort";
        msg: "Proposal duration must be longer 1 day and longer than 2 times the TWAP start delay";
      },
      {
        code: 6012;
        name: "PassThresholdTooHigh";
        msg: "Pass threshold must be less than 10%";
      },
      {
        code: 6013;
        name: "QuestionMustBeBinary";
        msg: "Question must have exactly 2 outcomes for binary futarchy";
      },
      {
        code: 6014;
        name: "InvalidSquadsProposalStatus";
        msg: "Squads proposal must be in Draft status";
      },
      {
        code: 6015;
        name: "CastingOverflow";
        msg: "Casting overflow. If you're seeing this, please report this";
      },
      {
        code: 6016;
        name: "InsufficientBalance";
        msg: "Insufficient balance";
      },
      {
        code: 6017;
        name: "ZeroLiquidityRemove";
        msg: "Cannot remove zero liquidity";
      },
      {
        code: 6018;
        name: "SwapSlippageExceeded";
        msg: "Swap slippage exceeded";
      },
      {
        code: 6019;
        name: "AssertFailed";
        msg: "Assert failed";
      },
      {
        code: 6020;
        name: "InvalidAdmin";
        msg: "Invalid admin";
      },
      {
        code: 6021;
        name: "ProposalNotInDraftState";
        msg: "Proposal is not in draft state";
      },
      {
        code: 6022;
        name: "InsufficientTokenBalance";
        msg: "Insufficient token balance";
      },
      {
        code: 6023;
        name: "InvalidAmount";
        msg: "Invalid amount";
      },
      {
        code: 6024;
        name: "InsufficientStakeToLaunch";
        msg: "Insufficient stake to launch proposal";
      },
      {
        code: 6025;
        name: "StakerNotFound";
        msg: "Staker not found in proposal";
      },
      {
        code: 6026;
        name: "PoolNotInSpotState";
        msg: "Pool must be in spot state";
      },
      {
        code: 6027;
        name: "InvalidDaoCreateLiquidity";
        msg: "If you're providing liquidity, you must provide both base and quote token accounts";
      },
      {
        code: 6028;
        name: "InvalidStakeAccount";
        msg: "Invalid stake account";
      },
      {
        code: 6029;
        name: "InvariantViolated";
        msg: "An invariant was violated. You should get in contact with the MetaDAO team if you see this";
      },
      {
        code: 6030;
        name: "ProposalNotActive";
        msg: "Proposal needs to be active to perform a conditional swap";
      },
      {
        code: 6031;
        name: "InvalidTransaction";
        msg: "This Squads transaction should only contain calls to update spending limits";
      },
    ];
  };
  
  export const IDL: Futarchy = {
    version: "0.6.0",
    name: "futarchy",
    instructions: [
      {
        name: "initializeDao",
        accounts: [
          {
            name: "dao",
            isMut: true,
            isSigner: false,
          },
          {
            name: "daoCreator",
            isMut: false,
            isSigner: true,
          },
          {
            name: "payer",
            isMut: true,
            isSigner: true,
          },
          {
            name: "systemProgram",
            isMut: false,
            isSigner: false,
          },
          {
            name: "baseMint",
            isMut: false,
            isSigner: false,
          },
          {
            name: "quoteMint",
            isMut: false,
            isSigner: false,
          },
          {
            name: "squadsMultisig",
            isMut: true,
            isSigner: false,
          },
          {
            name: "squadsMultisigVault",
            isMut: false,
            isSigner: false,
          },
          {
            name: "squadsProgram",
            isMut: false,
            isSigner: false,
          },
          {
            name: "squadsProgramConfig",
            isMut: false,
            isSigner: false,
          },
          {
            name: "squadsProgramConfigTreasury",
            isMut: true,
            isSigner: false,
          },
          {
            name: "spendingLimit",
            isMut: true,
            isSigner: false,
          },
          {
            name: "futarchyAmmBaseVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "futarchyAmmQuoteVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "tokenProgram",
            isMut: false,
            isSigner: false,
          },
          {
            name: "associatedTokenProgram",
            isMut: false,
            isSigner: false,
          },
          {
            name: "eventAuthority",
            isMut: false,
            isSigner: false,
          },
          {
            name: "program",
            isMut: false,
            isSigner: false,
          },
        ],
        args: [
          {
            name: "params",
            type: {
              defined: "InitializeDaoParams",
            },
          },
        ],
      },
      {
        name: "initializeProposal",
        accounts: [
          {
            name: "proposal",
            isMut: true,
            isSigner: false,
          },
          {
            name: "squadsProposal",
            isMut: false,
            isSigner: false,
          },
          {
            name: "dao",
            isMut: true,
            isSigner: false,
          },
          {
            name: "question",
            isMut: false,
            isSigner: false,
          },
          {
            name: "quoteVault",
            isMut: false,
            isSigner: false,
          },
          {
            name: "baseVault",
            isMut: false,
            isSigner: false,
          },
          {
            name: "proposer",
            isMut: false,
            isSigner: true,
          },
          {
            name: "payer",
            isMut: true,
            isSigner: true,
          },
          {
            name: "systemProgram",
            isMut: false,
            isSigner: false,
          },
          {
            name: "eventAuthority",
            isMut: false,
            isSigner: false,
          },
          {
            name: "program",
            isMut: false,
            isSigner: false,
          },
        ],
        args: [],
      },
      {
        name: "stakeToProposal",
        accounts: [
          {
            name: "proposal",
            isMut: true,
            isSigner: false,
          },
          {
            name: "dao",
            isMut: true,
            isSigner: false,
          },
          {
            name: "stakerBaseAccount",
            isMut: true,
            isSigner: false,
          },
          {
            name: "proposalBaseAccount",
            isMut: true,
            isSigner: false,
          },
          {
            name: "stakeAccount",
            isMut: true,
            isSigner: false,
          },
          {
            name: "staker",
            isMut: false,
            isSigner: true,
          },
          {
            name: "payer",
            isMut: true,
            isSigner: true,
          },
          {
            name: "tokenProgram",
            isMut: false,
            isSigner: false,
          },
          {
            name: "associatedTokenProgram",
            isMut: false,
            isSigner: false,
          },
          {
            name: "systemProgram",
            isMut: false,
            isSigner: false,
          },
          {
            name: "eventAuthority",
            isMut: false,
            isSigner: false,
          },
          {
            name: "program",
            isMut: false,
            isSigner: false,
          },
        ],
        args: [
          {
            name: "params",
            type: {
              defined: "StakeToProposalParams",
            },
          },
        ],
      },
      {
        name: "unstakeFromProposal",
        accounts: [
          {
            name: "proposal",
            isMut: true,
            isSigner: false,
          },
          {
            name: "dao",
            isMut: true,
            isSigner: false,
          },
          {
            name: "stakerBaseAccount",
            isMut: true,
            isSigner: false,
          },
          {
            name: "proposalBaseAccount",
            isMut: true,
            isSigner: false,
          },
          {
            name: "stakeAccount",
            isMut: true,
            isSigner: false,
          },
          {
            name: "staker",
            isMut: false,
            isSigner: true,
          },
          {
            name: "tokenProgram",
            isMut: false,
            isSigner: false,
          },
          {
            name: "associatedTokenProgram",
            isMut: false,
            isSigner: false,
          },
          {
            name: "eventAuthority",
            isMut: false,
            isSigner: false,
          },
          {
            name: "program",
            isMut: false,
            isSigner: false,
          },
        ],
        args: [
          {
            name: "params",
            type: {
              defined: "UnstakeFromProposalParams",
            },
          },
        ],
      },
      {
        name: "launchProposal",
        accounts: [
          {
            name: "proposal",
            isMut: true,
            isSigner: false,
          },
          {
            name: "baseVault",
            isMut: false,
            isSigner: false,
          },
          {
            name: "quoteVault",
            isMut: false,
            isSigner: false,
          },
          {
            name: "passBaseMint",
            isMut: false,
            isSigner: false,
          },
          {
            name: "passQuoteMint",
            isMut: false,
            isSigner: false,
          },
          {
            name: "failBaseMint",
            isMut: false,
            isSigner: false,
          },
          {
            name: "failQuoteMint",
            isMut: false,
            isSigner: false,
          },
          {
            name: "dao",
            isMut: true,
            isSigner: false,
          },
          {
            name: "payer",
            isMut: true,
            isSigner: true,
          },
          {
            name: "ammPassBaseVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "ammPassQuoteVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "ammFailBaseVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "ammFailQuoteVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "systemProgram",
            isMut: false,
            isSigner: false,
          },
          {
            name: "tokenProgram",
            isMut: false,
            isSigner: false,
          },
          {
            name: "associatedTokenProgram",
            isMut: false,
            isSigner: false,
          },
          {
            name: "eventAuthority",
            isMut: false,
            isSigner: false,
          },
          {
            name: "program",
            isMut: false,
            isSigner: false,
          },
        ],
        args: [],
      },
      {
        name: "finalizeProposal",
        accounts: [
          {
            name: "proposal",
            isMut: true,
            isSigner: false,
          },
          {
            name: "dao",
            isMut: true,
            isSigner: false,
          },
          {
            name: "question",
            isMut: true,
            isSigner: false,
          },
          {
            name: "squadsProposal",
            isMut: true,
            isSigner: false,
          },
          {
            name: "squadsMultisig",
            isMut: false,
            isSigner: false,
          },
          {
            name: "squadsMultisigProgram",
            isMut: false,
            isSigner: false,
          },
          {
            name: "ammPassBaseVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "ammPassQuoteVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "ammFailBaseVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "ammFailQuoteVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "ammBaseVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "ammQuoteVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "vaultProgram",
            isMut: false,
            isSigner: false,
          },
          {
            name: "vaultEventAuthority",
            isMut: false,
            isSigner: false,
          },
          {
            name: "tokenProgram",
            isMut: false,
            isSigner: false,
          },
          {
            name: "quoteVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "quoteVaultUnderlyingTokenAccount",
            isMut: true,
            isSigner: false,
          },
          {
            name: "passQuoteMint",
            isMut: true,
            isSigner: false,
          },
          {
            name: "failQuoteMint",
            isMut: true,
            isSigner: false,
          },
          {
            name: "passBaseMint",
            isMut: true,
            isSigner: false,
          },
          {
            name: "failBaseMint",
            isMut: true,
            isSigner: false,
          },
          {
            name: "baseVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "baseVaultUnderlyingTokenAccount",
            isMut: true,
            isSigner: false,
          },
          {
            name: "eventAuthority",
            isMut: false,
            isSigner: false,
          },
          {
            name: "program",
            isMut: false,
            isSigner: false,
          },
        ],
        args: [],
      },
      {
        name: "updateDao",
        accounts: [
          {
            name: "dao",
            isMut: true,
            isSigner: false,
          },
          {
            name: "squadsMultisigVault",
            isMut: false,
            isSigner: true,
          },
          {
            name: "eventAuthority",
            isMut: false,
            isSigner: false,
          },
          {
            name: "program",
            isMut: false,
            isSigner: false,
          },
        ],
        args: [
          {
            name: "daoParams",
            type: {
              defined: "UpdateDaoParams",
            },
          },
        ],
      },
      {
        name: "spotSwap",
        accounts: [
          {
            name: "dao",
            isMut: true,
            isSigner: false,
          },
          {
            name: "userBaseAccount",
            isMut: true,
            isSigner: false,
          },
          {
            name: "userQuoteAccount",
            isMut: true,
            isSigner: false,
          },
          {
            name: "ammBaseVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "ammQuoteVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "user",
            isMut: false,
            isSigner: true,
          },
          {
            name: "tokenProgram",
            isMut: false,
            isSigner: false,
          },
          {
            name: "eventAuthority",
            isMut: false,
            isSigner: false,
          },
          {
            name: "program",
            isMut: false,
            isSigner: false,
          },
        ],
        args: [
          {
            name: "params",
            type: {
              defined: "SpotSwapParams",
            },
          },
        ],
      },
      {
        name: "conditionalSwap",
        accounts: [
          {
            name: "dao",
            isMut: true,
            isSigner: false,
          },
          {
            name: "ammBaseVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "ammQuoteVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "proposal",
            isMut: false,
            isSigner: false,
          },
          {
            name: "ammPassBaseVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "ammPassQuoteVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "ammFailBaseVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "ammFailQuoteVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "trader",
            isMut: false,
            isSigner: true,
          },
          {
            name: "userInputAccount",
            isMut: true,
            isSigner: false,
          },
          {
            name: "userOutputAccount",
            isMut: true,
            isSigner: false,
          },
          {
            name: "baseVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "baseVaultUnderlyingTokenAccount",
            isMut: true,
            isSigner: false,
          },
          {
            name: "quoteVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "quoteVaultUnderlyingTokenAccount",
            isMut: true,
            isSigner: false,
          },
          {
            name: "passBaseMint",
            isMut: true,
            isSigner: false,
          },
          {
            name: "failBaseMint",
            isMut: true,
            isSigner: false,
          },
          {
            name: "passQuoteMint",
            isMut: true,
            isSigner: false,
          },
          {
            name: "failQuoteMint",
            isMut: true,
            isSigner: false,
          },
          {
            name: "conditionalVaultProgram",
            isMut: false,
            isSigner: false,
          },
          {
            name: "vaultEventAuthority",
            isMut: false,
            isSigner: false,
          },
          {
            name: "question",
            isMut: false,
            isSigner: false,
          },
          {
            name: "tokenProgram",
            isMut: false,
            isSigner: false,
          },
          {
            name: "eventAuthority",
            isMut: false,
            isSigner: false,
          },
          {
            name: "program",
            isMut: false,
            isSigner: false,
          },
        ],
        args: [
          {
            name: "params",
            type: {
              defined: "ConditionalSwapParams",
            },
          },
        ],
      },
      {
        name: "provideLiquidity",
        accounts: [
          {
            name: "dao",
            isMut: true,
            isSigner: false,
          },
          {
            name: "liquidityProvider",
            isMut: false,
            isSigner: true,
          },
          {
            name: "liquidityProviderBaseAccount",
            isMut: true,
            isSigner: false,
          },
          {
            name: "liquidityProviderQuoteAccount",
            isMut: true,
            isSigner: false,
          },
          {
            name: "payer",
            isMut: true,
            isSigner: true,
          },
          {
            name: "systemProgram",
            isMut: false,
            isSigner: false,
          },
          {
            name: "ammBaseVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "ammQuoteVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "ammPosition",
            isMut: true,
            isSigner: false,
          },
          {
            name: "tokenProgram",
            isMut: false,
            isSigner: false,
          },
          {
            name: "eventAuthority",
            isMut: false,
            isSigner: false,
          },
          {
            name: "program",
            isMut: false,
            isSigner: false,
          },
        ],
        args: [
          {
            name: "params",
            type: {
              defined: "ProvideLiquidityParams",
            },
          },
        ],
      },
      {
        name: "withdrawLiquidity",
        accounts: [
          {
            name: "dao",
            isMut: true,
            isSigner: false,
          },
          {
            name: "positionAuthority",
            isMut: false,
            isSigner: true,
          },
          {
            name: "liquidityProviderBaseAccount",
            isMut: true,
            isSigner: false,
          },
          {
            name: "liquidityProviderQuoteAccount",
            isMut: true,
            isSigner: false,
          },
          {
            name: "ammBaseVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "ammQuoteVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "ammPosition",
            isMut: true,
            isSigner: false,
          },
          {
            name: "tokenProgram",
            isMut: false,
            isSigner: false,
          },
          {
            name: "eventAuthority",
            isMut: false,
            isSigner: false,
          },
          {
            name: "program",
            isMut: false,
            isSigner: false,
          },
        ],
        args: [
          {
            name: "params",
            type: {
              defined: "WithdrawLiquidityParams",
            },
          },
        ],
      },
      {
        name: "collectFees",
        accounts: [
          {
            name: "dao",
            isMut: true,
            isSigner: false,
          },
          {
            name: "admin",
            isMut: false,
            isSigner: true,
          },
          {
            name: "baseTokenAccount",
            isMut: true,
            isSigner: false,
          },
          {
            name: "quoteTokenAccount",
            isMut: true,
            isSigner: false,
          },
          {
            name: "ammBaseVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "ammQuoteVault",
            isMut: true,
            isSigner: false,
          },
          {
            name: "tokenProgram",
            isMut: false,
            isSigner: false,
          },
          {
            name: "eventAuthority",
            isMut: false,
            isSigner: false,
          },
          {
            name: "program",
            isMut: false,
            isSigner: false,
          },
        ],
        args: [],
      },
      {
        name: "executeSpendingLimitChange",
        accounts: [
          {
            name: "proposal",
            isMut: true,
            isSigner: false,
          },
          {
            name: "dao",
            isMut: true,
            isSigner: false,
          },
          {
            name: "squadsProposal",
            isMut: true,
            isSigner: false,
          },
          {
            name: "squadsMultisig",
            isMut: false,
            isSigner: false,
          },
          {
            name: "squadsMultisigProgram",
            isMut: false,
            isSigner: false,
          },
          {
            name: "vaultTransaction",
            isMut: false,
            isSigner: false,
          },
          {
            name: "eventAuthority",
            isMut: false,
            isSigner: false,
          },
          {
            name: "program",
            isMut: false,
            isSigner: false,
          },
        ],
        args: [],
      },
    ],
    accounts: [
      {
        name: "ammPosition",
        type: {
          kind: "struct",
          fields: [
            {
              name: "dao",
              type: "publicKey",
            },
            {
              name: "positionAuthority",
              type: "publicKey",
            },
            {
              name: "liquidity",
              type: "u128",
            },
          ],
        },
      },
      {
        name: "dao",
        type: {
          kind: "struct",
          fields: [
            {
              name: "amm",
              docs: ["Embedded FutarchyAmm - 1:1 relationship"],
              type: {
                defined: "FutarchyAmm",
              },
            },
            {
              name: "nonce",
              docs: ["`nonce` + `dao_creator` are PDA seeds"],
              type: "u64",
            },
            {
              name: "daoCreator",
              type: "publicKey",
            },
            {
              name: "pdaBump",
              type: "u8",
            },
            {
              name: "squadsMultisig",
              type: "publicKey",
            },
            {
              name: "squadsMultisigVault",
              type: "publicKey",
            },
            {
              name: "baseMint",
              type: "publicKey",
            },
            {
              name: "quoteMint",
              type: "publicKey",
            },
            {
              name: "proposalCount",
              type: "u32",
            },
            {
              name: "passThresholdBps",
              type: "u16",
            },
            {
              name: "secondsPerProposal",
              type: "u32",
            },
            {
              name: "twapInitialObservation",
              docs: [
                "For manipulation-resistance the TWAP is a time-weighted average observation,",
                "where observation tries to approximate price but can only move by",
                "`twap_max_observation_change_per_update` per update. Because it can only move",
                "a little bit per update, you need to check that it has a good initial observation.",
                "Otherwise, an attacker could create a very high initial observation in the pass",
                "market and a very low one in the fail market to force the proposal to pass.",
                "",
                "We recommend setting an initial observation around the spot price of the token,",
                "and max observation change per update around 2% the spot price of the token.",
                "For example, if the spot price of META is $400, we'd recommend setting an initial",
                "observation of 400 (converted into the AMM prices) and a max observation change per",
                "update of 8 (also converted into the AMM prices). Observations can be updated once",
                "a minute, so 2% allows the proposal market to reach double the spot price or 0",
                "in 50 minutes.",
              ],
              type: "u128",
            },
            {
              name: "twapMaxObservationChangePerUpdate",
              type: "u128",
            },
            {
              name: "twapStartDelaySeconds",
              docs: [
                "Forces TWAP calculation to start after `twap_start_delay_seconds` seconds",
              ],
              type: "u32",
            },
            {
              name: "minQuoteFutarchicLiquidity",
              docs: [
                "As an anti-spam measure and to help liquidity, you need to lock up some liquidity",
                "in both futarchic markets in order to create a proposal.",
                "",
                "For example, for META, we can use a `min_quote_futarchic_liquidity` of",
                "5000 * 1_000_000 (5000 USDC) and a `min_base_futarchic_liquidity` of",
                "10 * 1_000_000_000 (10 META).",
              ],
              type: "u64",
            },
            {
              name: "minBaseFutarchicLiquidity",
              type: "u64",
            },
            {
              name: "baseToStake",
              docs: [
                "Minimum amount of base tokens that must be staked to launch a proposal",
              ],
              type: "u64",
            },
            {
              name: "seqNum",
              type: "u64",
            },
            {
              name: "initialSpendingLimit",
              type: {
                option: {
                  defined: "InitialSpendingLimit",
                },
              },
            },
          ],
        },
      },
      {
        name: "proposal",
        type: {
          kind: "struct",
          fields: [
            {
              name: "number",
              type: "u32",
            },
            {
              name: "proposer",
              type: "publicKey",
            },
            {
              name: "timestampEnqueued",
              type: "i64",
            },
            {
              name: "state",
              type: {
                defined: "ProposalState",
              },
            },
            {
              name: "baseVault",
              type: "publicKey",
            },
            {
              name: "quoteVault",
              type: "publicKey",
            },
            {
              name: "dao",
              type: "publicKey",
            },
            {
              name: "pdaBump",
              type: "u8",
            },
            {
              name: "question",
              type: "publicKey",
            },
            {
              name: "durationInSeconds",
              type: "u32",
            },
            {
              name: "squadsProposal",
              type: "publicKey",
            },
            {
              name: "passBaseMint",
              type: "publicKey",
            },
            {
              name: "passQuoteMint",
              type: "publicKey",
            },
            {
              name: "failBaseMint",
              type: "publicKey",
            },
            {
              name: "failQuoteMint",
              type: "publicKey",
            },
          ],
        },
      },
      {
        name: "stakeAccount",
        type: {
          kind: "struct",
          fields: [
            {
              name: "proposal",
              type: "publicKey",
            },
            {
              name: "staker",
              type: "publicKey",
            },
            {
              name: "amount",
              type: "u64",
            },
            {
              name: "bump",
              type: "u8",
            },
          ],
        },
      },
    ],
    types: [
      {
        name: "CommonFields",
        type: {
          kind: "struct",
          fields: [
            {
              name: "slot",
              type: "u64",
            },
            {
              name: "unixTimestamp",
              type: "i64",
            },
            {
              name: "daoSeqNum",
              type: "u64",
            },
          ],
        },
      },
      {
        name: "ConditionalSwapParams",
        type: {
          kind: "struct",
          fields: [
            {
              name: "market",
              type: {
                defined: "Market",
              },
            },
            {
              name: "swapType",
              type: {
                defined: "SwapType",
              },
            },
            {
              name: "inputAmount",
              type: "u64",
            },
            {
              name: "minOutputAmount",
              type: "u64",
            },
          ],
        },
      },
      {
        name: "InitializeDaoParams",
        type: {
          kind: "struct",
          fields: [
            {
              name: "twapInitialObservation",
              type: "u128",
            },
            {
              name: "twapMaxObservationChangePerUpdate",
              type: "u128",
            },
            {
              name: "twapStartDelaySeconds",
              type: "u32",
            },
            {
              name: "minQuoteFutarchicLiquidity",
              type: "u64",
            },
            {
              name: "minBaseFutarchicLiquidity",
              type: "u64",
            },
            {
              name: "baseToStake",
              type: "u64",
            },
            {
              name: "passThresholdBps",
              type: "u16",
            },
            {
              name: "secondsPerProposal",
              type: "u32",
            },
            {
              name: "nonce",
              type: "u64",
            },
            {
              name: "initialSpendingLimit",
              type: {
                option: {
                  defined: "InitialSpendingLimit",
                },
              },
            },
          ],
        },
      },
      {
        name: "ProvideLiquidityParams",
        type: {
          kind: "struct",
          fields: [
            {
              name: "quoteAmount",
              docs: ["How much quote token you will deposit to the pool"],
              type: "u64",
            },
            {
              name: "maxBaseAmount",
              docs: ["The maximum base token you will deposit to the pool"],
              type: "u64",
            },
            {
              name: "minLiquidity",
              docs: ["The minimum liquidity you will be assigned"],
              type: "u128",
            },
            {
              name: "positionAuthority",
              docs: [
                "The account that will own the LP position, usually the same as the",
                "liquidity provider",
              ],
              type: "publicKey",
            },
          ],
        },
      },
      {
        name: "SpotSwapParams",
        type: {
          kind: "struct",
          fields: [
            {
              name: "inputAmount",
              type: "u64",
            },
            {
              name: "swapType",
              type: {
                defined: "SwapType",
              },
            },
            {
              name: "minOutputAmount",
              type: "u64",
            },
          ],
        },
      },
      {
        name: "StakeToProposalParams",
        type: {
          kind: "struct",
          fields: [
            {
              name: "amount",
              type: "u64",
            },
          ],
        },
      },
      {
        name: "UnstakeFromProposalParams",
        type: {
          kind: "struct",
          fields: [
            {
              name: "amount",
              type: "u64",
            },
          ],
        },
      },
      {
        name: "UpdateDaoParams",
        type: {
          kind: "struct",
          fields: [
            {
              name: "passThresholdBps",
              type: {
                option: "u16",
              },
            },
            {
              name: "secondsPerProposal",
              type: {
                option: "u32",
              },
            },
            {
              name: "twapInitialObservation",
              type: {
                option: "u128",
              },
            },
            {
              name: "twapMaxObservationChangePerUpdate",
              type: {
                option: "u128",
              },
            },
            {
              name: "minQuoteFutarchicLiquidity",
              type: {
                option: "u64",
              },
            },
            {
              name: "minBaseFutarchicLiquidity",
              type: {
                option: "u64",
              },
            },
            {
              name: "baseToStake",
              type: {
                option: "u64",
              },
            },
          ],
        },
      },
      {
        name: "WithdrawLiquidityParams",
        type: {
          kind: "struct",
          fields: [
            {
              name: "liquidityToWithdraw",
              docs: ["How much liquidity to withdraw"],
              type: "u128",
            },
            {
              name: "minBaseAmount",
              docs: ["Minimum base tokens to receive"],
              type: "u64",
            },
            {
              name: "minQuoteAmount",
              docs: ["Minimum quote tokens to receive"],
              type: "u64",
            },
          ],
        },
      },
      {
        name: "InitialSpendingLimit",
        type: {
          kind: "struct",
          fields: [
            {
              name: "amountPerMonth",
              type: "u64",
            },
            {
              name: "members",
              type: {
                vec: "publicKey",
              },
            },
          ],
        },
      },
      {
        name: "FutarchyAmm",
        type: {
          kind: "struct",
          fields: [
            {
              name: "state",
              type: {
                defined: "PoolState",
              },
            },
            {
              name: "totalLiquidity",
              type: "u128",
            },
            {
              name: "baseMint",
              type: "publicKey",
            },
            {
              name: "quoteMint",
              type: "publicKey",
            },
            {
              name: "ammBaseVault",
              type: "publicKey",
            },
            {
              name: "ammQuoteVault",
              type: "publicKey",
            },
          ],
        },
      },
      {
        name: "TwapOracle",
        type: {
          kind: "struct",
          fields: [
            {
              name: "aggregator",
              docs: [
                "Running sum of slots_per_last_update * last_observation.",
                "",
                "Assuming latest observations are as big as possible (u64::MAX * 1e12),",
                "we can store 18 million slots worth of observations, which turns out to",
                "be ~85 days worth of slots.",
                "",
                "Assuming that latest observations are 100x smaller than they could theoretically",
                "be, we can store 8500 days (23 years) worth of them. Even this is a very",
                "very conservative assumption - META/USDC prices should be between 1e9 and",
                "1e15, which would overflow after 1e15 years worth of slots.",
                "",
                "So in the case of an overflow, the aggregator rolls back to 0. It's the",
                "client's responsibility to sanity check the assets or to handle an",
                "aggregator at T2 being smaller than an aggregator at T1.",
              ],
              type: "u128",
            },
            {
              name: "lastUpdatedTimestamp",
              type: "i64",
            },
            {
              name: "createdAtTimestamp",
              type: "i64",
            },
            {
              name: "lastPrice",
              docs: [
                "A price is the number of quote units per base unit multiplied by 1e12.",
                "You cannot simply divide by 1e12 to get a price you can display in the UI",
                "because the base and quote decimals may be different. Instead, do:",
                "ui_price = (price * (10**(base_decimals - quote_decimals))) / 1e12",
              ],
              type: "u128",
            },
            {
              name: "lastObservation",
              docs: [
                "If we did a raw TWAP over prices, someone could push the TWAP heavily with",
                "a few extremely large outliers. So we use observations, which can only move",
                "by `max_observation_change_per_update` per update.",
              ],
              type: "u128",
            },
            {
              name: "maxObservationChangePerUpdate",
              docs: ["The most that an observation can change per update."],
              type: "u128",
            },
            {
              name: "initialObservation",
              docs: ["What the initial `latest_observation` is set to."],
              type: "u128",
            },
            {
              name: "startDelaySeconds",
              docs: [
                "Number of seconds after amm.created_at_slot to start recording TWAP",
              ],
              type: "u32",
            },
          ],
        },
      },
      {
        name: "Pool",
        type: {
          kind: "struct",
          fields: [
            {
              name: "oracle",
              type: {
                defined: "TwapOracle",
              },
            },
            {
              name: "quoteReserves",
              type: "u64",
            },
            {
              name: "baseReserves",
              type: "u64",
            },
            {
              name: "quoteProtocolFeeBalance",
              type: "u64",
            },
            {
              name: "baseProtocolFeeBalance",
              type: "u64",
            },
          ],
        },
      },
      {
        name: "PoolState",
        type: {
          kind: "enum",
          variants: [
            {
              name: "Spot",
              fields: [
                {
                  name: "spot",
                  type: {
                    defined: "Pool",
                  },
                },
              ],
            },
            {
              name: "Futarchy",
              fields: [
                {
                  name: "spot",
                  type: {
                    defined: "Pool",
                  },
                },
                {
                  name: "pass",
                  type: {
                    defined: "Pool",
                  },
                },
                {
                  name: "fail",
                  type: {
                    defined: "Pool",
                  },
                },
              ],
            },
          ],
        },
      },
      {
        name: "Market",
        type: {
          kind: "enum",
          variants: [
            {
              name: "Spot",
            },
            {
              name: "Pass",
            },
            {
              name: "Fail",
            },
          ],
        },
      },
      {
        name: "SwapType",
        type: {
          kind: "enum",
          variants: [
            {
              name: "Buy",
            },
            {
              name: "Sell",
            },
          ],
        },
      },
      {
        name: "Token",
        type: {
          kind: "enum",
          variants: [
            {
              name: "Base",
            },
            {
              name: "Quote",
            },
          ],
        },
      },
      {
        name: "ProposalState",
        type: {
          kind: "enum",
          variants: [
            {
              name: "Draft",
              fields: [
                {
                  name: "amountStaked",
                  type: "u64",
                },
              ],
            },
            {
              name: "Pending",
            },
            {
              name: "Passed",
            },
            {
              name: "Failed",
            },
          ],
        },
      },
    ],
    events: [
      {
        name: "CollectFeesEvent",
        fields: [
          {
            name: "common",
            type: {
              defined: "CommonFields",
            },
            index: false,
          },
          {
            name: "dao",
            type: "publicKey",
            index: false,
          },
          {
            name: "baseTokenAccount",
            type: "publicKey",
            index: false,
          },
          {
            name: "quoteTokenAccount",
            type: "publicKey",
            index: false,
          },
          {
            name: "ammBaseVault",
            type: "publicKey",
            index: false,
          },
          {
            name: "ammQuoteVault",
            type: "publicKey",
            index: false,
          },
          {
            name: "quoteMint",
            type: "publicKey",
            index: false,
          },
          {
            name: "baseMint",
            type: "publicKey",
            index: false,
          },
          {
            name: "quoteFeesCollected",
            type: "u64",
            index: false,
          },
          {
            name: "baseFeesCollected",
            type: "u64",
            index: false,
          },
          {
            name: "postAmmState",
            type: {
              defined: "FutarchyAmm",
            },
            index: false,
          },
        ],
      },
      {
        name: "InitializeDaoEvent",
        fields: [
          {
            name: "common",
            type: {
              defined: "CommonFields",
            },
            index: false,
          },
          {
            name: "dao",
            type: "publicKey",
            index: false,
          },
          {
            name: "baseMint",
            type: "publicKey",
            index: false,
          },
          {
            name: "quoteMint",
            type: "publicKey",
            index: false,
          },
          {
            name: "passThresholdBps",
            type: "u16",
            index: false,
          },
          {
            name: "secondsPerProposal",
            type: "u32",
            index: false,
          },
          {
            name: "twapInitialObservation",
            type: "u128",
            index: false,
          },
          {
            name: "twapMaxObservationChangePerUpdate",
            type: "u128",
            index: false,
          },
          {
            name: "minQuoteFutarchicLiquidity",
            type: "u64",
            index: false,
          },
          {
            name: "minBaseFutarchicLiquidity",
            type: "u64",
            index: false,
          },
          {
            name: "baseToStake",
            type: "u64",
            index: false,
          },
          {
            name: "initialSpendingLimit",
            type: {
              option: {
                defined: "InitialSpendingLimit",
              },
            },
            index: false,
          },
          {
            name: "squadsMultisig",
            type: "publicKey",
            index: false,
          },
          {
            name: "squadsMultisigVault",
            type: "publicKey",
            index: false,
          },
        ],
      },
      {
        name: "UpdateDaoEvent",
        fields: [
          {
            name: "common",
            type: {
              defined: "CommonFields",
            },
            index: false,
          },
          {
            name: "dao",
            type: "publicKey",
            index: false,
          },
          {
            name: "passThresholdBps",
            type: "u16",
            index: false,
          },
          {
            name: "secondsPerProposal",
            type: "u32",
            index: false,
          },
          {
            name: "twapInitialObservation",
            type: "u128",
            index: false,
          },
          {
            name: "twapMaxObservationChangePerUpdate",
            type: "u128",
            index: false,
          },
          {
            name: "minQuoteFutarchicLiquidity",
            type: "u64",
            index: false,
          },
          {
            name: "minBaseFutarchicLiquidity",
            type: "u64",
            index: false,
          },
          {
            name: "baseToStake",
            type: "u64",
            index: false,
          },
        ],
      },
      {
        name: "InitializeProposalEvent",
        fields: [
          {
            name: "common",
            type: {
              defined: "CommonFields",
            },
            index: false,
          },
          {
            name: "proposal",
            type: "publicKey",
            index: false,
          },
          {
            name: "dao",
            type: "publicKey",
            index: false,
          },
          {
            name: "question",
            type: "publicKey",
            index: false,
          },
          {
            name: "quoteVault",
            type: "publicKey",
            index: false,
          },
          {
            name: "baseVault",
            type: "publicKey",
            index: false,
          },
          {
            name: "proposer",
            type: "publicKey",
            index: false,
          },
          {
            name: "number",
            type: "u32",
            index: false,
          },
          {
            name: "pdaBump",
            type: "u8",
            index: false,
          },
          {
            name: "durationInSeconds",
            type: "u32",
            index: false,
          },
          {
            name: "squadsProposal",
            type: "publicKey",
            index: false,
          },
          {
            name: "squadsMultisig",
            type: "publicKey",
            index: false,
          },
          {
            name: "squadsMultisigVault",
            type: "publicKey",
            index: false,
          },
        ],
      },
      {
        name: "StakeToProposalEvent",
        fields: [
          {
            name: "common",
            type: {
              defined: "CommonFields",
            },
            index: false,
          },
          {
            name: "proposal",
            type: "publicKey",
            index: false,
          },
          {
            name: "staker",
            type: "publicKey",
            index: false,
          },
          {
            name: "amount",
            type: "u64",
            index: false,
          },
          {
            name: "totalStaked",
            type: "u64",
            index: false,
          },
        ],
      },
      {
        name: "UnstakeFromProposalEvent",
        fields: [
          {
            name: "common",
            type: {
              defined: "CommonFields",
            },
            index: false,
          },
          {
            name: "proposal",
            type: "publicKey",
            index: false,
          },
          {
            name: "staker",
            type: "publicKey",
            index: false,
          },
          {
            name: "amount",
            type: "u64",
            index: false,
          },
          {
            name: "totalStaked",
            type: "u64",
            index: false,
          },
        ],
      },
      {
        name: "LaunchProposalEvent",
        fields: [
          {
            name: "common",
            type: {
              defined: "CommonFields",
            },
            index: false,
          },
          {
            name: "proposal",
            type: "publicKey",
            index: false,
          },
          {
            name: "dao",
            type: "publicKey",
            index: false,
          },
          {
            name: "totalStaked",
            type: "u64",
            index: false,
          },
          {
            name: "postAmmState",
            type: {
              defined: "FutarchyAmm",
            },
            index: false,
          },
        ],
      },
      {
        name: "FinalizeProposalEvent",
        fields: [
          {
            name: "common",
            type: {
              defined: "CommonFields",
            },
            index: false,
          },
          {
            name: "proposal",
            type: "publicKey",
            index: false,
          },
          {
            name: "dao",
            type: "publicKey",
            index: false,
          },
          {
            name: "passMarketTwap",
            type: "u128",
            index: false,
          },
          {
            name: "failMarketTwap",
            type: "u128",
            index: false,
          },
          {
            name: "threshold",
            type: "u128",
            index: false,
          },
          {
            name: "state",
            type: {
              defined: "ProposalState",
            },
            index: false,
          },
          {
            name: "squadsProposal",
            type: "publicKey",
            index: false,
          },
          {
            name: "squadsMultisig",
            type: "publicKey",
            index: false,
          },
          {
            name: "postAmmState",
            type: {
              defined: "FutarchyAmm",
            },
            index: false,
          },
        ],
      },
      {
        name: "SpotSwapEvent",
        fields: [
          {
            name: "common",
            type: {
              defined: "CommonFields",
            },
            index: false,
          },
          {
            name: "dao",
            type: "publicKey",
            index: false,
          },
          {
            name: "user",
            type: "publicKey",
            index: false,
          },
          {
            name: "swapType",
            type: {
              defined: "SwapType",
            },
            index: false,
          },
          {
            name: "inputAmount",
            type: "u64",
            index: false,
          },
          {
            name: "outputAmount",
            type: "u64",
            index: false,
          },
          {
            name: "minOutputAmount",
            type: "u64",
            index: false,
          },
          {
            name: "postAmmState",
            type: {
              defined: "FutarchyAmm",
            },
            index: false,
          },
        ],
      },
      {
        name: "ConditionalSwapEvent",
        fields: [
          {
            name: "common",
            type: {
              defined: "CommonFields",
            },
            index: false,
          },
          {
            name: "dao",
            type: "publicKey",
            index: false,
          },
          {
            name: "proposal",
            type: "publicKey",
            index: false,
          },
          {
            name: "trader",
            type: "publicKey",
            index: false,
          },
          {
            name: "market",
            type: {
              defined: "Market",
            },
            index: false,
          },
          {
            name: "swapType",
            type: {
              defined: "SwapType",
            },
            index: false,
          },
          {
            name: "inputAmount",
            type: "u64",
            index: false,
          },
          {
            name: "outputAmount",
            type: "u64",
            index: false,
          },
          {
            name: "minOutputAmount",
            type: "u64",
            index: false,
          },
          {
            name: "postAmmState",
            type: {
              defined: "FutarchyAmm",
            },
            index: false,
          },
        ],
      },
      {
        name: "ProvideLiquidityEvent",
        fields: [
          {
            name: "common",
            type: {
              defined: "CommonFields",
            },
            index: false,
          },
          {
            name: "dao",
            type: "publicKey",
            index: false,
          },
          {
            name: "liquidityProvider",
            type: "publicKey",
            index: false,
          },
          {
            name: "positionAuthority",
            type: "publicKey",
            index: false,
          },
          {
            name: "quoteAmount",
            type: "u64",
            index: false,
          },
          {
            name: "baseAmount",
            type: "u64",
            index: false,
          },
          {
            name: "liquidityMinted",
            type: "u128",
            index: false,
          },
          {
            name: "minLiquidity",
            type: "u128",
            index: false,
          },
          {
            name: "postAmmState",
            type: {
              defined: "FutarchyAmm",
            },
            index: false,
          },
        ],
      },
      {
        name: "WithdrawLiquidityEvent",
        fields: [
          {
            name: "common",
            type: {
              defined: "CommonFields",
            },
            index: false,
          },
          {
            name: "dao",
            type: "publicKey",
            index: false,
          },
          {
            name: "liquidityProvider",
            type: "publicKey",
            index: false,
          },
          {
            name: "liquidityWithdrawn",
            type: "u128",
            index: false,
          },
          {
            name: "minBaseAmount",
            type: "u64",
            index: false,
          },
          {
            name: "minQuoteAmount",
            type: "u64",
            index: false,
          },
          {
            name: "baseAmount",
            type: "u64",
            index: false,
          },
          {
            name: "quoteAmount",
            type: "u64",
            index: false,
          },
          {
            name: "postAmmState",
            type: {
              defined: "FutarchyAmm",
            },
            index: false,
          },
        ],
      },
    ],
    errors: [
      {
        code: 6000,
        name: "AmmTooOld",
        msg: "Amms must have been created within 5 minutes (counted in slots) of proposal initialization",
      },
      {
        code: 6001,
        name: "InvalidInitialObservation",
        msg: "An amm has an `initial_observation` that doesn't match the `dao`'s config",
      },
      {
        code: 6002,
        name: "InvalidMaxObservationChange",
        msg: "An amm has a `max_observation_change_per_update` that doesn't match the `dao`'s config",
      },
      {
        code: 6003,
        name: "InvalidStartDelaySlots",
        msg: "An amm has a `start_delay_slots` that doesn't match the `dao`'s config",
      },
      {
        code: 6004,
        name: "InvalidSettlementAuthority",
        msg: "One of the vaults has an invalid `settlement_authority`",
      },
      {
        code: 6005,
        name: "ProposalTooYoung",
        msg: "Proposal is too young to be executed or rejected",
      },
      {
        code: 6006,
        name: "MarketsTooYoung",
        msg: "Markets too young for proposal to be finalized. TWAP might need to be cranked",
      },
      {
        code: 6007,
        name: "ProposalAlreadyFinalized",
        msg: "This proposal has already been finalized",
      },
      {
        code: 6008,
        name: "InvalidVaultNonce",
        msg: "A conditional vault has an invalid nonce. A nonce should encode the proposal number",
      },
      {
        code: 6009,
        name: "ProposalNotPassed",
        msg: "This proposal can't be executed because it isn't in the passed state",
      },
      {
        code: 6010,
        name: "InsufficientLiquidity",
        msg: "More liquidity needs to be in the AMM to launch this proposal",
      },
      {
        code: 6011,
        name: "ProposalDurationTooShort",
        msg: "Proposal duration must be longer 1 day and longer than 2 times the TWAP start delay",
      },
      {
        code: 6012,
        name: "PassThresholdTooHigh",
        msg: "Pass threshold must be less than 10%",
      },
      {
        code: 6013,
        name: "QuestionMustBeBinary",
        msg: "Question must have exactly 2 outcomes for binary futarchy",
      },
      {
        code: 6014,
        name: "InvalidSquadsProposalStatus",
        msg: "Squads proposal must be in Draft status",
      },
      {
        code: 6015,
        name: "CastingOverflow",
        msg: "Casting overflow. If you're seeing this, please report this",
      },
      {
        code: 6016,
        name: "InsufficientBalance",
        msg: "Insufficient balance",
      },
      {
        code: 6017,
        name: "ZeroLiquidityRemove",
        msg: "Cannot remove zero liquidity",
      },
      {
        code: 6018,
        name: "SwapSlippageExceeded",
        msg: "Swap slippage exceeded",
      },
      {
        code: 6019,
        name: "AssertFailed",
        msg: "Assert failed",
      },
      {
        code: 6020,
        name: "InvalidAdmin",
        msg: "Invalid admin",
      },
      {
        code: 6021,
        name: "ProposalNotInDraftState",
        msg: "Proposal is not in draft state",
      },
      {
        code: 6022,
        name: "InsufficientTokenBalance",
        msg: "Insufficient token balance",
      },
      {
        code: 6023,
        name: "InvalidAmount",
        msg: "Invalid amount",
      },
      {
        code: 6024,
        name: "InsufficientStakeToLaunch",
        msg: "Insufficient stake to launch proposal",
      },
      {
        code: 6025,
        name: "StakerNotFound",
        msg: "Staker not found in proposal",
      },
      {
        code: 6026,
        name: "PoolNotInSpotState",
        msg: "Pool must be in spot state",
      },
      {
        code: 6027,
        name: "InvalidDaoCreateLiquidity",
        msg: "If you're providing liquidity, you must provide both base and quote token accounts",
      },
      {
        code: 6028,
        name: "InvalidStakeAccount",
        msg: "Invalid stake account",
      },
      {
        code: 6029,
        name: "InvariantViolated",
        msg: "An invariant was violated. You should get in contact with the MetaDAO team if you see this",
      },
      {
        code: 6030,
        name: "ProposalNotActive",
        msg: "Proposal needs to be active to perform a conditional swap",
      },
      {
        code: 6031,
        name: "InvalidTransaction",
        msg: "This Squads transaction should only contain calls to update spending limits",
      },
    ],
  };
  