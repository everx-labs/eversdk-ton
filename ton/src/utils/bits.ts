import type { Bit } from '../types'

/**
 * Augment bits with 1 and leading 0 to be divisible by 8 or 4 without remainder.
 * Mostly used for BOC serialization or Cell hash calculations.
 */
const augment = (bits: Bit[], divider: 4 | 8 = 8): Bit[] => {
    const amount = divider - (bits.length % divider)
    const overage = [ ...Array(amount) ].map((_el, i) => (i === 0 ? 1 : 0))

    if (overage.length !== 0 && overage.length !== divider) {
        return bits.concat(overage)
    }

    return bits
}

/**
 * Remove augmented bits.
 * Mostly used for BOC serialization or Cell hash calculations.
 */
const rollback = (bits: Bit[]): Bit[] => {
    const index = bits.slice(-7).reverse().indexOf(1)

    if (index === -1) {
        throw new Error('Incorrectly augmented bits.')
    }

    return bits.slice(0, -(index + 1))
}

export {
    augment,
    rollback
}
