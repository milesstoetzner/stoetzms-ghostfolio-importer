import {describe, it} from 'node:test'
import assert from 'node:assert/strict'
import Ghostfolio from '../src/ghostfolio/mapper'
import {Transaction, TransactionType} from '../src/types'

const transaction: Transaction = {
    type: TransactionType.BUY,
    ISIN: 'IE00B4L5Y983',
    quantity: 2,
    price: 85.12,
    currency: 'EUR',
    date: new Date('2024-03-15T00:00:00.000Z'),
}

describe('ghostfolio', () => {
    it('maps transactions to activities', () => {
        const ghost = new Ghostfolio({
            accountId: 'account',
            transactions: [transaction],
            map: {IE00B4L5Y983: 'EUNL.DE'},
        })
        assert.equal(ghost.data.activities.length, 1)
        const activity = ghost.data.activities[0]
        assert.equal(activity.accountId, 'account')
        assert.equal(activity.type, 'BUY')
        assert.equal(activity.symbol, 'EUNL.DE')
        assert.equal(activity.quantity, 2)
        assert.equal(activity.unitPrice, 85.12)
        assert.equal(activity.currency, 'EUR')
        assert.equal(activity.date, '2024-03-15T00:00:00.000Z')
        assert.equal(activity.fee, 0)
        assert.equal(activity.dataSource, 'YAHOO')
    })

    it('fails on an unmapped ISIN', () => {
        const ghost = new Ghostfolio({accountId: 'account', transactions: [transaction], map: {}})
        assert.throws(() => ghost.data, /no symbol for ISIN: IE00B4L5Y983/)
    })
})
