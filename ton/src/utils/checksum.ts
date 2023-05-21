// CRC16-XMODEM (poly = 0x1021, init = 0)
const crc16 = (data: Uint8Array | number[]): number => {
    const POLY = 0x1021
    const bytes = new Uint8Array(data)
    const int16 = bytes.reduce((acc, el) => {
        let crc = acc ^ (el << 8)

        for (let i = 0; i < 8; i++) {
            crc = (crc & 0x8000) === 0x8000
                ? (crc << 1) ^ POLY
                : crc << 1
        }

        return crc
    }, 0) & 0xffff

    const [ uint16 ] = new Uint16Array([ int16 ])

    return uint16
}

// CRC16 bytes in big-endian order
const crc16BytesBe = (data: Uint8Array | number[]): Uint8Array => {
    const crc = crc16(data)
    const buffer = new ArrayBuffer(2)
    const view = new DataView(buffer)

    view.setUint16(0, crc, false)

    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
}

// TODO: reimplement
const crc32c = (data: Uint8Array | number[]): number => {
    const POLY = 0x82f63b78
    const bytes = new Uint8Array(data)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const int32 = bytes.reduce((acc, el, i) => {
        let crc = acc ^ el

        // eslint-disable-next-line @typescript-eslint/no-shadow
        for (let i = 0; i < 8; i++) {
            crc = crc & 1 ? (crc >>> 1) ^ POLY : crc >>> 1
        }

        return crc
    }, 0 ^ 0xffffffff) ^ 0xffffffff

    const [ uint32 ] = new Uint32Array([ int32 ])

    return uint32
}

// CRC32C bytes in little-endian order
const crc32cBytesLe = (data: Uint8Array | number[]): Uint8Array => {
    const crc = crc32c(data)
    const buffer = new ArrayBuffer(4)
    const view = new DataView(buffer)

    view.setUint32(0, crc, true)

    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
}

export {
    crc16,
    crc32c,
    crc16BytesBe,
    crc32cBytesLe
}
