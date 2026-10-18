# Ghostfolio Importer

[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-blue.svg)](https://www.contributor-covenant.org/version/2/0/code_of_conduct/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm](https://img.shields.io/badge/npm-ghostfolio--importer-blue)](https://www.npmjs.com/package/ghostfolio-importer)

`ghostfolio-importer` is a utility to import transactions from Scalable Capital and Trade Republic into Ghostfolio.

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
| ignore-errors  | false     | flag               | Skip PDFs that cannot be parsed instead of failing the run. Skipped files are reported on stderr. |

### Trade Republic

Import transactions from Trade Republic.

| Option         | Mandatory | Value            | Description |
| -------------- | --------- | ---------------- | ----------- |
| input-filter   | false     | string           |             |
| input-dir      | true      | string           |             |
| input-provider | true      | `trade-republic` |             |
| input-format   | true      | `pdf`            |             |
| ignore-errors  | false     | flag             | Skip PDFs that cannot be parsed instead of failing the run. Skipped files are reported on stderr. |

### Internal

Import transactions from a file using the internal transaction format, e.g. one written by the `internal` output provider.

| Option         | Mandatory | Value          | Description |
| -------------- | --------- | -------------- | ----------- |
| input-file     | true      | string         |             |
| input-provider | true      | `internal`     |             |
| input-format   | true      | `json`, `yaml` |             |

## Output Providers

### Ghostfolio

Export transactions for Ghostfolio ...

| Option                | Mandatory | Value                                 | Description |
| --------------------- | --------- | ------------------------------------- | ----------- |
| output-provider       | true      | `ghostfolio`                          |             |
| output-format         | true      | `console`, `yaml`, `json`, `endpoint` |             |
| ghostfolio-account-id | true      | string                                |             |
| ghostfolio-map        | true      | string                                | Path to a JSON file mapping ISINs to Yahoo symbols |

Ghostfolio identifies a security by its symbol at the data provider, not by ISIN, so every ISIN that occurs in the input needs an entry in the map. The run fails on the first ISIN without one. A starting point with a few common ETFs is in [`examples/ghostfolio-map.json`](../examples/ghostfolio-map.json):

```json
{
    "IE00B4L5Y983": "EUNL.DE",
    "LU0908500753": "MEUD.PA"
}
```

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

### Internal

Export transactions not for a specific provider but using the internal transaction format.

| Option          | Mandatory | Value                     | Description                             |
| --------------- | --------- | ------------------------- | --------------------------------------- |
| output-provider | true      | `internal`                |                                         |
| output-format   | true      | `console`, `json`, `yaml` |                                         |
| output-file     | false     | string                    | Only used with `json` and `yaml` output |

## Development

```
yarn install
yarn test          # unit tests, including the example PDFs below
yarn typecheck
yarn lint
yarn format
```

The provider was called `none` before; that name still works.

### Example inputs

`examples/inputs/<provider>/*.pdf` are synthetic broker documents, rendered from the text fixtures in `tests/fixtures` by `yarn examples:generate`. They contain no real data, but they have the layout the extractors expect, so the CLI can be exercised without real statements:

```
yarn start transform --input-dir examples/inputs/trade-republic --input-provider trade-republic --output-provider internal --output-format console
```

When you add or change a fixture, re-run `yarn examples:generate` and commit the PDFs; the tests check that both stay in sync.

### Local Ghostfolio

`dev/docker-compose.yaml` runs Ghostfolio with Postgres and Redis (Docker required):

```
yarn dev:up        # start, http://localhost:3333 is up after about a minute on the first run
yarn dev:user      # create a user and print account id, bearer token and an import command
yarn dev:logs
yarn dev:down      # stop and delete all data
```

`yarn dev:user` creates a new Ghostfolio user and prints everything the importer needs. The security token it shows signs you in on the web UI to inspect the result; the bearer token goes into `--ghostfolio-token`, the import endpoint is `http://localhost:3333/api/v1/import`. Bearer tokens for another Ghostfolio instance can be obtained the same way, by exchanging the security token:

```
curl -X POST https://<ghostfolio>/api/v1/auth/anonymous -H 'Content-Type: application/json' -d '{"accessToken":"<security token>"}'
```

The credentials in `dev/ghostfolio.env` are for this throwaway instance only.

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
