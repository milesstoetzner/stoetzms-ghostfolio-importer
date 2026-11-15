import {describe, it} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {ScalableCapitalInput, parseScalableCapitalDetails} from '../src/inputs/scalable-capital'
import {Transaction, TransactionType} from '../src/types'
import {FIXTURES, fixture} from './fixtures'

function parse(name: string): Transaction | string {
    return parseScalableCapitalDetails(fixture('scalable-capital-json', name, 'json'), name + '.json')
}

function row(result: Transaction | string) {
    assert.equal(typeof result, 'object', `expected a transaction, got "${result}"`)
    const it = result as Transaction
    return [it.type, it.ISIN, it.quantity, it.price, it.currency, it.date.toISOString()]
}

function envelope(name: string) {
    return JSON.parse(fixture('scalable-capital-json', name, 'json'))
}

describe('scalable-capital json (sc broker transaction details)', () => {
    it('imports a filled buy with the average price on the day of the fill', () => {
        // The last event is the evening before in UTC; the FILLED entry carries the trade date.
        assert.deepEqual(row(parse('buy')), [
            TransactionType.BUY,
            'IE00BFY0GT14',
            10.5,
            85.12,
            'EUR',
            '2024-03-15T00:00:00.000Z',
        ])
    })

    it('imports a savings plan execution as a buy', () => {
        assert.deepEqual(row(parse('savings-plan')), [
            TransactionType.BUY,
            'DE0007164600',
            0.081,
            1234.5679,
            'EUR',
            '2024-04-01T00:00:00.000Z',
        ])
    })

    it('imports a filled sell', () => {
        assert.deepEqual(row(parse('sell')), [
            TransactionType.SELL,
            'DE0007164600',
            5,
            240.3,
            'EUR',
            '2024-04-02T00:00:00.000Z',
        ])
    })

    it('imports a distribution as a dividend of quantity 1', () => {
        assert.deepEqual(row(parse('distribution')), [
            TransactionType.DIVIDEND,
            'IE00BFY0GT14',
            1,
            41.47,
            'EUR',
            '2024-06-20T00:00:00.000Z',
        ])
    })

    it('skips everything else with a reason', () => {
        assert.equal(parse('cancelled'), 'order CANCELLED')
        assert.equal(parse('deposit'), 'cash DEPOSIT')
        assert.equal(parse('transfer-in'), 'non-trade TRANSFER_IN')

        const pending = envelope('buy')
        pending.data.result.is_pending = true
        assert.equal(parseScalableCapitalDetails(JSON.stringify(pending), 'x'), 'pending')
    })

    it('records where a transaction came from', () => {
        const it = parse('buy') as Transaction
        assert.deepEqual(
            {...it._meta, version: undefined},
            {provider: 'scalable-capital', format: 'json', file: 'buy.json', id: 'tx-buy', version: undefined}
        )
    })

    it('accepts decimal strings for numbers', () => {
        const buy = envelope('buy')
        buy.data.result.security_trade.average_price = '85.12'
        buy.data.result.security_trade.number_of_shares.filled = '10.5'
        const it = parseScalableCapitalDetails(JSON.stringify(buy), 'x') as Transaction
        assert.equal(it.price, 85.12)
        assert.equal(it.quantity, 10.5)
    })

    it('fails on a CLI error envelope', () => {
        const error = {
            ok: false,
            command: 'broker.transaction.details',
            error: {code: 'no_session', message: "No active session. Run 'sc login'."},
        }
        assert.throws(
            () => parseScalableCapitalDetails(JSON.stringify(error), 'x'),
            /Scalable CLI reported an error: no_session: No active session/
        )
    })

    it('fails on other JSON, e.g. the transaction list', () => {
        assert.throws(() => parseScalableCapitalDetails('{"foo": 1}', 'x'), /sc broker transaction details --json/)
        const list = {ok: true, command: 'broker.transactions', data: {result: {items: [], cursor: null}}}
        assert.throws(
            () => parseScalableCapitalDetails(JSON.stringify(list), 'x'),
            /sc broker transaction details --json/
        )
    })

    it('fails on a filled trade without usable numbers', () => {
        const buy = envelope('buy')
        buy.data.result.security_trade.average_price = 'n/a'
        assert.throws(
            () => parseScalableCapitalDetails(JSON.stringify(buy), 'x'),
            /transaction tx-buy: average_price "n\/a" is not a positive number/
        )
    })

    it('reads a directory of detail files', async () => {
        const transactions = await new ScalableCapitalInput().read({
            inputDir: path.join(FIXTURES, 'scalable-capital-json'),
            inputProvider: 'scalable-capital',
            inputFormat: 'json',
        })
        assert.deepEqual(
            transactions.map(it => it._meta.id),
            ['tx-buy', 'tx-distribution', 'tx-savings-plan', 'tx-sell']
        )
    })

    it('fails the run on an unreadable file unless errors are ignored', async () => {
        const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sc-details-'))
        try {
            await fs.copyFile(path.join(FIXTURES, 'scalable-capital-json', 'buy.json'), path.join(dir, 'buy.json'))
            await fs.writeFile(path.join(dir, 'broken.json'), '{')
            const options = {inputDir: dir, inputProvider: 'scalable-capital', inputFormat: 'json'}
            await assert.rejects(new ScalableCapitalInput().read(options), /1 of 2 JSON files could not be read/)
            assert.equal((await new ScalableCapitalInput().read({...options, ignoreErrors: true})).length, 1)
        } finally {
            await fs.rm(dir, {recursive: true, force: true})
        }
    })
})
