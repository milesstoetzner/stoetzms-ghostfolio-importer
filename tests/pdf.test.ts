import {describe, it} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {readPdfs} from '../src/inputs/pdf'
import ScalableCapital from '../src/extractors/scalable-capital'

const EXAMPLES = path.join(import.meta.dirname, '..', 'examples', 'inputs', 'scalable-capital')

describe('readPdfs', () => {
    it('reads byte-identical files once', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghostfolio-importer-'))
        fs.copyFileSync(path.join(EXAMPLES, 'buy.pdf'), path.join(dir, 'buy.pdf'))
        fs.copyFileSync(path.join(EXAMPLES, 'buy.pdf'), path.join(dir, 'buy (1).pdf'))
        fs.copyFileSync(path.join(EXAMPLES, 'sell.pdf'), path.join(dir, 'sell.pdf'))

        const transactions = await readPdfs(
            {inputDir: dir, inputProvider: 'scalable-capital', inputFormat: 'pdf'},
            ScalableCapital
        )
        assert.deepEqual(
            transactions.map(it => path.basename(it._meta.file)),
            ['buy (1).pdf', 'sell.pdf']
        )
    })
})
