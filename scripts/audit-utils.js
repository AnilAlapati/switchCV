const fs = require("fs");
const path = require("path");

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function findFiles(dir, pattern, results = []) {
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            findFiles(fullPath, pattern, results);
        } else if (pattern.test(entry.name)) {
            results.push(fullPath);
        }
    }
    return results;
}

module.exports = {
    findFiles,
    RED, GREEN, YELLOW, BLUE, DIM, BOLD, RESET
};
