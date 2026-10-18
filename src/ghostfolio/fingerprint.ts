import {createHash} from 'node:crypto'
import {Transaction} from '../types'

const MARKER = /\[id:([0-9a-f]{16})\]/

/**
 * A stable identity for a transaction, derived from its business fields, so that importing the same
 * document twice yields the same fingerprint and the activity in Ghostfolio can be recognised.
 *
 * Two transactions with identical fields (e.g. two orders at the same price on the same day) get an
 * ordinal appended before hashing, in input order, so they stay distinct and stable as long as the
 * inputs are read in the same order.
 */
export function fingerprints(transactions: Transaction[]): string[] {
    const seen = new Map<string, number>()
    return transactions.map(it => {
        const key = [
            it._meta?.provider ?? 'unknown',
            it.ISIN,
            it.type,
            it.date.toISOString(),
            it.quantity,
            it.price,
            it.currency,
        ].join('|')
        const ordinal = (seen.get(key) ?? 0) + 1
        seen.set(key, ordinal)
        return createHash('sha256').update(`${key}|${ordinal}`).digest('hex').slice(0, 16)
    })
}

/** Appends the fingerprint to a comment in a form that extractFingerprint() reads back. */
export function tagComment(comment: string, fingerprint: string): string {
    return `${comment} [id:${fingerprint}]`
}

/** The fingerprint embedded in an activity comment, or undefined if the activity was not written by us. */
export function extractFingerprint(comment: string | null | undefined): string | undefined {
    return comment?.match(MARKER)?.[1]
}
