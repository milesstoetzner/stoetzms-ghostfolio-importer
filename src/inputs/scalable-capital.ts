import path from 'node:path'
import fs from 'node:fs/promises'
import {InputProvider} from '../providers'
import {InputOptions} from '../options'
import {readPdfs} from './pdf'
import {Transaction, TransactionType} from '../types'
import {convertPrice, isUndefined, parseDate, parseNumber} from '../utils/utils'
import config from '../config'
import std from '../utils/std'

export default class ScalableCapital {
    private readonly raw
    private readonly file

    constructor(raw: string, file: string) {
        this.raw = raw
        this.file = file
    }

    get data(): Transaction {
        return {
            type: this.type,
            ISIN: this.ISIN,
            quantity: this.quantity,
            price: convertPrice(this.price, this.conversion),
            currency: this.conversion ? 'EUR' : this.currency,
            date: this.date,
            _meta: {
                provider: 'scalable-capital',
                format: 'pdf',
                file: this.file,
                version: config.version,
            },
        }
    }

    private _type?: TransactionType
    get type(): TransactionType {
        if (isUndefined(this._type)) {
            const {raw} = this.extract<{raw: string}>(/Wertpapierabrechnung: (?<raw>\S+)/)

            /**
             * Dividend
             */
            if (this.contains('Dividendenabrechnung') || this.contains('Fondsausschüttung')) {
                this._type = TransactionType.DIVIDEND
                return this._type
            }

            /**
             * Buy
             */
            if (raw === 'Kauf') {
                this._type = TransactionType.BUY
                return this._type
            }

            /**
             * Sell
             */
            if (raw === 'Verkauf') {
                this._type = TransactionType.SELL
                return this._type
            }

            throw new Error(`unknown type "${raw}"`)
        }
        return this._type
    }

    private _quantity?: number
    get quantity(): number {
        if (isUndefined(this._quantity)) {
            const {raw} = this.extract<{raw: string}>(/STK (?<raw>\S+)/)
            if (isUndefined(raw)) throw new Error('no quantity')
            this._quantity = parseNumber(raw, ',')
        }
        return this._quantity
    }

    private _conversion?: number
    private _conversion_extracted = false

    get conversion(): number | undefined {
        if (!this._conversion_extracted) {
            /**
             * Umrechnungskurs: EUR/USD1,01234
             */
            const {raw} = this.extract<{raw: string}>(/Umrechnungskurs:\s+EUR\/USD\s*(?<raw>\S+)/)
            if (raw) this._conversion = parseNumber(raw, ',')
            this._conversion_extracted = true
        }
        return this._conversion
    }

    private _price?: number
    get price(): number {
        if (isUndefined(this._price)) {
            const {raw: a} = this.extract<{raw: string}>(new RegExp(`Kurs\\n${this.currency}\\n(?<raw>\\S+)`))

            /**
             * SomeCompany AG             EUR 1,23 p.STK
             */
            const {raw: b} = this.extract<{raw: string}>(/(?<raw>\S+) p.STK/)

            const raw = a ?? b
            if (isUndefined(raw)) throw new Error('no price')
            this._price = parseNumber(raw, ',')
        }
        return this._price
    }

    private _currency?: string
    get currency(): string {
        if (isUndefined(this._currency)) {
            const {raw: a} = this.extract<{raw: string}>(/Kurswert (?<raw>\S+)/)

            /**
             * SomeCompany AG             EUR 1,23 p.STK
             */
            const {raw: b} = this.extract<{raw: string}>(/(?<raw>\S+)\s+\S+\s+p.STK/)

            const raw = a ?? b
            if (raw === 'EUR') {
                this._currency = 'EUR'
                return this._currency
            }

            if (raw === 'USD') {
                this._currency = 'USD'
                return this._currency
            }

            throw new Error(`unknown currency: ${raw}`)
        }
        return this._currency
    }

