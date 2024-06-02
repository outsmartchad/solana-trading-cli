"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function exponentialBackoff(startWaitTime, retryNumber, waitBackoff, getResult) {
    // TODO: jitter?
    let waitTime = startWaitTime;
    for (let i = 0; i < retryNumber; i++) {
        const result = await getResult();
        if (result) {
            return result;
        }
        await sleep(waitTime);
        waitTime *= waitBackoff;
    }
    return null;
}
exports.default = exponentialBackoff;
// Sleep given number of millis.
function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}
