import Decimal from 'decimal.js'

interface CoinsOptions {
    isNano?: boolean;
    decimals?: number;
}

class Coins {
    private value: Decimal

    private decimals: number

    private multiplier: number

    constructor (value: Coins | bigint | number | string, options?: CoinsOptions) {
        const { isNano = false, decimals = 9 } = options || {}

        Coins.checkCoinsType(value)
        Coins.checkCoinsDecimals(decimals)

        const decimal = new Decimal(value.toString())

        if (decimal.dp() > decimals) {
            throw new Error(`Invalid Coins value, decimals places "${decimal.dp()}" can't be greater than selected "${decimals}"`)
        }

        this.decimals = decimals
        this.multiplier = (1 * 10) ** this.decimals
        this.value = !isNano
            ? decimal.mul(this.multiplier)
            : decimal
    }

    public add (coins: Coins): this {
        Coins.checkCoins(coins)
        Coins.compareCoinsDecimals(this, coins)

        this.value = this.value.add(coins.value)

        return this
    }

    public sub (coins: Coins): this {
        Coins.checkCoins(coins)
        Coins.compareCoinsDecimals(this, coins)

        this.value = this.value.sub(coins.value)

        return this
    }

    public mul (value: bigint | number | string): this {
        Coins.checkValue(value)
        Coins.checkConvertability(value)

        const multiplier = value.toString()

        this.value = this.value.mul(multiplier)

        return this
    }

    public div (value: bigint | number | string): this {
        Coins.checkValue(value)
        Coins.checkConvertability(value)

        const divider = value.toString()

        this.value = this.value.div(divider)

        return this
    }

    public eq (coins: Coins): boolean {
        Coins.checkCoins(coins)
        Coins.compareCoinsDecimals(this, coins)

        return this.value.eq(coins.value)
    }

    public gt (coins: Coins): boolean {
        Coins.checkCoins(coins)
        Coins.compareCoinsDecimals(this, coins)

        return this.value.gt(coins.value)
    }

    public gte (coins: Coins): boolean {
        Coins.checkCoins(coins)
        Coins.compareCoinsDecimals(this, coins)

        return this.value.gte(coins.value)
    }

    public lt (coins: Coins): boolean {
        Coins.checkCoins(coins)
        Coins.compareCoinsDecimals(this, coins)

        return this.value.lt(coins.value)
    }

    public lte (coins: Coins): boolean {
        Coins.checkCoins(coins)
        Coins.compareCoinsDecimals(this, coins)

        return this.value.lte(coins.value)
    }

    public isNegative (): boolean {
        return this.value.isNegative()
    }

    public isPositive (): boolean {
        return this.value.isPositive()
    }

    public isZero (): boolean {
        return this.value.isZero()
    }

    public toString (): string {
        const value = this.value.div(this.multiplier).toFixed(this.decimals)

        // Remove all trailing zeroes
        const re1 = new RegExp(`\\.0{${this.decimals}}$`)
        const re2 = /(\.[0-9]*?[0-9])0+$/
        const coins = value.replace(re1, '').replace(re2, '$1')

        return coins
    }

    public toNano (): string {
        return this.value.toFixed(0)
    }

    private static checkCoinsType (value: any): void {
        if (Coins.isValid(value) && Coins.isConvertable(value)) return undefined
        if (Coins.isCoins(value)) return undefined

        throw new Error('Invalid Coins value')
    }

    private static checkCoinsDecimals (decimals: number): void {
        if (decimals < 0 || decimals > 18) {
            throw new Error('Invalid decimals value, must be 0-18')
        }
    }

    private static compareCoinsDecimals (a: Coins, b: Coins): void {
        if (a.decimals !== b.decimals) {
            throw new Error("Can't perform mathematical operation of Coins with different decimals")
        }
    }

    private static checkValue (value: any): void {
        if (Coins.isValid(value)) return undefined

        throw new Error('Invalid value')
    }

    private static checkCoins (value: any): void {
        if (Coins.isCoins(value)) return undefined

        throw new Error('Invalid value')
    }

    private static checkConvertability (value: any): void {
        if (Coins.isConvertable(value)) return undefined

        throw new Error('Invalid value')
    }

    private static isValid (value: any): boolean {
        return typeof value === 'string'
            || typeof value === 'number'
            || typeof value === 'bigint'
    }

    private static isCoins (value: any): boolean {
        return value instanceof Coins
    }

    private static isConvertable (value: any): boolean {
        try {
            // eslint-disable-next-line no-new
            new Decimal(value.toString())
            return true
        } catch (_err) {
            return false
        }
    }

    public static fromNano (value: bigint | number | string, decimals = 9): Coins {
        Coins.checkCoinsType(value)
        Coins.checkCoinsDecimals(decimals)

        return new Coins(value, { isNano: true, decimals })
    }
}

export {
    Coins,
    CoinsOptions
}
