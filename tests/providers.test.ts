import {describe, it} from 'node:test'
import assert from 'node:assert/strict'
import {inputs} from '../src/inputs'
import {outputs} from '../src/outputs'

describe('provider registries', () => {
    it('lists primary names only', () => {
        assert.deepEqual(inputs.names, ['scalable-capital', 'trade-republic', 'internal'])
        assert.deepEqual(outputs.names, ['ghostfolio', 'internal'])
    })

    it('resolves names and aliases', () => {
        assert.equal(inputs.resolve('scalable-capital', 'pdf').name, 'scalable-capital')
        assert.equal(inputs.resolve('none', 'json').name, 'internal')
        assert.equal(outputs.resolve('none', 'yaml').name, 'internal')
        assert.equal(outputs.resolve('ghostfolio', 'endpoint').name, 'ghostfolio')
    })

    it('rejects unknown providers with the list of known ones', () => {
        assert.throws(
            () => inputs.resolve('bogus', 'pdf'),
            /input provider "bogus" unknown, expected one of: scalable-capital, trade-republic, internal/
        )
        assert.throws(() => outputs.resolve('bogus', 'json'), /output provider "bogus" unknown/)
    })

    it('rejects unsupported formats with the list of supported ones', () => {
        assert.throws(
            () => inputs.resolve('trade-republic', 'json'),
            /input provider "trade-republic" does not support input format "json", expected one of: pdf/
        )
        assert.throws(
            () => outputs.resolve('internal', 'endpoint'),
            /output provider "internal" does not support output format "endpoint", expected one of: console, json, yaml/
        )
    })

    it('describes providers for the help text', () => {
        assert.equal(inputs.describe(), 'scalable-capital (pdf), trade-republic (pdf), internal (json, yaml)')
        assert.equal(outputs.describe(), 'ghostfolio (console, json, yaml, endpoint), internal (console, json, yaml)')
    })
})
