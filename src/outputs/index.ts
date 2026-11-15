import {OutputProvider, Registry} from '../providers'
import {GhostfolioOutput} from './ghostfolio'
import {InternalOutput} from './internal'

/**
 * All output providers. Add a new one here.
 */
export const outputs = new Registry<OutputProvider>('output', [new GhostfolioOutput(), new InternalOutput()])
