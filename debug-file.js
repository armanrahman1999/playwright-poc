const fs = require('fs');
const path = require('path');

const filePath = "D:\\playwright\\ui-observer\\test-results\\screenshot-1770539400136-05-final.png";

console.log("Checking path:", filePath);
console.log("Exists?", fs.existsSync(filePath));

try {
    const buffer = fs.readFileSync(filePath);
    console.log("Read success, bytes:", buffer.length);
} catch (e) {
    console.error("Read failed:", e);
}
