import {describe, it} from 'node:test'
import assert from 'node:assert/strict'
import {parseScalableCapitalJson} from '../src/inputs/scalable-capital-json'
import {TransactionType} from '../src/types'
import {fixture} from './fixtures'

const text = fixture('scalable-capital-json', 'transactions', 'json')

describe('scalable-capital json', () => {
    it('imports filled buys, sells and distributions and skips the rest', () => {
        const {transactions, skipped} = parseScalableCapitalJson(text, 'transactions.json')
        assert.deepEqual(
            transactions.map(it => [it.type, it.ISIN, it.quantity, it.price, it.currency, it.date.toISOString()]),
            [
                [TransactionType.BUY, 'IE00B4L5Y983', 10.5, 85.12, 'EUR', '2024-03-15T10:15:22.000Z'],
                [TransactionType.BUY, 'LU1681048804', 0.081, 100 / 0.081, 'EUR', '2024-04-01T08:00:00.000Z'],
                [TransactionType.SELL, 'LU0908500753', 5, 240.3, 'EUR', '2024-04-02T09:05:01.000Z'],
                [TransactionType.DIVIDEND, 'IE00B4L5Y983', 1, 41.47, 'EUR', '2024-06-20T00:00:00.000Z'],
            ]
        )
        assert.deepEqual(skipped, [
            {id: 'tx-deposit', reason: 'cash transaction DEPOSIT'},
            {id: 'tx-pending', reason: 'status PENDING'},
            {id: 'tx-cancelled', reason: 'cancellation'},
        ])
        assert.equal(transactions[0]._meta.provider, 'scalable-capital')
        assert.equal(transactions[0]._meta.format, 'json')
        assert.equal(transactions[0]._meta.id, 'tx-buy')
        assert.equal(transactions[0]._meta.file, 'transactions.json')
    })

    it('accepts the bare data object and a bare list', () => {
        const data = JSON.parse(text).data
        assert.equal(parseScalableCapitalJson(JSON.stringify(data), 'x').transactions.length, 4)
        assert.equal(parseScalableCapitalJson(JSON.stringify(data.items), 'x').transactions.length, 4)
    })

    it('accepts timestamps as {time} objects and numbers as numbers', () => {
        const item = {
            ...JSON.parse(text).data.items[0],
            last_event_datetime: {time: '2024-03-15T10:15:22Z'},
            quantity: 10.5,
            amount: -893.76,
        }
        const {transactions} = parseScalableCapitalJson(JSON.stringify([item]), 'x')
        assert.equal(transactions[0].price, 85.12)
        assert.equal(transactions[0].date.toISOString(), '2024-03-15T10:15:22.000Z')
    })

    it('fails on a CLI error envelope', () => {
        const envelope = {ok: false, command: 'broker.transactions', error: {code: 'auth', message: 'not logged in'}}
        assert.throws(
            () => parseScalableCapitalJson(JSON.stringify(envelope), 'x'),
            /CLI reported an error: not logged in/
        )
    })

    it('fails on unrelated JSON', () => {
        assert.throws(() => parseScalableCapitalJson('{"foo": 1}', 'x'), /sc broker transactions --json/)
    })

    it('fails on a filled trade without usable numbers', () => {
        const item = {...JSON.parse(text).data.items[0], amount: 'n/a'}
        assert.throws(
            () => parseScalableCapitalJson(JSON.stringify([item]), 'x'),
            /transaction tx-buy: amount "n\/a" is not a number/
        )
    })
})
