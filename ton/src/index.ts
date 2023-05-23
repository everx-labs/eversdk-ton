import * as nacl from 'tweetnacl'

export * from './types'
export { Coins } from './coins'
export { Mnemonic, MnemonicOptions, MnemonicBIP39, KeyPair } from './crypto'
export { Address, AddressRewriteOptions, AddressStringifyOptions } from './address'
export { BOC, BOCOptions, Mask, Cell, CellType, CellOptions, Slice, Builder, Hashmap, HashmapE } from './boc'

export * as Block from './block'
export * as Utils from './utils'

export { nacl }

export enum GLOBAL_ID {
    EVERSCALE_MAINNET = 42,
    EVERSCALE_DEVNET  = 42,
    EVERSCALE_SMFT    = -4,
    EVERSCALE_RFLD    = -3,
    EVERSCALE_FLD     = -2,
    EVERSCALE_SE      = 0,
    TON_MAINNET       = -239,
    TON_TESTNET       = -3,
    GOSH_MAINNET      = 42,
    VENOM_MAINNET     = 1,
    VENOM_TESTNET     = 1000,
    VENOM_DEVNET      = 1002,
    TREETON           = 888
}
