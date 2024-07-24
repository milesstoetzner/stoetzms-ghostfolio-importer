import {Transaction} from '../types'

export type GhostfolioMap = {[ISIN: string]: string}

export type GhostfolioData = {
    activities: {
        accountId: string
        type: string
        symbol: string
        quantity: number
        unitPrice: number
        currency: string
        date: string
        fee: number
        dataSource: string
        comment: string
    }[]
}

export default class Ghostfolio {
    private readonly accountId: string
    private readonly transactions: Transaction[]
    private readonly map: GhostfolioMap

    constructor(data: {accountId: string; transactions: Transaction[]; map: GhostfolioMap}) {
        this.accountId = data.accountId
        this.transactions = data.transactions
        this.map = data.map
    }

    private _data?: GhostfolioData
    get data(): GhostfolioData {
        if (!this._data) {
            this._data = {
                activities: this.transactions.map(it => ({
                    accountId: this.accountId,
                    type: it.type,
                    symbol: this.mapToSymbol(it.ISIN),
                    quantity: it.quantity,
                    unitPrice: it.price,
                    currency: it.currency,
                    date: it.date.toISOString(),
                    fee: 0,
                    dataSource: 'YAHOO',
                    comment: 'GENERATED',
                })),
            }
        }
        return this._data
    }

    private mapToSymbol(ISIN: string) {
        const symbol = this.map[ISIN]
        if (!symbol) throw new Error(`no symbol for ISIN: ${ISIN}`)
        return symbol
    }
}