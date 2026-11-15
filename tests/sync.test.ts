import {describe, it} from 'node:test'
import assert from 'node:assert/strict'
import {extractFingerprint, fingerprints, tagComment} from '../src/ghostfolio/fingerprint'
import {plan} from '../src/ghostfolio/sync'
import {GhostfolioClient} from '../src/ghostfolio/client'
import Ghostfolio, {GhostfolioActivity} from '../src/ghostfolio/mapper'
import {Transaction, TransactionType} from '../src/types'

const buy: Transaction = {
    type: TransactionType.BUY,
    ISIN: 'IE00B4L5Y983',
    quantity: 2,
    price: 85.12,
    currency: 'EUR',
    date: new Date('2024-03-15T00:00:00.000Z'),
    _meta: {provider: 'scalable-capital', file: '/somewhere/buy.pdf'},
}

describe('fingerprints', () => {
    it('are stable and independent of the file', () => {
        const [a] = fingerprints([buy], 'scalable-capital')
        const [b] = fingerprints(
            [{...buy, _meta: {provider: 'scalable-capital', file: '/elsewhere/copy.pdf'}}],
            'scalable-capital'
        )
        assert.equal(a, b)
        assert.match(a, /^scalable-capital:[0-9a-f]{16}$/)
    })

    it('change with any business field', () => {
        const [a] = fingerprints([buy], 'scalable-capital')
        assert.notEqual(fingerprints([buy], 'internal')[0], a)
        for (const change of [
            {quantity: 3},
            {price: 85.13},
            {currency: 'USD'},
            {type: TransactionType.SELL},
            {ISIN: 'X'},
        ])
            assert.notEqual(fingerprints([{...buy, ...change}], 'scalable-capital')[0], a)
        assert.notEqual(fingerprints([{...buy, date: new Date('2024-03-16T00:00:00.000Z')}], 'scalable-capital')[0], a)
    })

    it('keep identical transactions distinct but stable', () => {
        const [a, b] = fingerprints([buy, {...buy}], 'scalable-capital')
        assert.notEqual(a, b)
        assert.deepEqual(fingerprints([buy, {...buy}], 'scalable-capital'), [a, b])
        assert.equal(fingerprints([buy], 'scalable-capital')[0], a)
    })

    it('round-trip through the comment', () => {
        const comment = tagComment('scalable-capital:abcdef0123456789', '1.2.3')
        assert.equal(comment, 'manager=ghostfolio-importer version=1.2.3 fingerprint=scalable-capital:abcdef0123456789')
        assert.equal(extractFingerprint(comment), 'scalable-capital:abcdef0123456789')
        assert.equal(extractFingerprint(comment + ' bought on a whim'), 'scalable-capital:abcdef0123456789')
        assert.equal(extractFingerprint('fingerprint=scalable-capital:abcdef0123456789'), undefined)
        assert.equal(extractFingerprint('a manual note'), undefined)
        assert.equal(extractFingerprint(null), undefined)
    })

    it('take the provider of the run, not where a transaction came from', () => {
        assert.match(fingerprints([buy], 'internal')[0], /^internal:[0-9a-f]{16}$/)
    })

    it('are written into the activity comment by the mapper', () => {
        const ghost = new Ghostfolio({
            accountId: 'a',
            transactions: [buy],
            map: {IE00B4L5Y983: 'EUNL.DE'},
            provider: 'scalable-capital',
        })
        assert.equal(extractFingerprint(ghost.data.activities[0].comment), fingerprints([buy], 'scalable-capital')[0])
    })
})

describe('sync plan', () => {
    const sc = (hex: string) => `scalable-capital:${hex.repeat(16)}`
    const activity = (fingerprint: string): GhostfolioActivity => ({
        accountId: 'a',
        type: 'BUY',
        symbol: 'EUNL.DE',
        quantity: 1,
        unitPrice: 1,
        currency: 'EUR',
        date: '2024-01-01T00:00:00.000Z',
        fee: 0,
        dataSource: 'YAHOO',
        comment: tagComment(fingerprint, '1'),
    })
    const existing = (id: string, comment: string | null) => ({
        id,
        accountId: 'a',
        comment,
        date: '2024-01-01T00:00:00.000Z',
        type: 'BUY',
        quantity: 1,
        unitPrice: 1,
        currency: 'EUR',
    })

    it('creates missing, keeps present, flags stale, ignores manual activities', () => {
        const desired = [activity(sc('1')), activity(sc('2'))]
        const inGhostfolio = [
            existing('e1', tagComment(sc('1'), '1')),
            existing('e3', tagComment(sc('3'), '1')),
            existing('e4', 'bought manually'),
            existing('e5', null),
        ]
        const result = plan(desired, inGhostfolio, 'scalable-capital')
        assert.deepEqual(result.create, [desired[1]])
        assert.deepEqual(result.keep, [desired[0]])
        assert.deepEqual(
            result.stale.map(it => it.id),
            ['e3']
        )
    })

    it('is a no-op when everything is present', () => {
        const desired = [activity(sc('1'))]
        const result = plan(desired, [existing('e1', tagComment(sc('1'), '1'))], 'scalable-capital')
        assert.equal(result.create.length, 0)
        assert.equal(result.stale.length, 0)
        assert.equal(result.keep.length, 1)
    })
})

describe('sync plan per provider', () => {
    const activity = (fingerprint: string): GhostfolioActivity => ({
        accountId: 'a',
        type: 'BUY',
        symbol: 'EUNL.DE',
        quantity: 1,
        unitPrice: 1,
        currency: 'EUR',
        date: '2024-01-01T00:00:00.000Z',
        fee: 0,
        dataSource: 'YAHOO',
        comment: tagComment(fingerprint, '1'),
    })
    const existing = (id: string, fingerprint: string) => ({
        id,
        accountId: 'a',
        comment: tagComment(fingerprint, '1'),
        date: '2024-01-01T00:00:00.000Z',
        type: 'BUY',
        quantity: 1,
        unitPrice: 1,
        currency: 'EUR',
    })

    it('only compares activities of the input provider of the run', () => {
        const desired = [activity('scalable-capital:' + '1'.repeat(16))]
        const inGhostfolio = [
            existing('sc-old', 'scalable-capital:' + '2'.repeat(16)),
            existing('tr', 'trade-republic:' + '3'.repeat(16)),
        ]
        const result = plan(desired, inGhostfolio, 'scalable-capital')
        assert.deepEqual(
            result.stale.map(it => it.id),
            ['sc-old']
        )
    })

    it('keeps the activities of a broker when the internal provider runs', () => {
        const desired = [activity('internal:' + '1'.repeat(16))]
        const result = plan(desired, [existing('sc', 'scalable-capital:' + '1'.repeat(16))], 'internal')
        assert.equal(result.stale.length, 0)
        assert.equal(result.create.length, 1)
    })

    it('prunes nothing without inputs', () => {
        const result = plan([], [existing('sc', 'scalable-capital:' + '1'.repeat(16))], 'scalable-capital')
        assert.equal(result.stale.length, 0)
    })
})

describe('client base url', () => {
    it('accepts the origin or the import endpoint', () => {
        assert.equal(GhostfolioClient.baseUrlOf('http://localhost:3333'), 'http://localhost:3333')
        assert.equal(GhostfolioClient.baseUrlOf('http://localhost:3333/'), 'http://localhost:3333')
        assert.equal(GhostfolioClient.baseUrlOf('http://localhost:3333/api/v1/import'), 'http://localhost:3333')
        assert.equal(GhostfolioClient.baseUrlOf('https://ghostfol.io/api/v1/import/'), 'https://ghostfol.io')
    })
})
