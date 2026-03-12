# koinly-csv-to-olt-csv

Convert a Koinly capital gains CSV export into an OLT import CSV for Form 8949 transactions.

## What it does

This converter reads the Koinly capital gains export format shown below:

- skips the report title/preamble rows before the real header
- keeps one output row per Koinly row
- formats dates as `MM/DD/YYYY`
- strips thousands separators from numbers
- maps `Short term` to `SHORT` and checkbox `C`
- maps `Long term` to `LONG` and checkbox `F`
- drops rows whose rounded whole-dollar gain or loss is zero
- fills OLT defaults based on your prior import sample:
  - `Reported to IRS` = `NONE`
  - `Basis Reported to IRS` = `No`
  - most other OLT columns remain blank

## Usage

Install dependencies:

```bash
npm install
```

Convert a file:

```bash
npm run convert -- ./koinly.csv ./olt.csv
```

Or let the script choose the output name automatically:

```bash
npm run convert -- ./koinly.csv
```

That writes `./koinly.olt.csv`.

## Column mapping

- `Description of capital asset` <- `Amount` + space + `Asset`
- `Date acquired ` <- `Date Acquired`
- `Date sold ` <- `Date Sold`
- `Proceeds or Sales Price ($)` <- `Proceeds (USD)`
- `Cost or other basis ($)` <- `Cost (USD)`
- `Long Term/Short Term/Ordinary ` <- derived from `Holding period`
- `Applicable Checkbox on Form 8949` <- `C` for short-term, `F` for long-term

## Notes

- The script currently assumes Koinly's USD-based capital gains export headers.
- It removes rows when `round(proceeds) - round(basis) = 0`.
- It keeps rows that would round to at least a `$1` gain or loss, such as `0.51` basis with `0` proceeds.
- It does not infer wash sales, adjustments, or payer details.

## Verify

Run the smoke test:

```bash
npm test
```
