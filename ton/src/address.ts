import { crc16BytesBe } from './utils/checksum'
import {
    bytesToBase64,
    base64ToBytes,
    hexToBytes,
    bytesToHex,
    bytesCompare
} from './utils/helpers'

const FLAG_BOUNCEABLE     = 0x11
const FLAG_NON_BOUNCEABLE = 0x51
const FLAG_TEST_ONLY      = 0x80

export type AddressType = 'base64' | 'raw'

interface AddressTag {
    bounceable: boolean;
    testOnly: boolean;
}

interface AddressData extends AddressTag {
    workchain: number;
    hash: Uint8Array;
}

interface AddressRewriteOptions {
    workchain?: number;
    bounceable?: boolean;
    testOnly?: boolean;
}

interface AddressStringifyOptions extends AddressRewriteOptions {
    urlSafe?: boolean;
}

class Address {
    private readonly _hash: Uint8Array

    private readonly _workchain: number

    private readonly _bounceable: boolean

    private readonly _testOnly: boolean

    constructor (address: string | Address, options?: AddressRewriteOptions) {
        const isAddress = Address.isAddress(address)
        const isEncoded = Address.isEncoded(address)
        const isRaw = Address.isRaw(address)
        let result: AddressData

        switch (true) {
            case isAddress:
                result = Address.parseAddress(address as Address)
                break
            case isEncoded:
                result = Address.parseEncoded(address as string)
                break
            case isRaw:
                result = Address.parseRaw(address as string)
                break
            default:
                result = null
                break
        }

        if (result === null) {
            throw new Error('Address: can\'t parse address. Unknown type.')
        }

        const {
            workchain = result.workchain,
            bounceable = result.bounceable,
            testOnly = result.testOnly
        } = options || {}

        this._hash = result.hash
        this._workchain = workchain
        this._bounceable = bounceable
        this._testOnly = testOnly
    }

    public get hash (): Uint8Array {
        return new Uint8Array(this._hash)
    }

    public get workchain (): number {
        return this._workchain
    }

    public get bounceable (): boolean {
        return this._bounceable
    }

    public get testOnly (): boolean {
        return this._testOnly
    }

    private static isEncoded (address: any): boolean {
        // eslint-disable-next-line no-useless-escape
        const re = /^([a-zA-Z0-9_-]{48}|[a-zA-Z0-9\/\+]{48})$/

        return typeof address === 'string' && re.test(address)
    }

    private static isRaw (address: any): boolean {
        const re = /^-?[0-9]:[a-zA-Z0-9]{64}$/

        return typeof address === 'string' && re.test(address)
    }

    private static parseEncoded (value: string): AddressData {
        const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
        const bytes = base64ToBytes(base64)
        const data = Array.from(bytes)
        const address = data.splice(0, 34)
        const checksum = data.splice(0, 2)
        const crc = crc16BytesBe(address)

        if (!bytesCompare(crc, checksum)) {
            throw new Error('Address: can\'t parse address. Wrong checksum.')
        }

        const { buffer } = new Uint8Array(address.splice(0, 2))
        const view = new DataView(buffer)
        const tag = view.getUint8(0)
        const workchain = view.getInt8(1)
        const hash = new Uint8Array(address.splice(0, 32))
        const { bounceable, testOnly } = Address.decodeTag(tag)

        return {
            bounceable,
            testOnly,
            workchain,
            hash
        }
    }

    private static parseAddress (value: Address): AddressData {
        const { workchain, bounceable, testOnly } = value
        const hash = new Uint8Array(value.hash)

        return {
            bounceable,
            testOnly,
            workchain,
            hash
        }
    }

    private static parseRaw (value: string): AddressData {
        const data = value.split(':')
        const workchain = parseInt(data[0], 10)
        const hash = hexToBytes(data[1])
        const bounceable = false
        const testOnly = false

        return {
            bounceable,
            testOnly,
            workchain,
            hash
        }
    }

    private static encodeTag (options: AddressTag): number {
        const { bounceable, testOnly } = options
        const tag = bounceable ? FLAG_BOUNCEABLE : FLAG_NON_BOUNCEABLE

        return testOnly ? (tag | FLAG_TEST_ONLY) : tag
    }

    private static decodeTag (tag: number): AddressTag {
        let data = tag
        const testOnly = (data & FLAG_TEST_ONLY) !== 0

        if (testOnly) {
            data ^= FLAG_TEST_ONLY
        }

        if (![ FLAG_BOUNCEABLE, FLAG_NON_BOUNCEABLE ].includes(data)) {
            throw new Error('Address: bad address tag.')
        }

        const bounceable = data === FLAG_BOUNCEABLE

        return {
            bounceable,
            testOnly
        }
    }

    public eq (address: Address): boolean {
        return (address === this) || (
            bytesCompare(this._hash, address.hash) &&
            this._workchain === address.workchain
        )
    }

    public toString (type: AddressType = 'base64', options?: AddressStringifyOptions): string {
        const {
            workchain = this.workchain,
            bounceable = this.bounceable,
            testOnly = this.testOnly,
            urlSafe = true
        } = options || {}

        if (typeof workchain !== 'number' || workchain < -128 || workchain >= 128) {
            throw new Error('Address: workchain must be int8.')
        }

        if (typeof bounceable !== 'boolean') {
            throw new Error('Address: bounceable flag must be a boolean.')
        }

        if (typeof testOnly !== 'boolean') {
            throw new Error('Address: testOnly flag must be a boolean.')
        }

        if (typeof urlSafe !== 'boolean') {
            throw new Error('Address: urlSafe flag must be a boolean.')
        }

        if (type === 'raw') {
            return `${workchain}:${bytesToHex(this._hash)}`
        }

        const tag = Address.encodeTag({ bounceable, testOnly })
        const address = new Uint8Array([ tag, workchain, ...this._hash ])
        const checksum = crc16BytesBe(address)
        const base64 = bytesToBase64(new Uint8Array([ ...address, ...checksum ]))

        return urlSafe
            ? base64.replace(/\//g, '_').replace(/\+/g, '-')
            : base64.replace(/_/g, '/').replace(/-/g, '+')
    }

    public static readonly NONE = null

    private static isAddress (address: any): boolean {
        return address instanceof Address
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    public static isValid (address: any): boolean {
        try {
            // eslint-disable-next-line no-new
            new Address(address)
            return true
        } catch (e) {
            return false
        }
    }
}

export {
    Address,
    AddressRewriteOptions,
    AddressStringifyOptions
}
