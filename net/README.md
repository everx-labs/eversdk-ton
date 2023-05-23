## @eversdk/smc

![TON](https://img.shields.io/badge/based%20on-TVM%20Blockchains-blue)

Collection of network providers for TVM Blockchains.

## How to install
`yarn add @eversdk/net` or `npm i @eversdk/net`

## Simple usage

CloudProvider provides methods with type wrappers, such as `sendExternalMessage`:

```typescript
import { Builder } from '@eversdk/ton'
import { CloudProvider } from '@eversdk/net'

async function main () {
    // usage of https://www.evercloud.dev
    const provider = new CloudProvider({
        endpoint: 'https://mainnet.evercloud.dev/.../graphql'
    })

    const c = new Builder().cell()
    await provider.sendExternalMessageCell(c)
}

main()
```

For extended usage of CloudProvider (evercloud graphql), use graphql code generation with [the-guild](https://the-guild.dev/graphql/codegen) and [@apollo/client](https://www.apollographql.com/docs/react/). 

```typescript
import { CloudProvider } from '@eversdk/net'
import { graphql } from './codegen/generated'

// ./codegen/generated –> path to the-guild codegen result

const getBalance = apollo.graphql(`
    query getBalance($address: String!) {
        blockchain {
            account (address: $address) {
                info { balance(format: DEC) }
            }
        }
    }
`)

async function main () {
    const provider = new CloudProvider({
        endpoint: 'https://mainnet.evercloud.dev/.../graphql'
    })

    const address = '0:0000000000000000000000000000000000000000000000000000000000000000'

    const result = await provider.client.query({
        query: getBalance,
        variables: { address }
    })

    // fully typed result based on the graphql schema
    console.log(result.data.blockchain?.account?.info?.balance)
}

main()
```

## External dependencies

- `"@apollo/client": "3.7.14"`
- `"@eversdk/ton": "0.1.0"`
- `"graphql": "16.6.0"`

## License

MIT
