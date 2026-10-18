import {program} from 'commander'
import actions from './actions'
import hae from './utils/hae'
import config from './config'
import {inputs} from './inputs'
import {outputs} from './outputs'

program
    .name('ghostfolio-importer')
    .description(
        'ghostfolio-importer is a utility to import transactions from Scalable Capital and Trade Republic into Ghostfolio.'
    )
    .version(config.version)

program
    .command('transform')
    .description('read transactions with an input provider and write them with an output provider')
    .option('--input-dir <path>', 'directory with the input files', '.')
    .option('--input-file <path>', 'a single input file, for providers that read one file')
    .option('--input-filter <string>', 'only read files whose name contains this string')
    .option('--input-provider <name>', inputs.describe(), 'scalable-capital')
    .option('--input-format <format>', 'see --input-provider', 'pdf')
    .option('--ignore-errors', 'skip input files that cannot be read instead of failing', false)
    .option('--output-provider <name>', outputs.describe(), 'ghostfolio')
    .option('--output-format <format>', 'see --output-provider', 'json')
    .option('--output-file <path>', 'defaults to output.<output-format> for file formats')
    .option('--ghostfolio-account-id <id>', 'account to import into')
    .option('--ghostfolio-map <path>', 'JSON file mapping ISINs to symbols')
    .option('--ghostfolio-endpoint <url>', 'import endpoint, e.g. http://localhost:3333/api/v1/import')
    .option('--ghostfolio-token <token>', 'bearer token')
    .action(hae.exit(async options => await actions.transform(options)))

program.parse()
