import type { Bit } from '../types'
import type { Coins } from '../coins'
import type { HashmapE } from './hashmap'
import { Address } from '../address'
import { bitsToBytes, stringToBytes } from '../utils/helpers'

// eslint-disable-next-line import/no-cycle
import { Slice } from './slice' // TODO: try to solve cycle deps

// eslint-disable-next-line import/no-cycle
import { Cell, CellType } from './cell' // TODO: try to solve cycle deps

type BitLike = Bit | number | boolean

class Builder {
    private _size: number

    private _refs: Cell[]

    private _bits: Bit[]

    constructor (size = 1023) {
        this._size = size
        this._bits = []
        this._refs = []
    }

    private static checkSliceType (slice: Slice): void {
        if (slice instanceof Slice === false) {
            throw new Error('Builder: can\'t store slice, because it\'s type is not a Slice.')
        }
    }

    private static checkAddressType (address: Address): void {
        if (address instanceof Address === false) {
            throw new Error('Builder: can\'t store address, because it\'s type is not an Address.')
        }
    }

    private static checkBitsTypeAndNormalize (bits: BitLike[]): Bit[] {
        return bits.map((bit) => {
            if (bit !== 0 && bit !== 1 && bit !== false && bit !== true) {
                throw new Error('Builder: can\'t store bit, because it\'s type is not a Number or Boolean, or value doesn\'t equals 0 nor 1.')
            }

            return (bit === 1 || bit === true) ? 1 : 0
        })
    }

    private checkBitsOverflow (size: number): void {
        if (size > this.remainder) {
            throw new Error(`Builder: bits overflow. Can't add ${size} bits. Only ${this.remainder} bits left.`)
        }
    }

    private static checkRefsType (refs: Cell[]): void {
        if (!refs.every(cell => cell instanceof Cell === true)) {
            throw new Error('Builder: can\'t store ref, because it\'s type is not a Cell.')
        }
    }

    private checkRefsOverflow (size: number): void {
        if (size > (4 - this._refs.length)) {
            throw new Error(`Builder: refs overflow. Can't add ${size} refs. Only ${4 - this._refs.length} refs left.`)
        }
    }

    private storeNumber (value: bigint, size: number): this {
        const bits = Array.from({ length: size })
            .map((_el, i) => Number(((value >> BigInt(i)) & 1n) === 1n) as Bit)
            .reverse()

        this.storeBits(bits)

        return this
    }

    public get size (): number {
        return this._size
    }

    public get bits (): Bit[] {
        return Array.from(this._bits)
    }

    public get bytes (): Uint8Array {
        return bitsToBytes(this._bits)
    }

    public get refs (): Cell[] {
        return Array.from(this._refs)
    }

    public get remainder (): number {
        return this._size - this._bits.length
    }

    public storeSlice (slice: Slice): this {
        Builder.checkSliceType(slice)

        const { bits, refs } = slice

        this.checkBitsOverflow(bits.length)
        this.checkRefsOverflow(refs.length)
        this.storeBits(bits)

        refs.forEach(ref => this.storeRef(ref))

        return this
    }

    public storeRef (ref: Cell): this {
        Builder.checkRefsType([ ref ])
        this.checkRefsOverflow(1)
        this._refs.push(ref)

        return this
    }

    public storeMaybeRef (ref?: Cell): this {
        if (!ref) return this.storeBit(0)
        return this.storeBit(1).storeRef(ref)
    }

    public storeRefs (refs: Cell[]): this {
        Builder.checkRefsType(refs)
        this.checkRefsOverflow(refs.length)
        this._refs.push(...refs)

        return this
    }

    public storeBit (bit: BitLike): this {
        const value = Builder.checkBitsTypeAndNormalize([ bit ])

        this.checkBitsOverflow(1)
        this._bits = this._bits.concat(value)

        return this
    }

    public storeBits (bits: BitLike[]): this {
        const value = Builder.checkBitsTypeAndNormalize(bits)

        this.checkBitsOverflow(value.length)
        this._bits = this._bits.concat(value)

        return this
    }

    public storeInt (value: number | bigint, size: number): this {
        const int = BigInt(value)
        const intBits = 1n << (BigInt(size) - 1n)

        if (int < -intBits || int >= intBits) {
            throw new Error('Builder: can\'t store an Int, because its value allocates more space than provided.')
        }

        this.storeNumber(int, size)

        return this
    }

    public storeUint (value: number | bigint, size: number): this {
        const uint = BigInt(value)

        if (uint < 0 || uint >= (1n << BigInt(size))) {
            throw new Error('Builder: can\'t store an UInt, because its value allocates more space than provided.')
        }

        this.storeNumber(uint, size)

        return this
    }

    public storeVarInt (value: number | bigint, length: number): this {
        // var_int$_ {n:#} len:(#< n) value:(int (len * 8)) = VarInteger n;

        const int = BigInt(value)
        const size = Math.ceil(Math.log2(length))
        const sizeBytes = Math.ceil((int.toString(2).length) / 8)
        const sizeBits = sizeBytes * 8

        this.checkBitsOverflow(size + sizeBits)

        return int === 0n
            ? this.storeUint(0, size)
            : this.storeUint(sizeBytes, size).storeInt(value, sizeBits)
    }

    public storeVarUint (value: number | bigint, length: number): this {
        // var_uint$_ {n:#} len:(#< n) value:(uint (len * 8)) = VarUInteger n;

        const uint = BigInt(value)
        const size = Math.ceil(Math.log2(length))
        const sizeBytes = Math.ceil((uint.toString(2).length) / 8)
        const sizeBits = sizeBytes * 8

        this.checkBitsOverflow(size + sizeBits)

        return uint === 0n
            ? this.storeUint(0, size)
            : this.storeUint(sizeBytes, size).storeUint(value, sizeBits)
    }

    public storeBytes (value: Uint8Array | number[]): this {
        this.checkBitsOverflow(value.length * 8)

        Uint8Array.from(value).forEach((byte: number) => this.storeUint(byte, 8))

        return this
    }

    public storeString (value: string): this {
        const bytes = stringToBytes(value)

        this.storeBytes(bytes)

        return this
    }

    public storeAddress (address: Address | null): this {
        if (address === null) {
            this.storeBits([ 0, 0 ])

            return this
        }

        const anycast = 0
        const addressBitsSize = 2 + 1 + 8 + 256

        Builder.checkAddressType(address)
        this.checkBitsOverflow(addressBitsSize)
        this.storeBits([ 1, 0 ])
        this.storeUint(anycast, 1)
        this.storeInt(address.workchain, 8)
        this.storeBytes(address.hash)

        return this
    }

    public storeCoins (coins: Coins): this {
        if (coins.isNegative()) {
            throw new Error('Builder: coins value can\'t be negative.')
        }

        const nano = BigInt(coins.toNano())

        // https://github.com/ton-blockchain/ton/blob/master/crypto/block/block.tlb#L116
        this.storeVarUint(nano, 16)

        return this
    }

    public storeDict (hashmap?: HashmapE<any, any>): this {
        if (!hashmap) return this.storeBit(0)

        const slice = hashmap.cell().parse()
        this.storeSlice(slice)

        return this
    }

    public clone (): Builder {
        const data = new Builder(this._size)

        // Use getters to get copy of arrays
        data.storeBits(this.bits)
        this.refs.forEach(ref => data.storeRef(ref))

        return data
    }

    public cell (type: CellType = CellType.Ordinary): Cell {
        // Use getters to get copies of an arrays
        const cell = new Cell({
            bits: this.bits,
            refs: this.refs,
            type
        })

        return cell
    }
}

export { Builder }
