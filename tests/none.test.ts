import {describe, it} from 'node:test'
import assert from 'node:assert/strict'
import {parseTransactions} from '../src/inputs/none'
import {serializeTransactions} from '../src/outputs/none'
import {Transaction, TransactionType} from '../src/types'

const transactions: Transaction[] = [
    {
        type: TransactionType.BUY,
        ISIN: 'IE00B4L5Y983',
        quantity: 2,
        price: 85.12,
        currency: 'EUR',
        date: new Date('2024-03-15T00:00:00.000Z'),
        _meta: {provider: 'test'},
    },
    {
        type: TransactionType.DIVIDEND,
        ISIN: 'US0378331005',
        quantity: 69.1234,
        price: 0.11,
        currency: 'EUR',
        date: new Date('2024-05-15T00:00:00.000Z'),
    },
]

describe('none provider', () => {
    for (const format of ['json', 'yaml'] as const) {
        it(`round-trips ${format}`, () => {
            const text = serializeTransactions(transactions, format)
            const parsed = parseTransactions(text, format)
            assert.deepEqual(parsed, transactions)
        })
    }

    it('console output is json', () => {
        assert.equal(serializeTransactions(transactions, 'console'), serializeTransactions(transactions, 'json'))
    })

    it('rejects a non-list', () => {
        assert.throws(() => parseTransactions('{"type":"BUY"}', 'json'), /expected a list/)
    })

    it('rejects an unknown type', () => {
        const text = JSON.stringify([{...transactions[0], type: 'TRANSFER'}])
        assert.throws(() => parseTransactions(text, 'json'), /transaction #1: type must be one of BUY, SELL, DIVIDEND/)
    })

    it('rejects a string quantity', () => {
        const text = JSON.stringify([transactions[0], {...transactions[1], quantity: '1,5'}])
        assert.throws(() => parseTransactions(text, 'json'), /transaction #2: quantity must be a number/)
    })

    it('rejects a missing date', () => {
        const text = JSON.stringify([{...transactions[0], date: undefined}])
        assert.throws(() => parseTransactions(text, 'json'), /transaction #1: date must be a date/)
    })
})
