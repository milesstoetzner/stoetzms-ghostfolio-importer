import {createHash} from 'node:crypto'
import {Transaction} from '../types'

export const MANAGER = 'ghostfolio-importer'

const FINGERPRINT = /(?:^|\s)fingerprint=([a-z0-9-]+:[0-9a-f]{16})(?=\s|$)/

/**
 * A stable identity for a transaction, "<provider>:<hash>", derived from its business fields, so that
 * importing the same document twice yields the same fingerprint and the activity in Ghostfolio can be
 * recognised. The provider prefix scopes --prune to the broker of the current run.
 *
 * Two transactions with identical fields (e.g. two orders at the same price on the same day) get an
 * ordinal appended before hashing, in input order, so they stay distinct and stable as long as the
 * inputs are read in the same order.
 */
export function fingerprints(transactions: Transaction[]): string[] {
    const seen = new Map<string, number>()
    return transactions.map(it => {
        const provider = it._meta?.provider ?? 'unknown'
        const key = [provider, it.ISIN, it.type, it.date.toISOString(), it.quantity, it.price, it.currency].join('|')
        const ordinal = (seen.get(key) ?? 0) + 1
        seen.set(key, ordinal)
        return `${provider}:${createHash('sha256').update(`${key}|${ordinal}`).digest('hex').slice(0, 16)}`
    })
}

/** The comment of an activity written by the importer; extractFingerprint() reads it back. */
export function tagComment(fingerprint: string, version: string): string {
    return `manager=${MANAGER} version=${version} fingerprint=${fingerprint}`
}

/** The fingerprint in an activity comment, or undefined if the activity was not written by the importer. */
export function extractFingerprint(comment: string | null | undefined): string | undefined {
    if (!comment?.split(/\s+/).includes(`manager=${MANAGER}`)) return undefined
    return comment.match(FINGERPRINT)?.[1]
}

/** The provider part of a fingerprint. */
export function providerOf(fingerprint: string): string {
    return fingerprint.slice(0, fingerprint.lastIndexOf(':'))
}
