import {describe, it} from 'node:test'
import assert from 'node:assert/strict'
import TradeRepublic from '../src/extractors/trade-republic'
import {TransactionType} from '../src/types'
import {fixture} from './fixtures'

function extract(name: string) {
    return new TradeRepublic(fixture('trade-republic', name), name + '.pdf').data
}

describe('trade-republic', () => {
    it('buy', () => {
        const data = extract('buy')
        assert.equal(data.type, TransactionType.BUY)
        assert.equal(data.ISIN, 'IE00B4L5Y983')
        assert.equal(data.quantity, 0.777777)
        assert.equal(data.price, 12.345)
        assert.equal(data.currency, 'EUR')
        assert.equal(data.date.toISOString(), '2024-02-05T00:00:00.000Z')
        assert.equal(data._meta.provider, 'trade-republic')
        assert.equal(data._meta.file, 'buy.pdf')
    })

    it('sell', () => {
        const data = extract('sell')
        assert.equal(data.type, TransactionType.SELL)
        assert.equal(data.ISIN, 'LU0908500753')
        assert.equal(data.quantity, 3)
        assert.equal(data.price, 245.1)
        assert.equal(data.currency, 'EUR')
        assert.equal(data.date.toISOString(), '2024-07-11T00:00:00.000Z')
    })

    it('dividend in USD is converted to EUR', () => {
        const data = extract('dividend')
        assert.equal(data.type, TransactionType.DIVIDEND)
        assert.equal(data.ISIN, 'US0378331005')
        assert.equal(data.quantity, 69.1234)
        assert.equal(data.currency, 'EUR')
        assert.ok(Math.abs(data.price - 0.123 / 1.0845) < 1e-9, `price ${data.price}`)
        assert.equal(data.date.toISOString(), '2024-05-15T00:00:00.000Z')
    })

    it('rejects a document without a transaction type', () => {
        assert.throws(() => new TradeRepublic('Kontoauszug\nISIN: IE00B4L5Y983', 'x.pdf').data, /no transaction type/)
    })
})
