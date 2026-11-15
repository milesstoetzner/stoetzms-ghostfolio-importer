import {describe, it} from 'node:test'
import assert from 'node:assert/strict'
import {Runner} from '../src/watch'

const tick = () => new Promise(resolve => setTimeout(resolve, 5))

describe('watch runner', () => {
    it('runs once per request when idle', async () => {
        let runs = 0
        const runner = new Runner(async () => {
            runs++
        })
        await runner.request()
        await runner.request()
        assert.equal(runs, 2)
    })

    it('coalesces requests during a run into one more run', async () => {
        let runs = 0
        let release: () => void = () => {}
        const runner = new Runner(async () => {
            runs++
            if (runs === 1) await new Promise<void>(resolve => (release = resolve))
        })
        const first = runner.request()
        await tick()
        void runner.request()
        void runner.request()
        void runner.request()
        release()
        await first
        assert.equal(runs, 2)
    })

    it('keeps going after a failing run', async () => {
        let runs = 0
        const runner = new Runner(async () => {
            runs++
            if (runs === 1) throw new Error('boom')
        })
        await runner.request()
        await runner.request()
        assert.equal(runs, 2)
    })
})
