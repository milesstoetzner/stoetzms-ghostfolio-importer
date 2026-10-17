export default {
    /** Program output, meant to be piped. */
    out: console.log,
    /** Diagnostics, kept off stdout. */
    log: (...data: any[]) => {
        console.error('DEBUG', ...data)
    },
    error: (...data: any[]) => {
        console.error('ERROR', ...data)
    },
}
