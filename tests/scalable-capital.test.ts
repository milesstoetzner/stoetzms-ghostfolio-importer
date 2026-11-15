import {describe, it} from 'node:test'
import assert from 'node:assert/strict'
import ScalableCapital from '../src/inputs/scalable-capital'
import {TransactionType} from '../src/types'
import {fixture} from './fixtures'

function extract(name: string) {
    return new ScalableCapital(fixture('scalable-capital', name), name + '.pdf').data
}

describe('scalable-capital', () => {
    it('buy', () => {
        const data = extract('buy')
        assert.equal(data.type, TransactionType.BUY)
        assert.equal(data.ISIN, 'IE00B4L5Y983')
        assert.equal(data.quantity, 10.5)
        assert.equal(data.price, 85.12)
        assert.equal(data.currency, 'EUR')
        assert.equal(data.date.toISOString(), '2024-03-15T00:00:00.000Z')
        assert.equal(data._meta.provider, 'scalable-capital')
        assert.equal(data._meta.file, 'buy.pdf')
    })

    it('buy with thousands separators', () => {
        const data = extract('buy-large')
        assert.equal(data.type, TransactionType.BUY)
        assert.equal(data.ISIN, 'LU1681048804')
        assert.equal(data.quantity, 1250)
        assert.equal(data.price, 1234.56)
        assert.equal(data.currency, 'EUR')
    })

    it('sell (tabular execution details)', () => {
        const data = extract('sell')
        assert.equal(data.type, TransactionType.SELL)
        assert.equal(data.ISIN, 'LU0908500753')
        assert.equal(data.quantity, 5)
        assert.equal(data.price, 240.3)
        assert.equal(data.currency, 'EUR')
        assert.equal(data.date.toISOString(), '2024-04-02T00:00:00.000Z')
    })

    it('dividend in USD is converted to EUR', () => {
        const data = extract('dividend')
        assert.equal(data.type, TransactionType.DIVIDEND)
        assert.equal(data.ISIN, 'IE00B4L5Y983')
        assert.equal(data.quantity, 100)
        assert.equal(data.currency, 'EUR')
        assert.ok(Math.abs(data.price - 0.45 / 1.085) < 1e-9, `price ${data.price}`)
        assert.equal(data.date.toISOString(), '2024-06-20T00:00:00.000Z')
    })

    it('rejects a document without a transaction type', () => {
        assert.throws(() => new ScalableCapital('Kosteninformation\nISIN: IE00B4L5Y983', 'x.pdf').data, /unknown type/)
    })
})
