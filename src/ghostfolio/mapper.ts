import {Transaction} from '../types'
import config from '../config'
import {fingerprints, tagComment} from './fingerprint'

export type GhostfolioMap = {[ISIN: string]: string}

export type GhostfolioActivity = {
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
}

export type GhostfolioData = {
    activities: GhostfolioActivity[]
}

export default class Ghostfolio {
    private readonly accountId: string
    private readonly transactions: Transaction[]
    private readonly map: GhostfolioMap
    private readonly provider: string

    constructor(data: {accountId: string; transactions: Transaction[]; map: GhostfolioMap; provider: string}) {
        this.accountId = data.accountId
        this.transactions = data.transactions
        this.map = data.map
        this.provider = data.provider
    }

    private _data?: GhostfolioData
    get data(): GhostfolioData {
        if (!this._data) {
            const ids = fingerprints(this.transactions, this.provider)
            this._data = {
                activities: this.transactions.map((it, index) => ({
                    accountId: this.accountId,
                    type: it.type,
                    symbol: this.mapToSymbol(it.ISIN),
                    quantity: it.quantity,
                    unitPrice: it.price,
                    currency: it.currency,
                    date: it.date.toISOString(),
                    fee: 0,
                    dataSource: 'YAHOO',
                    comment: tagComment(ids[index], config.version),
                })),
            }
        }
        return this._data
    }

    private mapToSymbol(ISIN: string) {
        const symbol = this.map[ISIN]
        if (!symbol) throw new Error(`no symbol for ISIN: ${ISIN} (add it to the map given by --ghostfolio-map)`)
        return symbol
    }
}
