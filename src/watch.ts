import fs from 'node:fs'
import std from './utils/std'

export type WatchOptions = {
    /** Changes within this many milliseconds are coalesced into one run. */
    debounceMs: number
    /** Only react to changes of files whose name passes this test. */
    filter?: (file: string) => boolean
}

/**
 * Runs the callback whenever something in the directory changes, coalescing bursts of change events
 * (a copied PDF produces several) into one run, and never running twice at once: a change during a run
 * schedules exactly one more run. Errors of a run are reported and do not stop the watch.
 *
 * Resolves only when the watcher is closed, i.e. on SIGINT or SIGTERM.
 */
export function watchDirectory(dir: string, options: WatchOptions, callback: () => Promise<void>): Promise<void> {
    return new Promise(resolve => {
        const runner = new Runner(callback)
        let timer: NodeJS.Timeout | undefined

        const watcher = fs.watch(dir, (event, file) => {
            if (file && options.filter && !options.filter(file)) return
            std.log(`${event}: ${file ?? '?'}`)
            clearTimeout(timer)
            timer = setTimeout(() => runner.request(), options.debounceMs)
        })

        const stop = () => {
            clearTimeout(timer)
            watcher.close()
            std.log('watch stopped')
            resolve()
        }
        process.once('SIGINT', stop)
        process.once('SIGTERM', stop)

        std.log(`watching "${dir}" (stop with Ctrl-C)`)
    })
}

/**
 * Serializes runs: at most one in flight, at most one pending.
 */
export class Runner {
    private running = false
    private pending = false

    constructor(private readonly callback: () => Promise<void>) {}

    async request(): Promise<void> {
        if (this.running) {
            this.pending = true
            return
        }
        this.running = true
        try {
            do {
                this.pending = false
                try {
                    await this.callback()
                } catch (error) {
                    std.error(error instanceof Error ? error.message : error)
                }
            } while (this.pending)
        } finally {
            this.running = false
        }
    }
}
