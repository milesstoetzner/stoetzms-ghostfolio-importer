import {InputProvider, Registry} from '../providers'
import {ScalableCapitalInput} from './scalable-capital'
import {TradeRepublicInput} from './trade-republic'
import {InternalInput} from './internal'

/**
 * All input providers. Add a new one here.
 */
export const inputs = new Registry<InputProvider>('input', [
    new ScalableCapitalInput(),
    new TradeRepublicInput(),
    new InternalInput(),
])
