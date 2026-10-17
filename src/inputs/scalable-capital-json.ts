import {Transaction, TransactionType} from '../types'
import config from '../config'

/**
 * Reads the JSON printed by the official Scalable Capital CLI:
 *
 *   sc broker transactions --json --page-size 100
 *
 * The CLI prints an envelope {ok, command, data: {cursor, total, count, items}}. Each item is a
 * transaction summary; security trades carry isin, side, quantity and amount, cash transactions carry
 * cash_transaction_type and related_isin. Only filled or settled buys, sells and distributions become
 * transactions, everything else (deposits, fees, taxes, pending orders, cancellations) is skipped and
 * reported.
 *
 * The summary has no price per share; it is derived as amount / quantity. A distribution has no share
 * count, so it is imported with quantity 1 and the paid amount as price, which gives Ghostfolio the
 * right dividend value.
 */

type Item = Record<string, unknown>

export type Skipped = {id: string; reason: string}

export type ScalableCapitalJsonResult = {transactions: Transaction[]; skipped: Skipped[]}

const ACCEPTED_STATUS = ['FILLED', 'SETTLED', 'CONFIRMED']

export function parseScalableCapitalJson(text: string, file: string): ScalableCapitalJsonResult {
    const items = unwrap(JSON.parse(text))
    const transactions: Transaction[] = []
    const skipped: Skipped[] = []

    items.forEach((item, index) => {
        const id = str(item.id) ?? `#${index + 1}`
        try {
            const transaction = convert(item, file, id)
            if (typeof transaction === 'string') skipped.push({id, reason: transaction})
            else transactions.push(transaction)
        } catch (error) {
            throw new Error(`transaction ${id}: ${error instanceof Error ? error.message : error}`, {cause: error})
        }
    })

    return {transactions, skipped}
}

/**
 * Accepts the CLI envelope, its bare data object, or a bare list of items.
 */
function unwrap(parsed: unknown): Item[] {
    if (Array.isArray(parsed)) return parsed as Item[]
    if (typeof parsed !== 'object' || parsed === null)
        throw new Error('expected the JSON printed by "sc broker transactions --json"')
    const object = parsed as Item

    if ('ok' in object) {
        if (object.ok !== true) {
            const error = object.error as Item | undefined
            throw new Error(`the CLI reported an error: ${str(error?.message) ?? JSON.stringify(object.error)}`)
        }
        return unwrap(object.data)
    }

    if (Array.isArray(object.items)) return object.items as Item[]
    throw new Error('expected the JSON printed by "sc broker transactions --json"')
}

function convert(item: Item, file: string, id: string): Transaction | string {
    const status = str(item.status)
    if (item.is_cancellation === true) return 'cancellation'
    if (status && !ACCEPTED_STATUS.includes(status)) return `status ${status}`

    const summary = str(item.summary_type)
    const currency = str(item.currency)
    if (!currency) throw new Error('no currency')
    const date = parseDate(item.last_event_datetime)

    const meta = {
        provider: 'scalable-capital',
        format: 'json',
        file,
        id,
        version: config.version,
        status,
        description: str(item.description),
    }

    if (summary === 'BrokerSecurityTransactionSummary') {
        const side = str(item.side)
        const type = side === 'BUY' ? TransactionType.BUY : side === 'SELL' ? TransactionType.SELL : undefined
        if (!type) return `side ${side}`
        const ISIN = str(item.isin)
        if (!ISIN) throw new Error('no ISIN')
        const quantity = decimal(item.quantity, 'quantity')
        const amount = decimal(item.amount, 'amount')
        if (quantity <= 0) throw new Error(`quantity ${quantity} is not positive`)
        return {type, ISIN, quantity, price: Math.abs(amount) / quantity, currency, date, _meta: meta}
    }

    if (summary === 'BrokerCashTransactionSummary') {
        const cashType = str(item.cash_transaction_type)
        if (cashType !== 'DISTRIBUTION') return `cash transaction ${cashType}`
        const ISIN = str(item.related_isin)
        if (!ISIN) throw new Error('distribution without related ISIN')
        const amount = decimal(item.amount, 'amount')
        return {
            type: TransactionType.DIVIDEND,
            ISIN,
            quantity: 1,
            price: Math.abs(amount),
            currency,
            date,
            _meta: meta,
        }
    }

    return `summary type ${summary}`
}

function parseDate(raw: unknown): Date {
    const value = typeof raw === 'object' && raw !== null ? (raw as Item).time : raw
    if (typeof value !== 'string') throw new Error('no last_event_datetime')
    const date = new Date(value)
    if (isNaN(date.getTime())) throw new Error(`invalid last_event_datetime "${value}"`)
    return date
}

/**
 * The CLI prints decimals as strings ("1.23") to keep precision; numbers are accepted too.
 */
function decimal(raw: unknown, field: string): number {
    const value = typeof raw === 'string' ? Number(raw.trim()) : raw
    if (typeof value !== 'number' || !Number.isFinite(value) || (typeof raw === 'string' && raw.trim() === ''))
        throw new Error(`${field} "${raw}" is not a number`)
    return value
}

function str(raw: unknown): string | undefined {
    return typeof raw === 'string' ? raw : undefined
}
