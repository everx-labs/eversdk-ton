import type { Bit } from '../types'
import type { Cell } from './cell'
import { Coins } from '../coins'
import { Address } from '../address'
import { bitsToHex, bitsToBytes, bytesToString } from '../utils/helpers'
import { bitsToIntUint, bitsToBigUint, bitsToBigInt } from '../utils/numbers'

// eslint-disable-next-line import/no-cycle
import { HashmapE, HashmapOptions } from './hashmap' // TODO: try to solve cycle deps

class Slice {
    private _bits: Bit[]

    private _refs: Cell[]

    private constructor (bits: Bit[], refs: Cell[]) {
        this._bits = bits
        this._refs = refs
    }

    public get bits (): Bit[] {
        return Array.from(this._bits)
    }

    public get refs (): Cell[] {
        return Array.from(this._refs)
    }

    /**
     * Alias for .skipBits()
     */
    public skip (size: number): this {
        return this.skipBits(size)
    }

    /**
     * Skip bits from {@link Slice}
     */
    public skipBits (size: number): this {
        if (this._bits.length < size) {
            throw new Error('Slice: bits overflow.')
        }

        this._bits.splice(0, size)
        return this
    }

    /**
     * Skip refs from {@link Slice}
     */
    public skipRefs (size: number): this {
        if (this._refs.length < size) {
            throw new Error('Slice: refs overflow.')
        }

        this._refs.splice(0, size)
        return this
    }

    /**
     * Skip dict from {@link Slice}
     */
    public skipDict (): this {
        // if (this._bits.length === 0) {
        //     throw new Error('Slice: skip dict overflow.')
        // }

        // if (this.preloadBit() === 1 && this._refs.length === 0) {
        //     throw new Error('Slice: skip dict overflow.')
        // }

        const isEmpty = this.loadBit() === 0
        return !isEmpty ? this.skipRefs(1) : this
    }

    /**
     * Read ref from {@link Slice}
     */
    public loadRef (): Cell {
        if (!this._refs.length) {
            throw new Error('Slice: refs overflow.')
        }

        return this._refs.shift()
    }

    /**
     * Same as .loadRef() but will not mutate {@link Slice}
     */
    public preloadRef (): Cell {
        if (!this._refs.length) {
            throw new Error('Slice: refs overflow.')
        }

        return this._refs[0]
    }

    /**
     * Read maybe ref from {@link Slice}
     */
    public loadMaybeRef (): Cell | null {
        return this.loadBit() === 1
            ? this.loadRef()
            : null
    }

    /**
     * Same as .loadMaybeRef() but will not mutate {@link Slice}
     */
    public preloadMaybeRef (): Cell | null {
        return this.preloadBit() === 1
            ? this.preloadRef()
            : null
    }

    /**
     * Read bit from {@link Slice}
     */
    public loadBit (): Bit {
        if (!this._bits.length) {
            throw new Error('Slice: bits overflow.')
        }

        return this._bits.shift()
    }

    /**
     * Same as .loadBit() but will not mutate {@link Slice}
     */
    public preloadBit (): Bit {
        if (!this._bits.length) {
            throw new Error('Slice: bits overflow.')
        }

        return this._bits[0]
    }

    /**
     * Read bits from {@link Slice}
     */
    public loadBits (size: number): Bit[] {
        if (size < 0 || this._bits.length < size) {
            throw new Error('Slice: bits overflow.')
        }

        return this._bits.splice(0, size)
    }

    /**
     * Same as .loadBits() but will not mutate {@link Slice}
     */
    public preloadBits (size: number): Bit[] {
        if (size < 0 || this._bits.length < size) {
            throw new Error('Slice: bits overflow.')
        }

        return this._bits.slice(0, size)
    }

    /**
     * Read int from {@link Slice}
     */
    public loadInt (size: number): number {
        const bits = this.loadBits(size)

        return bitsToIntUint(bits, { type: 'int' })
    }

    /**
     * Same as .loadInt() but will not mutate {@link Slice}
     */
    public preloadInt (size: number): number {
        const bits = this.preloadBits(size)

        return bitsToIntUint(bits, { type: 'int' })
    }

    /**
     * Same as .loadInt() but will return {@link BigInt}
     */
    public loadBigInt (size: number): bigint {
        const bits = this.loadBits(size)
        const { value } = bitsToBigInt(bits)

        return value
    }

    /**
     * Same as .preloadInt() but will return {@link BigInt}
     */
    public preloadBigInt (size: number): bigint {
        const bits = this.preloadBits(size)
        const { value } = bitsToBigInt(bits)

        return value
    }

