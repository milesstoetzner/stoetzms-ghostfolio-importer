import {Transaction} from './types'
import {InputOptions, OutputOptions} from './options'

/**
 * An input provider turns the files named by the input options into transactions in the internal
 * format. It declares the input formats it understands; the format is validated before read() is called.
 */
export interface InputProvider {
    readonly name: string
    readonly aliases?: readonly string[]
    readonly formats: readonly string[]
    read(options: InputOptions): Promise<Transaction[]>
}

/**
 * An output provider takes transactions in the internal format and writes them somewhere: a file, the
 * console, or a remote system. It declares the output formats it supports.
 */
export interface OutputProvider {
    readonly name: string
    readonly aliases?: readonly string[]
    readonly formats: readonly string[]
    write(transactions: Transaction[], options: OutputOptions): Promise<void>
}

type Provider = InputProvider | OutputProvider

export class Registry<T extends Provider> {
    private readonly byName = new Map<string, T>()

    constructor(
        private readonly kind: 'input' | 'output',
        providers: T[]
    ) {
        for (const provider of providers) {
            for (const name of [provider.name, ...(provider.aliases ?? [])]) {
                if (this.byName.has(name)) throw new Error(`${kind} provider "${name}" registered twice`)
                this.byName.set(name, provider)
            }
        }
    }

    /** The primary names, for help texts and docs. */
    get names(): string[] {
        return [...new Set(this.byName.values())].map(it => it.name)
    }

    /** One line per provider with its formats, for help texts. */
    describe(): string {
        return [...new Set(this.byName.values())].map(it => `${it.name} (${it.formats.join(', ')})`).join(', ')
    }

    /** Resolves a provider by name or alias and checks that it supports the format. */
    resolve(name: string, format: string): T {
        const provider = this.byName.get(name)
        if (!provider)
            throw new Error(`${this.kind} provider "${name}" unknown, expected one of: ${this.names.join(', ')}`)
        if (!provider.formats.includes(format))
            throw new Error(
                `${this.kind} provider "${provider.name}" does not support ${this.kind} format "${format}", ` +
                    `expected one of: ${provider.formats.join(', ')}`
            )
        return provider
    }
}
