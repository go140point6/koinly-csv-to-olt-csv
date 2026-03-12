#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { parse } = require("csv-parse/sync");
const { stringify } = require("csv-stringify/sync");

const REQUIRED_KOINLY_COLUMNS = [
  "Date Sold",
  "Date Acquired",
  "Asset",
  "Amount",
  "Cost (USD)",
  "Proceeds (USD)",
  "Holding period",
];

const OLT_COLUMNS = [
  "Description of capital asset",
  "Date acquired ",
  "Date sold ",
  "Proceeds or Sales Price ($)",
  "Cost or other basis ($)",
  "Code(s) ",
  "Adjustments to gain or loss ($)",
  "Accrued market discount ($)",
  "Wash sale loss disallowed ($)",
  "Long Term/Short Term/Ordinary ",
  "Collectibles/QOF ",
  "Federal Income Tax Withheld ($)",
  "Noncovered Security",
  "Reported to IRS",
  "Loss not allowed based on amount in 1d ",
  "Basis Reported to IRS ",
  "Bartering ",
  "Applicable Checkbox on Form 8949",
  "Whose Capital Assets ",
  "Payer Name",
  "Payer TIN",
  "Foreign Address? ",
  "Payer Address line 1",
  "Payer Address line 2",
  "Payer City",
  "Payer State",
  "Payer Zip",
  "Payer Country Code",
  "Form Type ",
];

function findHeaderIndex(lines) {
  return lines.findIndex((line) =>
    REQUIRED_KOINLY_COLUMNS.every((column) => line.includes(column)),
  );
}

function normalizeNumber(value) {
  if (value === undefined || value === null) {
    return "";
  }

  const normalized = String(value).replaceAll(",", "").trim();
  if (normalized === "") {
    return "";
  }

  const asNumber = Number(normalized);
  if (!Number.isFinite(asNumber)) {
    throw new Error(`Invalid numeric value: ${value}`);
  }

  return normalized;
}

function roundToWholeDollars(value) {
  const normalized = normalizeNumber(value);
  if (normalized === "") {
    return 0;
  }

  return Math.round(Number(normalized));
}

function formatKoinlyDate(value) {
  const match = String(value)
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/);

  if (!match) {
    throw new Error(`Invalid Koinly date: ${value}`);
  }

  const [, month, day, year] = match;
  return `${month.padStart(2, "0")}/${day.padStart(2, "0")}/${year}`;
}

function mapHoldingPeriod(value) {
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "short term") {
    return { term: "SHORT", checkbox: "C" };
  }
  if (normalized === "long term") {
    return { term: "LONG", checkbox: "F" };
  }

  throw new Error(`Unsupported holding period: ${value}`);
}

function parseKoinlyCsv(inputText) {
  const lines = inputText.split(/\r?\n/);
  const headerIndex = findHeaderIndex(lines);
  if (headerIndex === -1) {
    throw new Error("Could not find the Koinly CSV header row.");
  }

  const csvText = lines.slice(headerIndex).join("\n");
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
    trim: true,
  });

  for (const column of REQUIRED_KOINLY_COLUMNS) {
    if (!records[0] || !(column in records[0])) {
      throw new Error(`Missing expected Koinly column: ${column}`);
    }
  }

  return records;
}

function convertRecord(record) {
  const { term, checkbox } = mapHoldingPeriod(record["Holding period"]);
  const amount = normalizeNumber(record.Amount);
  const asset = String(record.Asset).trim();

  return {
    "Description of capital asset": `${amount} ${asset}`.trim(),
    "Date acquired ": formatKoinlyDate(record["Date Acquired"]),
    "Date sold ": formatKoinlyDate(record["Date Sold"]),
    "Proceeds or Sales Price ($)": normalizeNumber(record["Proceeds (USD)"]),
    "Cost or other basis ($)": normalizeNumber(record["Cost (USD)"]),
    "Code(s) ": "",
    "Adjustments to gain or loss ($)": "",
    "Accrued market discount ($)": "",
    "Wash sale loss disallowed ($)": "",
    "Long Term/Short Term/Ordinary ": term,
    "Collectibles/QOF ": "",
    "Federal Income Tax Withheld ($)": "",
    "Noncovered Security": "",
    "Reported to IRS": "NONE",
    "Loss not allowed based on amount in 1d ": "",
    "Basis Reported to IRS ": "No",
    "Bartering ": "",
    "Applicable Checkbox on Form 8949": checkbox,
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
  };
}

function shouldSkipRecord(record) {
  return (
    roundToWholeDollars(record["Proceeds (USD)"]) -
      roundToWholeDollars(record["Cost (USD)"]) ===
    0
  );
}

function convertKoinlyCsv(inputText) {
  const records = parseKoinlyCsv(inputText);
  return records.filter((record) => !shouldSkipRecord(record)).map(convertRecord);
}

function stringifyOltCsv(records) {
  return stringify(records, {
    header: true,
    columns: OLT_COLUMNS,
    record_delimiter: "\n",
  });
}

function defaultOutputPath(inputPath) {
  const parsed = path.parse(inputPath);
  return path.join(parsed.dir, `${parsed.name}.olt${parsed.ext || ".csv"}`);
}

function main(argv) {
  const [, , inputPath, outputPathArg] = argv;
  if (!inputPath) {
    console.error("Usage: node bin/koinly-to-olt.js <input.csv> [output.csv]");
    process.exitCode = 1;
    return;
  }

  const outputPath = outputPathArg || defaultOutputPath(inputPath);
  const inputText = fs.readFileSync(inputPath, "utf8");
  const sourceRecords = parseKoinlyCsv(inputText);
  const skippedCount = sourceRecords.filter(shouldSkipRecord).length;
  const oltRecords = sourceRecords
    .filter((record) => !shouldSkipRecord(record))
    .map(convertRecord);
  const outputText = stringifyOltCsv(oltRecords);
  fs.writeFileSync(outputPath, outputText);
  console.log(
    `Wrote ${oltRecords.length} rows to ${outputPath} (skipped ${skippedCount} rows with no whole-dollar tax consequence)`,
  );
}

if (require.main === module) {
  main(process.argv);
}

module.exports = {
  OLT_COLUMNS,
  convertKoinlyCsv,
  parseKoinlyCsv,
  shouldSkipRecord,
  stringifyOltCsv,
};
