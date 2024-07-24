import {program} from 'commander'
import actions from './actions'
import hae from './utils/hae'

program
    .command('transform')
    .option('--input-dir <string>', '', '.')
    .option('--input-file <string>', '')
    .option('--input-filter <string>')
    .option('--input-provider <string>', '', 'scalable-capital')
    .option('--input-format <string>', '', 'pdf')
    .option('--output-provider <string>', '', 'ghostfolio')
    .option('--output-format <string>', '', 'json')
    .option('--output-file <string>', '', 'output.json')
    .option('--ghostfolio-account-id <string>')
    .option('--ghostfolio-map <string>')
    .option('--ghostfolio-endpoint <string>')
    .option('--ghostfolio-token <string>')
    .action(hae.exit(async options => await actions.transform(options)))

program.parse()
