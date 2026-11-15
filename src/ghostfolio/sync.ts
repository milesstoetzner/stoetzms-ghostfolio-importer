import {GhostfolioActivity} from './mapper'
import {ExistingActivity} from './client'
import {extractFingerprint, providerOf} from './fingerprint'

export type SyncPlan = {
    /** Desired activities with no counterpart in Ghostfolio yet. */
    create: GhostfolioActivity[]
    /** Desired activities already present, left untouched. */
    keep: GhostfolioActivity[]
    /** Activities written by the importer earlier for the same providers that no longer appear in the inputs. */
    stale: ExistingActivity[]
    /** The providers of the inputs; only their activities are compared. */
    providers: string[]
}

/**
 * Compares the desired activities with those already in the account. Activities are matched by the
 * fingerprint in their comment; activities without one were not written by the importer and are never
 * touched. Only activities of the providers in the inputs are compared, so several brokers can sync into
 * one account without pruning each other's activities.
 */
export function plan(desired: GhostfolioActivity[], existing: ExistingActivity[]): SyncPlan {
    const desiredFingerprints = new Set<string>()
    for (const activity of desired) {
        const fingerprint = extractFingerprint(activity.comment)
        if (!fingerprint) throw new Error(`activity without fingerprint: ${JSON.stringify(activity)}`)
        desiredFingerprints.add(fingerprint)
    }
    const providers = new Set([...desiredFingerprints].map(providerOf))

    const existingByFingerprint = new Map<string, ExistingActivity>()
    for (const activity of existing) {
        const fingerprint = extractFingerprint(activity.comment)
        if (fingerprint && providers.has(providerOf(fingerprint))) existingByFingerprint.set(fingerprint, activity)
    }

    const create: GhostfolioActivity[] = []
    const keep: GhostfolioActivity[] = []
    for (const activity of desired) {
        if (existingByFingerprint.has(extractFingerprint(activity.comment)!)) keep.push(activity)
        else create.push(activity)
    }

    const stale = [...existingByFingerprint.entries()]
        .filter(([fingerprint]) => !desiredFingerprints.has(fingerprint))
        .map(([, activity]) => activity)

    return {create, keep, stale, providers: [...providers]}
}
