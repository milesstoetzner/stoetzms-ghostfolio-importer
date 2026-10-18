import {InputProvider} from '../providers'
import {InputOptions} from '../options'
import {Transaction} from '../types'
import {readPdfs} from './pdf'
import TradeRepublic from '../extractors/trade-republic'

export class TradeRepublicInput implements InputProvider {
    readonly name = 'trade-republic'
    readonly formats = ['pdf']

    read(options: InputOptions): Promise<Transaction[]> {
        return readPdfs(options, TradeRepublic)
    }
}
