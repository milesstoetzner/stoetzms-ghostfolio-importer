import * as yaml from 'js-yaml'
import {Transaction} from '../types'

export type InternalOutputFormat = 'console' | 'json' | 'yaml'

/**
 * Serializes transactions in the internal format, readable again by the "internal" input provider.
 */
export function serializeTransactions(transactions: Transaction[], format: InternalOutputFormat): string {
    if (format === 'yaml') {
        const plain = JSON.parse(JSON.stringify(transactions))
        return yaml.dump(plain, {noRefs: true})
    }
    return JSON.stringify(transactions, null, 4)
}
