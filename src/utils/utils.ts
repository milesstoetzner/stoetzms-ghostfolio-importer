import assert from 'node:assert'

export function parseNumber(raw: string): number {
    const parsed = Number.parseFloat(raw.replace(',', '.'))
    if (isNaN(parsed)) throw new Error(`raw "${raw}" not a number`)
    return parsed
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
