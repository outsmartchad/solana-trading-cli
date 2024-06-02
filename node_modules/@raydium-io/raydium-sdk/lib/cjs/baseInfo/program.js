"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEVNET_PROGRAM_ID = exports.MAINNET_PROGRAM_ID = void 0;
const web3_js_1 = require("@solana/web3.js");
exports.MAINNET_PROGRAM_ID = {
    SERUM_MARKET: new web3_js_1.PublicKey('9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin'),
    OPENBOOK_MARKET: new web3_js_1.PublicKey('srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX'),
    UTIL1216: new web3_js_1.PublicKey('CLaimxFqjHzgTJtAGHU47NPhg6qrc5sCnpC4tBLyABQS'),
    FarmV3: new web3_js_1.PublicKey('EhhTKczWMGQt46ynNeRX1WfeagwwJd7ufHvCDjRxjo5Q'),
    FarmV5: new web3_js_1.PublicKey('9KEPoZmtHUrBbhWN1v1KWLMkkvwY6WLtAVUCPRtRjP4z'),
    FarmV6: new web3_js_1.PublicKey('FarmqiPv5eAj3j1GMdMCMUGXqPUvmquZtMy86QH6rzhG'),
    AmmV4: new web3_js_1.PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'),
    AmmStable: new web3_js_1.PublicKey('5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h'),
    CLMM: new web3_js_1.PublicKey('CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK'),
    Router: new web3_js_1.PublicKey('routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS'),
};
exports.DEVNET_PROGRAM_ID = {
    SERUM_MARKET: web3_js_1.PublicKey.default,
    OPENBOOK_MARKET: new web3_js_1.PublicKey('EoTcMgcDRTJVZDMZWBoU6rhYHZfkNTVEAfz3uUJRcYGj'),
    UTIL1216: web3_js_1.PublicKey.default,
    FarmV3: new web3_js_1.PublicKey('85BFyr98MbCUU9MVTEgzx1nbhWACbJqLzho6zd6DZcWL'),
    FarmV5: new web3_js_1.PublicKey('EcLzTrNg9V7qhcdyXDe2qjtPkiGzDM2UbdRaeaadU5r2'),
    FarmV6: new web3_js_1.PublicKey('Farm2hJLcqPtPg8M4rR6DMrsRNc5TPm5Cs4bVQrMe2T7'),
    AmmV4: new web3_js_1.PublicKey('HWy1jotHpo6UqeQxx49dpYYdQB8wj9Qk9MdxwjLvDHB8'),
    AmmStable: new web3_js_1.PublicKey('DDg4VmQaJV9ogWce7LpcjBA9bv22wRp5uaTPa5pGjijF'),
    CLMM: new web3_js_1.PublicKey('devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH'),
    Router: new web3_js_1.PublicKey('BVChZ3XFEwTMUk1o9i3HAf91H6mFxSwa5X2wFAWhYPhU'),
};
//# sourceMappingURL=program.js.map