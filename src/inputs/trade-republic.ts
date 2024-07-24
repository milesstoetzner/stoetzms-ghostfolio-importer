import {Transaction, TransactionType} from '../types'
import {convertPrice, isUndefined, parseDate, parseNumber} from '../utils/utils'

export default class TradeRepublic {
    private readonly raw: string
    private readonly file: string

    constructor(raw: string, file: string) {
        this.raw = raw
        this.file = file
    }

    private _data?: Transaction
    get data(): Transaction {
        if (isUndefined(this._data)) {
            this._data = {
                type: this.type,
                ISIN: this.ISIN,
                quantity: this.quantity,
                price: convertPrice(this.price, this.conversion),
                currency: this.conversion ? 'EUR' : this.currency,
                date: this.date,
                _meta: {
                    provider: 'trade-republic',
                    format: 'pdf',
                    file: this.file,
                },
            }
        }
        return this._data
    }

    private _type?: TransactionType
    get type(): TransactionType {
        if (isUndefined(this._type)) {
            /**
             * Dividend
             */
            if (this.contains('Dividende')) {
                this._type = TransactionType.DIVIDEND
                return this._type
            }

            /**
             * Buy
             */
            if (this.contains('Order Kauf')) {
                this._type = TransactionType.BUY
                return this._type
            }

            /**
             * Sell
             */
            if (this.contains('Order Verkauf')) {
                this._type = TransactionType.SELL
                return this._type
            }

            throw new Error(`no transaction type`)
        }
        return this._type
    }

    private _quantity?: number
    get quantity(): number {
        if (isUndefined(this._quantity)) {
            const {raw} = this.extract<{raw: string}>(/(?<raw>\S+) (Stk|Stücke)/)
            if (isUndefined(raw)) throw new Error('no quantity')
            this._quantity = parseNumber(raw)
        }
        return this._quantity
    }

    private _conversion?: number
    private _conversion_extracted = false

    get conversion(): number | undefined {
        if (!this._conversion_extracted) {
            /**
             * 1.123 USD/EUR
             */
            const {raw} = this.extract<{raw: string}>(/(?<raw>\S+)\s+USD\/EUR/)
            if (raw) this._conversion = parseNumber(raw)
            this._conversion_extracted = true
        }
        return this._conversion
    }

    private _price?: number
    get price(): number {
        if (isUndefined(this._price)) {
            /**
             * 0,777777 Stk. 12,345 EUR 12,34 EUR
             */
            const {raw: a} = this.extract<{raw: string}>(/\S+\s+Stk\.\s+(?<raw>\S+)/)

            /**
             * 69.1234 Stücke 0.123 USD
             */
            const {raw: b} = this.extract<{raw: string}>(/\S+\s+Stücke\s+(?<raw>\S+)/)

            const raw = a ?? b
            if (isUndefined(raw)) throw new Error('no price')
            this._price = parseNumber(raw)
        }
        return this._price
    }

    private _currency?: string
    get currency(): string {
        if (isUndefined(this._currency)) {
            /**
             * 0,777777 Stk. 12,345 EUR 12,34 EUR
             */
            const {raw} = this.extract<{raw: string}>(/\S+\s+(Stk\.|Stücke)\s+\S+\s+(?<raw>\S+)/)

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
             * Market-Order Kauf am 01.01.2024, um 11:11 Uhr (Europe/Berlin).
             */
            /**
             * Dividende mit Ex-Datum01.01.2024.
             */
            const raw = this.extract<t>(
                /(Order \S+ am |Dividende mit Ex-Datum)(?<day>\d\d)\.(?<month>\d\d)\.(?<year>\d\d\d\d)/
            )
            if (!raw.day || !raw.month || !raw.year) throw new Error(`no date`)
            this._date = parseDate(raw.day, raw.month, raw.year)
        }
        return this._date
    }

    private _ISIN?: string
    get ISIN(): string {
        if (isUndefined(this._ISIN)) {
            /**
             * ISIN: DE1234567890
             */
            const {raw: a} = this.extract<{raw: string}>(/ISIN: (?<raw>\S+)/)

            /**
             * 69.1234 Stücke 0.123 USD
             * DE1234567890
             */
            const {raw: b} = this.extract<{raw: string}>(/\.*Stücke.*\n(?<raw>\S+)/)

            const raw = a ?? b
            if (isUndefined(raw)) throw new Error(`no ISIN`)
            this._ISIN = raw
        }
        return this._ISIN
    }

    private contains(value: string): boolean {
        return this.raw.includes(value)
    }

    private extract<T>(regex: RegExp): Partial<T> {
        const result = regex.exec(this.raw)
        if (!result) return {} as Partial<T>
        return result.groups as Partial<T>
    }
}
