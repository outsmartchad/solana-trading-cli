
############  Command Line Tool for Memecoins Projects ##################

##########  --priority-fee <FEE> (e.g: 0.000005SOL or 1LAMPORTS) can be used in every command ###########

##########  --cluster <CLUSTER_OF_SOL> (e.g: mainnet, devnet) can be used in every command ###########

1. node create --payer <PATH_TO_SECRET_KEY> --symbol <TOKEN_SYMBOL> --token_name <TOKEN_NAME> --mint <PATH_TO_MINT_KEYPAIR> --supply <SUPPLY_OF_TOKEN> --decimals <DECIMALS> --metadata <PATH_METADATA_JSON> --image <PATH_TO_IMAGE> --cluster <CLUSTER> --file_type <FILE_TYPE>

2. node burn --payer <PATH_TO_SECRET_KEY> --token_address <ADDRESS_TOKEN> --percentage <BURN_PERCENTAGE> --cluster <CLUSTER>

3. node revoke_authority --payer <PATH_TO_SECRET_KEY> --mint_address <ADDRESS_TOKEN> -m -f

4. node transfer --payer <PATH_TO_SECRET_KEY> --token_address <ADDRESS_TOKEN> --amount <AMOUNT> --destination <RECEIVE_ADDRESS>

5. node airdrop --payer <PATH_TO_SECRET_KEY> --token-address <ADDRESS_TOKEN> --destination-addresses <PATH_OF_RECEIVE_ADDRESSES>

6. node buy --payer <PATH_TO_SECRET_KEY> --token_address <ADDRESS_TOKEN> --sol <NUMBER_OF_SOL> --cluster <CLUSTER>

7. node sell --payer <PATH_TO_SECRET_KEY> --token_address <ADDRESS_TOKEN> --percentage <SELL_PERCENTAGE> --cluster <CLUSTER>

8. node boost_volume --bot <PATH_BOT_SECRET_KEY> --token-address <ADDRESS_TOKEN> --volume <GOAL_OF_VOLUME>

9. node query --token-address <ADDRESS_TOKEN>

10. node add_pool --payer <PATH_WALLET> --token-address <ADDRESS_TOKEN> --pool-id <POOL_ID> --SOL <NUMBER_OF_SOL>

11. node remove_pool --payer <PATH_PAYER> --token <TOKEN_ADDRESS> --percentage <LP_TOKEN_PERCENTAGE> --cluster <CLUSTER>

12. node check_pool --pool-id <POOL_ID>

13. node wallet --token-address <ADDRESS_TOKEN> balance
  13a. node wallet balance # returns us the balance of SOL

14. node set_rpc --rpc-url <STRING_OF_RPC_URL>
  14a. node set_rpc public # set the default public mainnet rpc

Done💰: add_pool, remove_pool, buy, sell, create, burn, revoke_authority

Not done❌: boost_volume, check_pool, airdrop, set_rpc, wallet, query