import {InputProvider} from '../providers'
import {InputOptions} from '../options'
import {Transaction} from '../types'
import {readPdfs} from './pdf'
import ScalableCapital from '../extractors/scalable-capital'

export class ScalableCapitalInput implements InputProvider {
    readonly name = 'scalable-capital'
    readonly formats = ['pdf']

    read(options: InputOptions): Promise<Transaction[]> {
        return readPdfs(options, ScalableCapital)
    }
}