    /**
     * Read uint from {@link Slice}
     */
    public loadUint (size: number): number {
        const bits = this.loadBits(size)

        return bitsToIntUint(bits, { type: 'uint' })
    }

    /**
     * Same as .loadUint() but will not mutate {@link Slice}
     */
    public preloadUint (size: number): number {
        const bits = this.preloadBits(size)

        return bitsToIntUint(bits, { type: 'uint' })
    }

    /**
     * Same as .loadUint() but will return {@link BigInt}
     */
    public loadBigUint (size: number): bigint {
        const bits = this.loadBits(size)
        const { value } = bitsToBigUint(bits)

        return value
    }

    /**
     * Same as .preloadUint() but will return {@link BigInt}
     */
    public preloadBigUint (size: number): bigint {
        const bits = this.preloadBits(size)
        const { value } = bitsToBigUint(bits)

        return value
    }

    /**
     * Read variable int from {@link Slice}
     */
    public loadVarInt (length: number): number {
        const size = Math.ceil(Math.log2(length))

        const sizeBytes = this.preloadUint(size)
        const sizeBits = sizeBytes * 8

        if (this.bits.length < sizeBits + size) {
            throw new Error('Slice: can\'t perform loadVarInt – not enough bits')
        }

        return this.skip(size).loadInt(sizeBits)
    }

    /**
     * Same as .loadVarInt() but will not mutate {@link Slice}
     */
    public preloadVarInt (length: number): number {
        const size = Math.ceil(Math.log2(length))
        const sizeBytes = this.preloadUint(size)
        const sizeBits = sizeBytes * 8
        const bits = this.preloadBits(size + sizeBits).slice(size)

        return bitsToIntUint(bits, { type: 'int' })
    }

    /**
     * Same as .loadVarInt() but will return {@link BigInt}
     */
    public loadVarBigInt (length: number): bigint {
        const size = Math.ceil(Math.log2(length))

        const sizeBytes = this.preloadUint(size)
        const sizeBits = sizeBytes * 8

        if (this.bits.length < sizeBits + size) {
            throw new Error('Slice: can\'t perform loadVarBigInt – not enough bits')
        }

        const bits = this.skip(size).loadBits(sizeBits)
        const { value } = bitsToBigInt(bits)

        return value
    }

    /**
     * Same as .preloadVarInt() but will return {@link BigInt}
     */
    public preloadVarBigInt (length: number): bigint {
        const size = Math.ceil(Math.log2(length))
        const sizeBytes = this.preloadUint(size)
        const sizeBits = sizeBytes * 8
        const bits = this.preloadBits(size + sizeBits).slice(size)
        const { value } = bitsToBigInt(bits)

        return value
    }

    /**
     * Read variable uint from {@link Slice}
     */
    public loadVarUint (length: number): number {
        const size = Math.ceil(Math.log2(length))

        const sizeBytes = this.preloadUint(size)
        const sizeBits = sizeBytes * 8

        if (this.bits.length < sizeBits + size) {
            throw new Error('Slice: can\'t perform loadVarUint – not enough bits')
        }

        return this.skip(size).loadUint(sizeBits)
    }

    /**
     * Same as .loadVarUint() but will not mutate {@link Slice}
     */
    public preloadVarUint (length: number): number {
        const size = Math.ceil(Math.log2(length))
        const sizeBytes = this.preloadUint(size)
        const sizeBits = sizeBytes * 8
        const bits = this.preloadBits(size + sizeBits).slice(size)

        return bitsToIntUint(bits, { type: 'uint' })
    }

    /**
     * Same as .loadVarUint() but will return {@link BigInt}
     */
    public loadVarBigUint (length: number): bigint {
        const size = Math.ceil(Math.log2(length))
        const sizeBytes = this.preloadUint(size)
        const sizeBits = sizeBytes * 8

        if (this.bits.length < sizeBits + size) {
            throw new Error('Slice: can\'t perform loadVarBigUint – not enough bits')
        }

        const bits = this.skip(size).loadBits(sizeBits)
        const { value } = bitsToBigUint(bits)

        return value
    }

    /**
     * Same as .preloadVarUint() but will return {@link BigInt}
     */
    public preloadVarBigUint (length: number): bigint {
        const size = Math.ceil(Math.log2(length))
        const sizeBytes = this.preloadUint(size)
        const sizeBits = sizeBytes * 8
        const bits = this.preloadBits(size + sizeBits).slice(size)
        const { value } = bitsToBigUint(bits)

        return value
    }

    /**
     * Read bytes from {@link Slice}
     */
    public loadBytes (size: number): Uint8Array {
        const bits = this.loadBits(size)

        return bitsToBytes(bits)
    }