    private _date?: Date
    get date(): Date {
        if (isUndefined(this._date)) {
            type t = {day: string; month: string; year: string}

            /**
             * Handelsdatum Handelsuhrzeit
             * 01.01.2024 11:11:11:11
             */
            const a = this.extract<t>(/Handelsdatum Handelsuhrzeit\n(?<day>\d\d)\.(?<month>\d\d)\.(?<year>\d\d\d\d)/)

            /**
             * Details zur Ausführung:
             * Handels-  Handels-
             * datum   uhrzeit
             * Nominale Kurs Ausführungsplatz
             * STK 50 EUR GETTEX - MM Munich 01.01.2024 11:11:11:11
             */
            const b = this.extract<t>(
                /Handels-\s+Handels-\ndatum\s+uhrzeit\nNominale\s+Kurs\s+Ausführungsplatz\n.*(?<day>\d\d)\.(?<month>\d\d)\.(?<year>\d\d\d\d)/
            )

            /**
             * Zahltag: 01.01.2024
             */
            const c = this.extract<t>(/Zahltag:\s+(?<day>\d\d)\.(?<month>\d\d)\.(?<year>\d\d\d\d)/)

            let raw: t | undefined
            if (a.day && a.month && a.year) raw = a as t
            if (b.day && b.month && b.year) raw = b as t
            if (c.day && c.month && c.year) raw = c as t
            if (raw === undefined) throw new Error(`no date`)

            this._date = parseDate(raw.day, raw.month, raw.year)
        }
        return this._date
    }

    private _ISIN?: string
    get ISIN(): string {
        if (isUndefined(this._ISIN)) {
            const {raw} = this.extract<{raw: string}>(/ISIN: (?<raw>\S+)/)
            if (isUndefined(raw)) throw new Error(`no ISIN`)
            this._ISIN = raw
        }
        return this._ISIN
    }

    private contains(value: string) {
        return this.raw.includes(value)
    }

    private extract<T>(regex: RegExp) {
        const result = regex.exec(this.raw)
        if (!result) return {} as Partial<T>
        return result.groups as Partial<T>
    }
}

/**
 * Reads one file written by the official Scalable Capital CLI:
 *
 *   sc broker transaction details --transaction-id <ID> --json > <ID>.json
 *
 * The CLI prints an envelope {ok, command, data: {result}} whose result is one transaction. Its
 * detail_type says which part is filled in: security_trade, cash or non_trade_security.
 *
 * - A filled trade becomes a buy or sell with the filled shares and the average execution price. Fees and
 *   taxes are not imported. The date is the day of the FILLED entry in the history, the trade date.
 * - A distribution becomes a dividend. The details have no share count, so it is imported with quantity 1
 *   and the paid amount as price, which gives Ghostfolio the right dividend value.
 * - Everything else (unfilled or pending orders, deposits, withdrawals, interest, taxes, transfers) is
 *   skipped; the reason is returned instead of a transaction.
 */
export function parseScalableCapitalDetails(text: string, file: string): Transaction | string {
    const details = unwrap(JSON.parse(text))
    const id = str(details.id)
    if (!id) throw new Error('no transaction id')
    try {
        return convert(details, file, id)
    } catch (error) {
        throw new Error(`transaction ${id}: ${error instanceof Error ? error.message : error}`, {cause: error})
    }
}

type Item = Record<string, unknown>

const EXPECTED = 'expected the JSON printed by "sc broker transaction details --json"'

function unwrap(parsed: unknown): Item {
    const envelope = object(parsed)
    if (!envelope || !('ok' in envelope)) throw new Error(EXPECTED)
    if (envelope.ok !== true) {
        const error = object(envelope.error)
        throw new Error(
            `the Scalable CLI reported an error: ${str(error?.code) ?? 'unknown'}: ${str(error?.message) ?? ''}`.trim()
        )
    }
    const result = object(object(envelope.data)?.result)
    if (!result || !str(result.detail_type)) throw new Error(EXPECTED)
    return result
}

