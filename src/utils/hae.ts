import std from './std'

function exit<T>(fn: (args: T) => Promise<void>): (args: T) => Promise<void> {
    return async (options: T) => {
        try {
            await fn(options)
        } catch (error) {
            std.log({error})
            process.exit(1)
        }
    }
}

function log<T>(fn: (args: T) => Promise<void>): (args: T) => Promise<void> {
    return async (args: T) => {
        try {
            await fn(args)
        } catch (error) {
            std.log({error})
        }
    }
}

async function _try(fn: () => Promise<void>, reason?: string) {
    try {
        await fn()
    } catch (error) {
        std.log(reason, {error})
    }
}

export default {
    exit,
    log,
    try: _try,
}
