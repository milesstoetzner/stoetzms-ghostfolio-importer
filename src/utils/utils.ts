import parseDecimalNumber from 'parse-decimal-number'

export type DecimalSeparator = ',' | '.'

const FORMATS: Record<DecimalSeparator, {thousands: string; decimal: string}> = {
    ',': {thousands: '.', decimal: ','},
    '.': {thousands: ',', decimal: '.'},
}

/**
 * Parses a number as printed in a broker document.
 *
 * German documents print "1.234,56", English ones "1,234.56". When the decimal separator is known
 * (e.g. Scalable Capital always prints German numbers) pass it. Without a hint the format is detected:
 * if both characters occur, the last one is the decimal separator; a lone comma is a decimal separator;
 * a lone dot is a decimal point (so "1.234" is one point two three four); repeated separators are
 * thousands separators. The parsing itself is done by parse-decimal-number with grouping enforced, so
 * anything that is not a well-formed number in the chosen format is rejected.
 */
export function parseNumber(raw: string, decimal?: DecimalSeparator): number {
    const value = raw.trim().replace(/[\s\u00a0\u202f']/g, '')
    for (const format of decimal ? [FORMATS[decimal]] : detect(value)) {
        const parsed = parseDecimalNumber(value, format, true)
        if (!isNaN(parsed)) return parsed
    }
    throw new Error(`raw "${raw}" not a number`)
}

function detect(value: string) {
    const comma = value.lastIndexOf(',')
    const dot = value.lastIndexOf('.')
    const german = comma !== -1 && (dot === -1 || comma > dot) && value.indexOf(',') === comma
    return german ? [FORMATS[','], FORMATS['.']] : [FORMATS['.'], FORMATS[',']]
}

/**
 * Builds midnight UTC of the given day. Documents carry no time zone, so the calendar day is kept as is.
 */
export function parseDate(day: string, month: string, year: string) {
    const value = `${year}-${month}-${day}`
    const [y, m, d] = [Number(year), Number(month), Number(day)]
    if (!/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month) || !/^\d{1,2}$/.test(day))
        throw new Error(`invalid date: ${value}`)
    const date = new Date(Date.UTC(y, m - 1, d))
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d)
        throw new Error(`invalid date: ${value}`)
    return date
}

export function convertPrice(price: number, rate?: number) {
    if (isDefined(rate)) return price * (1 / rate)
    return price
}

export function isUndefined(element: unknown): element is undefined | null {
    return typeof element === 'undefined' || element === null
}

export function isDefined<T>(element: T | undefined | null): element is T {
    return !isUndefined(element)
}
