import {Transaction, TransactionType} from '../types'
import {convertPrice, isUndefined, parseDate, parseNumber} from '../utils/utils'

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
            this._quantity = parseNumber(raw)
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
            if (raw) this._conversion = parseNumber(raw)
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
            this._price = parseNumber(raw)
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
