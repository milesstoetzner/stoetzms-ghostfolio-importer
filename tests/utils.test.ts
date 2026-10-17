import {describe, it} from 'node:test'
import assert from 'node:assert/strict'
import {convertPrice, parseDate, parseNumber} from '../src/utils/utils'

describe('parseNumber', () => {
    it('parses a decimal comma', () => assert.equal(parseNumber('12,34'), 12.34))
    it('parses a decimal point', () => assert.equal(parseNumber('69.1234'), 69.1234))
    it('parses German thousands separators', () => assert.equal(parseNumber('1.234,56'), 1234.56))
    it('parses English thousands separators', () => assert.equal(parseNumber('1,234.56'), 1234.56))
    it('parses several thousands separators', () => {
        assert.equal(parseNumber('1.234.567'), 1234567)
        assert.equal(parseNumber('1,234,567'), 1234567)
        assert.equal(parseNumber('1.234.567,89'), 1234567.89)
    })
    it('parses a known decimal separator', () => {
        assert.equal(parseNumber('1.250', ','), 1250)
        assert.equal(parseNumber('1,250', '.'), 1250)
        assert.equal(parseNumber('0,5', ','), 0.5)
    })
    it('ignores whitespace and apostrophe separators', () => {
        assert.equal(parseNumber(' 1 234,56 '), 1234.56)
        assert.equal(parseNumber("1'234.56"), 1234.56)
    })
    it('rejects text', () => assert.throws(() => parseNumber('abc'), /not a number/))
    it('rejects trailing junk', () => assert.throws(() => parseNumber('12,34EUR'), /not a number/))
    it('rejects an empty string', () => assert.throws(() => parseNumber(''), /not a number/))
})

describe('parseDate', () => {
    it('parses to midnight UTC', () =>
        assert.equal(parseDate('01', '02', '2024').toISOString(), '2024-02-01T00:00:00.000Z'))
    it('rejects an invalid date', () => assert.throws(() => parseDate('xx', '02', '2024'), /invalid date/))
})

describe('convertPrice', () => {
    it('divides by the rate', () => assert.equal(convertPrice(10, 2), 5))
    it('passes through without a rate', () => assert.equal(convertPrice(10), 10))
})
