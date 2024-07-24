export default {
    out: console.log,
    log: (...data: any[]) => {
        console.error('DEBUG', ...data)
    },
}
