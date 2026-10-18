import axios, {AxiosInstance} from 'axios'
import {GhostfolioActivity} from './mapper'

export type ExistingActivity = {
    id: string
    accountId: string
    comment: string | null
    date: string
    type: string
    quantity: number
    unitPrice: number
    currency: string
}

/**
 * The few Ghostfolio API calls the importer needs. The base URL is the Ghostfolio origin, e.g.
 * http://localhost:3333; the import endpoint the user may pass is reduced to it.
 */
export class GhostfolioClient {
    private readonly http: AxiosInstance
    readonly baseUrl: string

    constructor(endpoint: string, token: string) {
        this.baseUrl = GhostfolioClient.baseUrlOf(endpoint)
        this.http = axios.create({
            baseURL: this.baseUrl,
            headers: {Authorization: `Bearer ${token}`},
        })
    }

    /** Accepts the origin or the full import URL. */
    static baseUrlOf(endpoint: string): string {
        return endpoint.replace(/\/+$/, '').replace(/\/api\/v1\/import$/, '')
    }

    async import(activities: GhostfolioActivity[]): Promise<unknown> {
        const response = await this.http.post('/api/v1/import', {activities})
        return response.data
    }

    /** All activities of the account, following the API's pagination. */
    async activities(accountId: string): Promise<ExistingActivity[]> {
        const all: ExistingActivity[] = []
        const take = 500
        for (let skip = 0; ; skip += take) {
            const response = await this.http.get<{activities: ExistingActivity[]; count: number}>(
                '/api/v1/activities',
                {
                    params: {accounts: accountId, take, skip},
                }
            )
            const page = response.data.activities.filter(it => it.accountId === accountId)
            all.push(...page)
            if (response.data.activities.length < take || all.length >= response.data.count) break
        }
        return all
    }

    async delete(id: string): Promise<void> {
        await this.http.delete(`/api/v1/activities/${id}`)
    }
}
