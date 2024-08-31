# Implementation Details 
- grpc copy bot to support any trades on raydium.
- expected latency would be in 1-3 block = (0.4 - 1.2s).
- expected slippage would be in 3-5% range.
- jito tips is decided by the user, to send to the closet jito block engine.
- Our buy/sell amount depends on the trader
- our buy amount using SOL = (-(trader's new sol balance - trader's old sol balance) / trader's old sol price) * our current sol balance
- our sell amount of the token = (-(trader's new token balance - trader's old token balance) / trader's old token price) * our current token balance
