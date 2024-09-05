# Ghostfolio Importer

[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-blue.svg)](https://vintner.opentosca.org/code-of-conduct)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm](https://img.shields.io/badge/npm-ghostfolio--importer-blue)](https://www.npmjs.com/package/ghostfolio-importer)

`ghostfolio-importer` is a simple utility to import transactions from Scalable Capital and Trade Republic into Ghostfolio.

## Usage

```
npx ghostfolio-importer transform [options]
```

## Internal Transaction Format

We use the following internal format for transactions.

| Property | Mandatory | Value                     | Description |
|----------|-----------|---------------------------|-------------|
| type     | true      | `BUY`, `SELL`, `DIVIDEND` |             |
| ISIN     | true      | string                    |             |
| quantity | true      | number                    |             |
| price    | true      | number                    |             |
| currency | true      | `EUR`, `USD`              |             |
| date     | true      | date                      |             |
| _meta    | false     | any                       |             |

## Input Providers

### Scalable Capital

Import transactions from Scalable Capital.

| Option         | Mandatory | Value              | Description |
| -------------- | --------- | ------------------ | ----------- |
| input-filter   | false     | string             |             |
| input-dir      | true      | string             |             |
| input-provider | true      | `scalable-capital` |             |
| input-format   | true      | `pdf`              |             |

### Trade Republic

Import transactions from Trade Republic.

| Option         | Mandatory | Value            | Description |
| -------------- | --------- | ---------------- | ----------- |
| input-filter   | false     | string           |             |
| input-dir      | true      | string           |             |
| input-provider | true      | `trade-republic` |             |
| input-format   | true      | `pdf`            |             |

### None

Import transactions from a file using the internal transaction format.

| Option         | Mandatory | Value          | Description |
| -------------- | --------- | -------------- | ----------- |
| input-file     | false     | string         |             |
| input-provider | true      | `none`         |             |
| input-format   | true      | `json`, `yaml` |             |

## Output Providers

### Ghostfolio

Export transactions for Ghostfolio ...

| Option                | Mandatory | Value                                 | Description |
| --------------------- | --------- | ------------------------------------- | ----------- |
| output-provider       | true      | `ghostfolio`                          |             |
| output-format         | true      | `console`, `yaml`, `json`, `endpoint` |             |
| ghostfolio-account-id | true      | string                                |             |
| ghostfolio-map        | false     | string                                |             |

... into the console.

| Option        | Mandatory | Value     | Description |
| ------------- | --------- | --------- | ----------- |
| output-format | true      | `console` |             |

... into a file.

| Option        | Mandatory | Value          | Description |
| ------------- | --------- | -------------- | ----------- |
| output-format | true      | `json`, `yaml` |             |
| output-file   | true      | string         |             |

... into Ghostfolio.

| Option              | Mandatory | Value      | Description |
| ------------------- | --------- | ---------- | ----------- |
| output-format       | true      | `endpoint` |             |
| ghostfolio-endpoint | true      | string     |             |
| ghostfolio-token    | true      | string     |             |

### None

Export transactions not for a specific provider but using the internal transaction format.

| Option          | Mandatory | Value     | Description |
| --------------- | --------- | --------- | ----------- |
| output-provider | true      | `none`    |             |
| output-format   | true      | `console` |             |

## Limitations

-   We do not support fees.
-   We do not support taxes.
-   We do only support EUR and USD.
-   We do rely on a config to map ISINs to symbols that Ghostfolio understands.
-   We do rely on transactions provided by PDF.

## Similar Projects

It is worth to check out the following projects.

-   [VibeNL/GhostfolioSidekick](https://github.com/VibeNL/GhostfolioSidekick)
-   [roboes/neobroker-portfolio-importer](https://github.com/roboes/neobroker-portfolio-importer)

## Keywords

ghostfolio, scalable capital, stock, stocks, ETF, ETFs, portfolio, import, importer, export, exporter, extract, pdf, json, yaml
