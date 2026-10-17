import std from './std'

/**
 * Wraps a command action: an error is reported on stderr and ends the process with exit code 1.
 */
function exit<T>(fn: (args: T) => Promise<void>): (args: T) => Promise<void> {
    return async (options: T) => {
        try {
            await fn(options)
        } catch (error) {
            std.error(error instanceof Error ? error.message : error)
            if (process.env.DEBUG && error instanceof Error) std.log(error.stack)
            process.exit(1)
        }
    }
}

export default {
    exit,
}