    /**
     * Same as .loadBytes() but will not mutate {@link Slice}
     */
    public preloadBytes (size: number): Uint8Array {
        const bits = this.preloadBits(size)

        return bitsToBytes(bits)
    }

    /**
     * Read string from {@link Slice}
     */
    public loadString (size: number = null): string {
        const bytes = size === null
            ? this.loadBytes(this._bits.length)
            : this.loadBytes(size)

        return bytesToString(bytes)
    }

    /**
     * Same as .loadString() but will not mutate {@link Slice}
     */
    public preloadString (size: number = null): string {
        const bytes = size === null
            ? this.preloadBytes(this._bits.length)
            : this.preloadBytes(size)

        return bytesToString(bytes)
    }

    /**
     * Read {@link Address} from {@link Slice}
     */
    public loadAddress (): Address | null {
        const FLAG_ADDRESS_NO = [ 0, 0 ]
        const FLAG_ADDRESS = [ 1, 0 ]
        const flag = this.preloadBits(2)

        if (flag.every((bit, i) => bit === FLAG_ADDRESS_NO[i])) {
            return this.skip(2) && Address.NONE
        }

        if (flag.every((bit, i) => bit === FLAG_ADDRESS[i])) {
            // 2 bits flag, 1 bit anycast, 8 bits workchain, 256 bits address hash
            const size = 2 + 1 + 8 + 256
            // Slice 2 because we dont need flag bits
            const bits = this.loadBits(size).slice(2)

            // Anycast is currently unused
            const _anycast = bits.splice(0, 1) // eslint-disable-line

            const workchain = bitsToIntUint(bits.splice(0, 8), { type: 'int' })
            const hash = bitsToHex(bits.splice(0, 256))
            const raw = `${workchain}:${hash}`

            return new Address(raw)
        }

        throw new Error('Slice: bad address flag bits.')
    }

    /**
     * Same as .loadAddress() but will not mutate {@link Slice}
     */
    public preloadAddress (): Address {
        const FLAG_ADDRESS_NO = [ 0, 0 ]
        const FLAG_ADDRESS = [ 1, 0 ]
        const flag = this.preloadBits(2)

        if (flag.every((bit, i) => bit === FLAG_ADDRESS_NO[i])) {
            return Address.NONE
        }

        if (flag.every((bit, i) => bit === FLAG_ADDRESS[i])) {
            // 2 bits flag, 1 bit anycast, 8 bits workchain, 256 bits address hash
            const size = 2 + 1 + 8 + 256
            const bits = this.preloadBits(size).slice(2)
            // Splice 2 because we dont need flag bits

            // Anycast is currently unused
            const _anycast = bits.splice(0, 1) // eslint-disable-line

            const workchain = bitsToIntUint(bits.splice(0, 8), { type: 'int' })
            const hash = bitsToHex(bits.splice(0, 256))
            const raw = `${workchain}:${hash}`

            return new Address(raw)
        }

        throw new Error('Slice: bad address flag bits.')
    }

    /**
     * Read {@link Coins} from {@link Slice}
     */
    public loadCoins (decimals = 9): Coins {
        const coins = this.loadVarBigUint(16)

        return new Coins(coins, { isNano: true, decimals })
    }

    /**
     * Same as .loadCoins() but will not mutate {@link Slice}
     */
    public preloadCoins (decimals = 9): Coins {
        const coins = this.preloadVarBigUint(16)

        return new Coins(coins, { isNano: true, decimals })
    }

    /**
     * Read {@link HashmapE} from {@link Slice}
     */
    public loadDict <K = Bit[], V = Cell> (
        keySize: number,
        options?: HashmapOptions<K, V>
    ): HashmapE<K, V> {
        const dictConstructor = this.loadBit()
        const isEmpty = dictConstructor === 0

        return !isEmpty
            ?
            HashmapE.parse<K, V>(
                keySize,
                new Slice([ dictConstructor ], [ this.loadRef() ]),
                options
            )
            :
            new HashmapE<K, V>(keySize, options)
    }

    /**
     * Same as .loadDict() but will not mutate {@link Slice}
     */
    public preloadDict <K = Bit[], V = Cell> (
        keySize: number,
        options?: HashmapOptions<K, V>
    ): HashmapE<K, V> {
        const dictConstructor = this.preloadBit()
        const isEmpty = dictConstructor === 0

        return !isEmpty
            ?
            HashmapE.parse<K, V>(
                keySize,
                new Slice([ dictConstructor ], [ this.preloadRef() ]),
                options
            )
            :
            new HashmapE<K, V>(keySize, options)
    }

    /**
     * Creates new {@link Slice} from {@link Cell}
     */
    public static parse (cell: Cell): Slice {
        return new Slice(cell.bits, cell.refs)
    }
}

export { Slice }
