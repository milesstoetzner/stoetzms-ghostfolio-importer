import {describe, it} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import * as reader from 'pdf-text-reader'
import ScalableCapital from '../src/inputs/scalable-capital'
import TradeRepublic from '../src/inputs/trade-republic'
import {FIXTURES, fixture} from './fixtures'
import {parseScalableCapitalJson} from '../src/inputs/scalable-capital-json'

const EXAMPLES = path.join(import.meta.dirname, '..', 'examples', 'inputs')

const extractors = {
    'scalable-capital': ScalableCapital,
    'trade-republic': TradeRepublic,
}

/**
 * The example PDFs are rendered from the fixtures (yarn examples:generate). Reading them back through the
 * real PDF pipeline must give the same transactions as the fixture text, which proves both that the
 * examples are in sync and that PDF text extraction behaves as the extractors expect.
 */
describe('example JSON', () => {
    it('scalable-capital-json/transactions.json matches its fixture', () => {
        const file = path.join(EXAMPLES, 'scalable-capital-json', 'transactions.json')
        assert.ok(fs.existsSync(file), `${file} is missing, run "yarn examples:generate"`)
        assert.deepEqual(
            parseScalableCapitalJson(fs.readFileSync(file, 'utf-8'), file).transactions.map(it => ({
                ...it,
                _meta: undefined,
            })),
            parseScalableCapitalJson(fixture('scalable-capital-json', 'transactions', 'json'), file).transactions.map(
                it => ({...it, _meta: undefined})
            )
        )
    })
})

describe('example PDFs', () => {
    for (const [provider, Extractor] of Object.entries(extractors)) {
        const names = fs
            .readdirSync(path.join(FIXTURES, provider))
            .filter(it => it.endsWith('.txt'))
            .map(it => it.replace(/\.txt$/, ''))

        for (const name of names) {
            it(`${provider}/${name}.pdf matches its fixture`, async () => {
                const file = path.join(EXAMPLES, provider, name + '.pdf')
                assert.ok(fs.existsSync(file), `${file} is missing, run "yarn examples:generate"`)
                const raw = await reader.readPdfText({url: file} as reader.ReadPdfTextParams)
                const fromPdf = new Extractor(raw, file).data
                const fromText = new Extractor(fixture(provider, name), file).data
                assert.deepEqual(fromPdf, fromText)
            })
        }
    }
})
