import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
    overwrite: true,
    schema: 'src/cloud/codegen/schema.graphql',
    documents: [ 'src/cloud/provider/**/*.ts' ],
    ignoreNoDocuments: true,
    generates: {
        'src/cloud/codegen/generated/': {
            plugins: [ ],
            preset: 'client',
            config: {
                enumsAsTypes: true,
                futureProofEnums: true
            }
        }
    }
}

// eslint-disable-next-line import/no-default-export
export default config
