import {GhostfolioActivity} from './mapper'
import {ExistingActivity} from './client'
import {extractFingerprint} from './fingerprint'

export type SyncPlan = {
    /** Desired activities with no counterpart in Ghostfolio yet. */
    create: GhostfolioActivity[]
    /** Desired activities already present, left untouched. */
    keep: GhostfolioActivity[]
    /** Activities written by the importer earlier that no longer appear in the inputs. */
    stale: ExistingActivity[]
}

/**
 * Compares the desired activities with those already in the account. Activities are matched by the
 * fingerprint in their comment; activities without one were not written by the importer and are never
 * touched.
 */
export function plan(desired: GhostfolioActivity[], existing: ExistingActivity[]): SyncPlan {
    const existingByFingerprint = new Map<string, ExistingActivity>()
    for (const activity of existing) {
        const fingerprint = extractFingerprint(activity.comment)
        if (fingerprint) existingByFingerprint.set(fingerprint, activity)
    }

    const desiredFingerprints = new Set<string>()
    const create: GhostfolioActivity[] = []
    const keep: GhostfolioActivity[] = []
    for (const activity of desired) {
        const fingerprint = extractFingerprint(activity.comment)
        if (!fingerprint) throw new Error(`activity without fingerprint: ${JSON.stringify(activity)}`)
        desiredFingerprints.add(fingerprint)
        if (existingByFingerprint.has(fingerprint)) keep.push(activity)
        else create.push(activity)
    }

    const stale = [...existingByFingerprint.entries()]
        .filter(([fingerprint]) => !desiredFingerprints.has(fingerprint))
        .map(([, activity]) => activity)

    return {create, keep, stale}
}
