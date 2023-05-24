/*
    @eversdk/smc – commonly used tvm contracts typescript package

    Copyright (C) 2023 EverX

    This file is part of @eversdk/smc.

    @eversdk/smc is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as
    published by the Free Software Foundation, either version 3 of
    the License, or (at your option) any later version.

    @eversdk/smc is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
    GNU Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public License
    along with @eversdk/smc. If not, see <https://www.gnu.org/licenses/>.
*/

import { Address, BOC, Block, Builder, Cell, Coins, Slice, Utils } from '@eversdk/ton'

/*
    The source code and LICENSE of the "ever-wallet-contract":
    https://github.com/broxus/ever-wallet-contract

    "const COMPILED = ..." is a compiled version (byte code) of
    the "ever-wallet-contract" in the bag of cells
    serialization in hexadecimal representation.

    code cell hash(sha256): 3BA6528AB2694C118180AA3BD10DD19FF400B909AB4DCF58FC69925B2C7B12A6

    Respect the rights of open source software. Thanks! :)
    If you notice copyright violation, please create an issue.
*/
const COMPILED = 'te6cckEBBgEA/AABFP8A9KQT9LzyyAsBAgEgAgMABNIwAubycdcBAcAA8nqDCNcY7UTQgwfXAdcLP8j4KM8WI88WyfkAA3HXAQHDAJqDB9cBURO68uBk3oBA1wGAINcBgCDXAVQWdfkQ8qj4I7vyeWa++COBBwiggQPoqFIgvLHydAIgghBM7mRsuuMPAcjL/8s/ye1UBAUAmDAC10zQ+kCDBtcBcdcBeNcB10z4AHCAEASqAhSxyMsFUAXPFlAD+gLLaSLQIc8xIddJoIQJuZgzcAHLAFjPFpcwcQHLABLM4skB+wAAPoIQFp4+EbqOEfgAApMg10qXeNcB1AL7AOjRkzLyPOI+zYS/'

const METHOD_SEND_TRANSACTION_RAW = 0x169e3e11

export interface EVTransfer {
    destination: Address;
    bounce:      boolean;
    value:       Coins;
    mode:        number;
    body?:       Cell;
    init?:       Block.StateInit;
}

export interface EVBuildTransferOptions {
    transfers: EVTransfer[];
    pkwid: Utils.Helpers.PrivateKeyWithID;
    init?: boolean;
    timeout?: number;
}

export interface EverWalletStorage {
    pubkey: Uint8Array;
    timestamp: number;
}

export class EverWallet {
    private _code: Cell

    private _publicKey: Uint8Array

    private _init: Block.StateInit

    private _address: Address

    constructor (publicKey: Uint8Array, wc = 0) {
        this._code      = BOC.fromStandard(COMPILED)
        this._publicKey = publicKey
        this._init      = this.buildStateInit()
        this._address   = new Address(`${wc}:${this._init.cell.hash()}`)
    }

    public get code (): Cell { return this._code }

    public get init (): Block.StateInit { return this._init }

    public get address (): Address { return this._address }

    public get publicKey (): Uint8Array { return this._publicKey }

    private buildStateInit (): Block.StateInit {
        const data = new Builder()
            .storeBytes(this._publicKey) // _pubkey
            .storeUint(0, 64)            // _timestamp

        const stateInit = new Block.StateInit({
            code: this._code,
            data: data.cell()
        })

        return stateInit
    }

    public static parseStorage (storage: Slice): EverWalletStorage {
        return {
            pubkey: storage.loadBytes(32),
            timestamp: storage.loadUint(64)
        }
    }

    public buildTransfer (options: EVBuildTransferOptions): Block.Message {
        const {
            transfers,
            pkwid,
            init = false,
            timeout = 60
        } = options

        if (transfers.length > 4) {
            throw new Error('EverWallet: transfers length must be <= 4')
        }

        const now = ~~(Date.now() / 1000)

        const part = new Builder()
            .storeBit(0)                  // msg_pubkey
            .storeUint(now, 64)           // msg_timestamp
            .storeUint(now + timeout, 32) // expire_at
            .storeUint(METHOD_SEND_TRANSACTION_RAW, 32)

        for (let i = 0; i < transfers.length; i++) {
            const t = transfers[i]

            const info = new Block.CommonMsgInfo({
                tag: 'int_msg_info',
                dest: t.destination,
                bounce: t.bounce,
                value: t.value
            })

            const msg = new Block.Message({
                info,
                body: t.body,
                init: t.init
            })

            part.storeUint(t.mode, 8)
            part.storeRef(msg.cell)
        }

        const tail = part.cell().parse()

        const bodyWithAddress = new Builder()
            .storeAddress(this._address)
            .storeSlice(tail)

        const sign = Utils.Helpers.signCell({
            cell: bodyWithAddress.cell(),
            ...pkwid
        })

        const extMsgBody = new Builder()
            .storeBit(1)      // Maybe
            .storeBytes(sign) // signature
            .storeSlice(tail)

        return new Block.Message({
            info: new Block.CommonMsgInfo({
                tag: 'ext_in_msg_info',
                dest: this._address
            }),
            init: init ? this._init : undefined,
            body: extMsgBody.cell()
        })
    }
}
