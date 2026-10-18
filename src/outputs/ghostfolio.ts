import fs from 'node:fs/promises'
import path from 'node:path'
import {Transaction} from '../types'
import {OutputProvider} from '../providers'
import {OutputOptions} from '../options'
import std from '../utils/std'
import Ghostfolio, {GhostfolioMap} from '../ghostfolio/mapper'
import {GhostfolioClient} from '../ghostfolio/client'
import {plan} from '../ghostfolio/sync'
import {emit, FileFormat, FILE_FORMATS} from './formats'

export class GhostfolioOutput implements OutputProvider {
    readonly name = 'ghostfolio'
    readonly formats = [...FILE_FORMATS, 'endpoint']

    async write(transactions: Transaction[], options: OutputOptions): Promise<void> {
        if (!options.ghostfolioAccountId) throw new Error(`no ghostfolio account id`)

        const map: GhostfolioMap = options.ghostfolioMap
            ? JSON.parse(await fs.readFile(path.resolve(options.ghostfolioMap), 'utf-8'))
            : {}

        const ghost = new Ghostfolio({accountId: options.ghostfolioAccountId, transactions, map})

        if (options.outputFormat === 'endpoint') {
            if (!options.ghostfolioEndpoint) throw new Error(`no ghostfolio endpoint`)
            if (!options.ghostfolioToken) throw new Error(`no ghostfolio token`)
            if (options.prune && !options.sync) throw new Error(`--prune requires --sync`)

            const client = new GhostfolioClient(options.ghostfolioEndpoint, options.ghostfolioToken)
            if (options.sync) return sync(client, ghost, options)

            std.log(await client.import(ghost.data.activities))
            return
        }

        if (options.sync || options.prune) throw new Error(`--sync and --prune only apply to the endpoint format`)
        await emit(ghost.data, options.outputFormat as FileFormat, options)
    }
}

/**
 * Brings the account in line with the inputs: creates what is missing, leaves what is already there,
 * and with --prune deletes what the importer created earlier but is no longer in the inputs. Activities
 * not created by the importer are never touched.
 */
async function sync(client: GhostfolioClient, ghost: Ghostfolio, options: OutputOptions): Promise<void> {
    const accountId = options.ghostfolioAccountId!
    const existing = await client.activities(accountId)
    const {create, keep, stale} = plan(ghost.data.activities, existing)

    std.log(
        `sync: ${ghost.data.activities.length} in inputs, ${existing.length} in account, ` +
            `${keep.length} already present, ${create.length} to create, ${stale.length} stale`
    )

    if (create.length > 0) std.log(await client.import(create))

    if (stale.length === 0) return
    if (!options.prune) {
        for (const it of stale) std.log(`stale (not in inputs, kept, use --prune to delete): ${describe(it)}`)
        return
    }
    for (const it of stale) {
        std.log(`deleting ${describe(it)}`)
        await client.delete(it.id)
    }
}

function describe(activity: {
    id: string
    date: string
    type: string
    quantity: number
    unitPrice: number
    currency: string
}) {
    return `${activity.date.slice(0, 10)} ${activity.type} ${activity.quantity} × ${activity.unitPrice} ${activity.currency} (${activity.id})`
}
