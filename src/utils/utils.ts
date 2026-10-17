import assert from 'node:assert'

export type DecimalSeparator = ',' | '.'

/**
 * Parses a number as printed in a broker document.
 *
 * German documents print "1.234,56", English ones "1,234.56". When the decimal separator is known
 * (e.g. Scalable Capital always prints German numbers) pass it, and the other character is treated as
 * a thousands separator. Without a hint the format is detected: if both characters occur, the last one
 * is the decimal separator; a single occurrence of one character is a decimal separator; several
 * occurrences are thousands separators. The one ambiguous case, "1.234" with only one dot, is read as
 * a decimal point.
 */
export function parseNumber(raw: string, decimal?: DecimalSeparator): number {
    let value = raw.trim().replace(/[\s\u00a0\u202f']/g, '')

    const comma = value.lastIndexOf(',')
    const dot = value.lastIndexOf('.')

    if (decimal === ',') {
        value = value.replace(/\./g, '').replace(',', '.')
    } else if (decimal === '.') {
        value = value.replace(/,/g, '')
    } else if (comma !== -1 && dot !== -1) {
        value = comma > dot ? value.replace(/\./g, '').replace(',', '.') : value.replace(/,/g, '')
    } else if (comma !== -1) {
        value = value.split(',').length > 2 ? value.replace(/,/g, '') : value.replace(',', '.')
    } else if (dot !== -1) {
        if (value.split('.').length > 2) value = value.replace(/\./g, '')
    }

    if (!/^[+-]?\d+(\.\d+)?$/.test(value)) throw new Error(`raw "${raw}" not a number`)
    return Number(value)
}

export function parseDate(day: string, month: string, year: string) {
    const value = year + '-' + month + '-' + day + ' ' + '00:00:00 UTC'
    const date = Date.parse(value)
    if (isNaN(date)) throw new Error(`invalid date: ${value}`)
    return new Date(date)
}

export function convertPrice(price: number, rate?: number) {
    if (isDefined(rate)) return price * (1 / rate)
    return price
}

export function isUndefined(element: unknown): element is undefined | null {
    return typeof element === 'undefined' || element === null || element == null
}

export function isDefined<T>(element: T | undefined | null): element is T {
    return !isUndefined(element)
}
