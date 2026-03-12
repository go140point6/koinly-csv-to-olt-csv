const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  convertKoinlyCsv,
  parseKoinlyCsv,
  shouldSkipRecord,
  stringifyOltCsv,
} = require("../bin/koinly-to-olt");

const fixturePath = path.join(__dirname, "fixtures", "sample-koinly.csv");
const inputText = fs.readFileSync(fixturePath, "utf8");
const sourceRows = parseKoinlyCsv(inputText);
const rows = convertKoinlyCsv(inputText);

assert.equal(rows.length, 3);
assert.equal(sourceRows.length, 7);
assert.equal(sourceRows.filter(shouldSkipRecord).length, 4);

assert.deepEqual(rows[0], {
  "Description of capital asset": "1935.29 PLI",
  "Date acquired ": "01/08/2024",
  "Date sold ": "01/04/2025",
  "Proceeds or Sales Price ($)": "83.8",
  "Cost or other basis ($)": "68.91",
  "Code(s) ": "",
  "Adjustments to gain or loss ($)": "",
  "Accrued market discount ($)": "",
  "Wash sale loss disallowed ($)": "",
  "Long Term/Short Term/Ordinary ": "SHORT",
  "Collectibles/QOF ": "",
  "Federal Income Tax Withheld ($)": "",
  "Noncovered Security": "",
  "Reported to IRS": "NONE",
  "Loss not allowed based on amount in 1d ": "",
  "Basis Reported to IRS ": "No",
  "Bartering ": "",
  "Applicable Checkbox on Form 8949": "C",
  "Whose Capital Assets ": "",
  "Payer Name": "",
  "Payer TIN": "",
  "Foreign Address? ": "",
  "Payer Address line 1": "",
  "Payer Address line 2": "",
  "Payer City": "",
  "Payer State": "",
  "Payer Zip": "",
  "Payer Country Code": "",
  "Form Type ": "",
});

assert.equal(rows[1]["Long Term/Short Term/Ordinary "], "SHORT");
assert.equal(rows[1]["Applicable Checkbox on Form 8949"], "C");
assert.equal(rows[1]["Description of capital asset"], "100 DUSTKEEP");
assert.equal(rows[2]["Long Term/Short Term/Ordinary "], "LONG");
assert.equal(rows[2]["Applicable Checkbox on Form 8949"], "F");
assert.equal(rows[2]["Description of capital asset"], "2 NULL110");

const output = stringifyOltCsv(rows);
assert.match(output, /^Description of capital asset,/);
assert.match(output, /1935\.29 PLI,01\/08\/2024,01\/04\/2025,83\.8,68\.91/);
assert.doesNotMatch(output, /0\.00000035 EQ/);
assert.doesNotMatch(output, /100 DUSTLOW/);
assert.doesNotMatch(output, /10\.000024 XAH/);
assert.doesNotMatch(output, /11 XDC/);
assert.match(output, /100 DUSTKEEP,01\/08\/2025,01\/08\/2025,0,0\.51/);

console.log("Smoke test passed.");
