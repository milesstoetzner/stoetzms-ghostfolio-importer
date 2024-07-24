export type Transaction = {
    type: TransactionType
    ISIN: string
    quantity: number
    price: number
    currency: string
    date: Date
    _meta?: any
}

export enum TransactionType {
    BUY = 'BUY',
    SELL = 'SELL',
    DIVIDEND = 'DIVIDEND',
}