function convert(details: Item, file: string, id: string): Transaction | string {
    if (details.is_pending === true) return 'pending'
    if (details.is_cancellation === true) return 'cancellation'

    const currency = str(details.currency)
    if (!currency) throw new Error('no currency')
    const meta = {provider: 'scalable-capital', format: 'json', file, id, version: config.version}
    const history = Array.isArray(details.history) ? details.history.map(object) : []
    const detailType = str(details.detail_type)

    if (detailType === 'security_trade') {
        const trade = object(details.security_trade)
        if (!trade) throw new Error('no security_trade')
        if (trade.status !== 'FINAL_FILL') return `order ${str(trade.finalisation_reason) ?? str(trade.status)}`
        const side = str(trade.side)
        const type = side === 'BUY' ? TransactionType.BUY : side === 'SELL' ? TransactionType.SELL : undefined
        if (!type) return `side ${side}`
        const quantity = positive(object(trade.number_of_shares)?.filled, 'number_of_shares.filled')
        const price = positive(trade.average_price, 'average_price')
        const filled = history.find(it => it?.state === 'FILLED')
        const date = day(filled?.timestamp ?? details.last_event_datetime)
        return {type, ISIN: isin(details), quantity, price, currency, date, _meta: meta}
    }

    if (detailType === 'cash') {
        const cash = object(details.cash)
        const cashType = str(cash?.cash_transaction_type)
        if (cashType !== 'DISTRIBUTION') return `cash ${cashType}`
        const amount = positive(cash?.amount, 'cash.amount')
        const date = day(history.at(-1)?.timestamp ?? details.last_event_datetime)
        return {
            type: TransactionType.DIVIDEND,
            ISIN: isin(details),
            quantity: 1,
            price: amount,
            currency,
            date,
            _meta: meta,
        }
    }

    if (detailType === 'non_trade_security') {
        return `non-trade ${str(object(details.non_trade_security)?.non_trade_security_transaction_type)}`
    }

    return `detail type ${detailType}`
}

function isin(details: Item): string {
    const value = str(object(details.security)?.isin)
    if (!value) throw new Error('no security.isin')
    return value
}

/**
 * The calendar day of a timestamp such as "2024-03-15T10:15:22", at midnight UTC like the PDF inputs.
 */
function day(raw: unknown): Date {
    const match = typeof raw === 'string' ? raw.match(/^(\d{4})-(\d{2})-(\d{2})/) : null
    if (!match) throw new Error(`invalid timestamp "${raw}"`)
    return parseDate(match[3], match[2], match[1])
}

/**
 * The CLI passes the backend's numbers through; they are JSON numbers, decimal strings are accepted too.
 */
function positive(raw: unknown, field: string): number {
    const value = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
        throw new Error(`${field} "${raw}" is not a positive number`)
    return value
}

function object(raw: unknown): Item | undefined {
    return typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Item) : undefined
}

function str(raw: unknown): string | undefined {
    return typeof raw === 'string' ? raw : undefined
}

export class ScalableCapitalInput implements InputProvider {
    readonly name = 'scalable-capital'
    readonly formats = ['pdf', 'json']

    read(options: InputOptions): Promise<Transaction[]> {
        if (options.inputFormat === 'json') return readDetails(options)
        return readPdfs(options, ScalableCapital)
    }
}

/**
 * Reads every .json file in the input directory, one transaction each. Like the PDFs, a file that cannot
 * be read fails the run unless --ignore-errors is set; skipped transactions are counted on stderr.
 */
async function readDetails(options: InputOptions): Promise<Transaction[]> {
    const dir = path.resolve(options.inputDir)
    const files = (await fs.readdir(dir))
        .filter(file => file.toLowerCase().endsWith('.json'))
        .filter(file => !options.inputFilter || file.includes(options.inputFilter))
        .sort()

    const transactions: Transaction[] = []
    const skipped = new Map<string, number>()
    const failures: {file: string; error: unknown}[] = []
    for (const file of files) {
        const joined = path.join(dir, file)
        try {
            const result = parseScalableCapitalDetails(await fs.readFile(joined, 'utf-8'), joined)
            if (typeof result === 'string') skipped.set(result, (skipped.get(result) ?? 0) + 1)
            else transactions.push(result)
        } catch (error) {
            failures.push({file: joined, error})
        }
    }

    if (skipped.size > 0)
        std.log(
            `skipped ${[...skipped.values()].reduce((a, b) => a + b)} of ${files.length} transactions: ` +
                [...skipped.entries()].map(([reason, count]) => `${count}× ${reason}`).join(', ')
        )
    for (const failure of failures) std.error(`failed to read "${failure.file}"`, failure.error)
    if (failures.length > 0 && !options.ignoreErrors)
        throw new Error(
            `${failures.length} of ${files.length} JSON files could not be read (see above). ` +
                `Use --input-filter to select files or --ignore-errors to skip them.`
        )
    if (files.length === 0) std.log(`no JSON files found in "${dir}"`)

    return transactions
}
