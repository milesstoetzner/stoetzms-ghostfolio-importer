import {Transaction} from '../types'
import {OutputProvider} from '../providers'
import {OutputOptions} from '../options'
import {emit, FileFormat, FILE_FORMATS, serialize} from './formats'

export type InternalOutputFormat = FileFormat

/**
 * Serializes transactions in the internal format, readable again by the "internal" input provider.
 */
export function serializeTransactions(transactions: Transaction[], format: InternalOutputFormat): string {
    return serialize(transactions, format === 'yaml' ? 'yaml' : 'json')
}

export class InternalOutput implements OutputProvider {
    readonly name = 'internal'
    /** The provider was called "none" before. */
    readonly aliases = ['none']
    readonly formats = FILE_FORMATS

    write(transactions: Transaction[], options: OutputOptions): Promise<void> {
        return emit(transactions, options.outputFormat as FileFormat, options)
    }
}
