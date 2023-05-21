import { Mask } from './mask'
import { Slice } from './slice'
import { Builder } from './builder'
import { Hashmap, HashmapE } from './hashmap'
import { Cell, CellType, CellOptions } from './cell'

import {
    base64ToBytes,
    bytesToBase64,
    hexToBytes,
    bytesToHex
} from '../utils/helpers'

import {
    serialize,
    deserialize,
    deserializeFift,
    BOCOptions
} from './serializer'

class BOC {
    private static isHex (data: any): boolean {
        const re = /^[a-fA-F0-9]+$/

        return typeof data === 'string' && re.test(data)
    }

    private static isBase64 (data: any): boolean {
        // eslint-disable-next-line no-useless-escape
        const re = /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/

        return typeof data === 'string' && re.test(data)
    }

    private static isFift (data: any): boolean {
        const re = /^x\{/

        return typeof data === 'string' && re.test(data)
    }

    private static isBytes (data: any): boolean {
        return ArrayBuffer.isView(data)
    }

    /**
     * Returns deserialized BOC root cells.
     */
    public static from (data: Uint8Array | string, checkMerkleProofs = false): Cell[] {
        if (BOC.isBytes(data)) {
            return deserialize(data as Uint8Array, checkMerkleProofs)
        }

        const value = (data as string).trim()

        if (BOC.isFift(value)) {
            if (checkMerkleProofs) {
                throw new Error('BOC: cheking Merkle Proofs is not currently implemented for fift hex')
            }

            return deserializeFift(value)
        }

        if (BOC.isHex(value)) {
            return deserialize(hexToBytes(value), checkMerkleProofs)
        }

        if (BOC.isBase64(value)) {
            return deserialize(base64ToBytes(value), checkMerkleProofs)
        }

        throw new Error('BOC: can\'t deserialize. Bad data.')
    }

    /**
     * Returns deserialized standard BOC root cell.
     */
    public static fromStandard (
        data: Uint8Array | string,
        checkMerkleProofs = false
    ): Cell {
        const cells = BOC.from(data, checkMerkleProofs)

        if (cells.length !== 1) {
            throw new Error(`BOC: standard BOC consists of only 1 root cell. Got ${cells.length}.`)
        }

        return cells[0]
    }

    /**
     * Returns serialized BOC in bytes representation.
     */
    public static toBytes (cells: Cell[], options?: BOCOptions): Uint8Array {
        if (cells.length === 0 || cells.length > 4) {
            throw new Error('BOC: root cells length must be from 1 to 4')
        }

        return serialize(cells, options)
    }

    /**
     * Returns serialized standard BOC in bytes representation.
     */
    public static toBytesStandard (cell: Cell, options?: BOCOptions): Uint8Array {
        return BOC.toBytes([ cell ], options)
    }

    /**
     * Returns serialized BOC in base64 representation.
     */
    public static toBase64 (cells: Cell[], options?: BOCOptions): string {
        const bytes = BOC.toBytes(cells, options)

        return bytesToBase64(bytes)
    }

    /**
     * Returns serialized standard BOC in base64 representation.
     */
    public static toBase64Standard (cell: Cell, options?: BOCOptions): string {
        return BOC.toBase64([ cell ], options)
    }

    /**
     * Returns serialized BOC in Fift HEX representation.
     */
    public static toFiftHex (cells: Cell[]): string {
        const fift = cells.map(cell => cell.print())

        return fift.join('\n')
    }

    /**
     * Returns serialized standard BOC in Fift HEX representation.
     */
    public static toFiftHexStandard (cell: Cell): string {
        return BOC.toFiftHex([ cell ])
    }

    /**
     * Returns serialized BOC in hex representation.
     */
    public static toHex (cells: Cell[], options?: BOCOptions): string {
        const bytes = BOC.toBytes(cells, options)

        return bytesToHex(bytes)
    }

    /**
     * Returns serialized standard BOC in hex representation.
     */
    public static toHexStandard (cell: Cell, options?: BOCOptions): string {
        return BOC.toHex([ cell ], options)
    }
}

export {
    BOC,
    BOCOptions,
    Mask,
    Cell,
    CellType,
    CellOptions,
    Hashmap,
    HashmapE,
    Slice,
    Builder
}
