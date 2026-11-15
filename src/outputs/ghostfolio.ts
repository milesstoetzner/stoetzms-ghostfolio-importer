import fs from 'node:fs/promises'
import path from 'node:path'
import axios from 'axios'
import {Transaction} from '../types'
import {OutputProvider} from '../providers'
import {OutputOptions} from '../options'
import std from '../utils/std'
import Ghostfolio, {GhostfolioMap} from '../ghostfolio/mapper'
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

            const response = await axios.post(options.ghostfolioEndpoint, ghost.data, {
                headers: {Authorization: `Bearer ${options.ghostfolioToken}`},
            })
            std.log(response.data)
            return
        }

        await emit(ghost.data, options.outputFormat as FileFormat, options)
    }
}
