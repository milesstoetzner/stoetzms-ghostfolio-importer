/**
 * Creates a fresh user in the local development Ghostfolio (yarn dev:up) and prints what the importer
 * needs: the account id and a bearer token, plus a ready-to-run example.
 *
 *   yarn dev:user
 */
import axios from 'axios'

const ENDPOINT = process.env.GHOSTFOLIO_ENDPOINT ?? 'http://localhost:3333'

async function main() {
    const user = await axios.post<{accessToken: string; authToken: string}>(`${ENDPOINT}/api/v1/user`)
    const headers = {Authorization: `Bearer ${user.data.authToken}`}
    const accounts = await axios.get<{accounts: {id: string; name: string}[]}>(`${ENDPOINT}/api/v1/account`, {headers})
    const account = accounts.data.accounts[0]
    if (!account) throw new Error('the new user has no account')

    console.log(`Ghostfolio:      ${ENDPOINT}`)
    console.log(`Security token:  ${user.data.accessToken}   (sign in on the web UI with this)`)
    console.log(`Account:         ${account.id} (${account.name})`)
    console.log(`Bearer token:    ${user.data.authToken}`)
    console.log()
    console.log('Import the example PDFs:')
    console.log()
    console.log(
        [
            '  yarn start transform',
            '--input-dir examples/inputs/scalable-capital',
            '--input-provider scalable-capital',
            `--ghostfolio-account-id ${account.id}`,
            '--ghostfolio-map examples/ghostfolio-map.json',
            '--output-format endpoint',
            `--ghostfolio-endpoint ${ENDPOINT}/api/v1/import`,
            `--ghostfolio-token ${user.data.authToken}`,
        ].join(' \\\n    ')
    )
}

await main()
