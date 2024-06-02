"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("./common");
const net_config_1 = require("./net-config");
common_1.default.init = function (apiConfig = {}) {
    const defaults = {
        host: "arweave.net",
        port: 443,
        protocol: "https",
    };
    if (typeof location !== "object" ||
        !location.protocol ||
        !location.hostname) {
        return new common_1.default({
            ...apiConfig,
            ...defaults,
        });
    }
    // window.location.protocol has a trailing colon (http:, https:, file: etc)
    const locationProtocol = location.protocol.replace(":", "");
    const locationHost = location.hostname;
    const locationPort = location.port
        ? parseInt(location.port)
        : locationProtocol == "https"
            ? 443
            : 80;
    const defaultConfig = (0, net_config_1.getDefaultConfig)(locationProtocol, locationHost);
    const protocol = apiConfig.protocol || defaultConfig.protocol;
    const host = apiConfig.host || defaultConfig.host;
    const port = apiConfig.port || defaultConfig.port || locationPort;
    return new common_1.default({
        ...apiConfig,
        host,
        protocol,
        port,
    });
};
if (typeof globalThis === "object") {
    globalThis.Arweave = common_1.default;
}
else if (typeof self === "object") {
    self.Arweave = common_1.default;
}
__exportStar(require("./common"), exports);
exports.default = common_1.default;
