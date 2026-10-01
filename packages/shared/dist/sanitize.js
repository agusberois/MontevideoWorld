"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeName = sanitizeName;
exports.sanitizeChat = sanitizeChat;
const constants_1 = require("./constants");
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g;
function clean(value, maxLength) {
    if (typeof value !== "string")
        return "";
    return value.replace(CONTROL_CHARS, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}
function sanitizeName(value) {
    return clean(value, constants_1.NAME_MAX_LENGTH);
}
function sanitizeChat(value) {
    return clean(value, constants_1.CHAT_MAX_LENGTH);
}
//# sourceMappingURL=sanitize.js.map