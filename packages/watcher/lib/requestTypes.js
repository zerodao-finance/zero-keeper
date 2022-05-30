const { UnderwriterTransferRequest, UnderwriterBurnRequest } = require("zero-protocol/dist/lib/zero");
exports.requestTypes = {
    transfer: {
        underlyingClass: UnderwriterTransferRequest,
        funcs: ["loan", "repay"],
        handler: "handleTransferRequest",
    },
    burn: {
        underlyingClass: UnderwriterBurnRequest,
        funcs: ["burn"],
        handler: "handleBurnRequest",
    },
}