import { ApolloClient, InMemoryCache, NormalizedCacheObject } from '@apollo/client/core'
import { BOC, Cell, Utils } from '@eversdk/ton'
import { graphql } from '../codegen/generated'

const postRequests = graphql(`
    mutation postRequests($requests: [Request]!) {
        postRequests(requests: $requests)
    }
`)

interface ICloudProviderOptions {
    endpoint: string;
    projectId?: string;
}

class CloudProvider {
    private _endpoint: string

    private _projectId: string | undefined

    private _client: ApolloClient<NormalizedCacheObject>

    constructor (options: ICloudProviderOptions) {
        this._endpoint = options.endpoint
        this._projectId = options.projectId

        this._client = new ApolloClient({
            cache: new InMemoryCache(),
            uri: `${this.endpoint}/${this.projectId}/graphql`
        })
    }

    public get endpoint (): string { return this._endpoint }

    public get projectId (): string | undefined { return this._projectId }

    public get client (): ApolloClient<NormalizedCacheObject> { return this._client }

    private async _sendExtMsg (b64hash: string, b64boc: string) {
        const result = await this._client.mutate({
            mutation: postRequests,
            variables: {
                requests: [ {
                    id: b64hash,
                    body: b64boc
                } ]
            }
        })

        if (!result.data?.postRequests || result.data?.postRequests?.length === 0) {
            throw new Error(`can not send external message with hash: ${b64boc}`)
        }
    }

    private async _sendExternalMessageBase64 (base64: string): Promise<void> {
        const cell = BOC.fromStandard(base64)
        const hash = Utils.Helpers.bytesToBase64(Utils.Helpers.hexToBytes(cell.hash()))
        return this._sendExtMsg(hash, base64)
    }

    private async _sendExternalMessageCell (cell: Cell): Promise<void> {
        const hash = Utils.Helpers.bytesToBase64(Utils.Helpers.hexToBytes(cell.hash()))
        return this._sendExtMsg(hash, BOC.toBase64Standard(cell))
    }

    public async sendExternalMessage (base64: string): Promise<void>
    public async sendExternalMessage (cell: Cell): Promise<void>
    public async sendExternalMessage (cell: string | Cell): Promise<void> {
        if (cell instanceof Cell) return this._sendExternalMessageCell(cell)
        if (typeof cell === 'string') return this._sendExternalMessageBase64(cell)
        throw new Error('CloudProvider: sendExternalMessage accepts only Cell or base64 BOC')
    }
}

export { CloudProvider }
