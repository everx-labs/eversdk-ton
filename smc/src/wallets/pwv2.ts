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

import { Address, BOC, Block, Builder, Cell, Coins, KeyPair, Slice, Utils } from '@eversdk/ton'

/*
    The source code and LICENSE of the "ton-preprocessed-wallet-v2":
    https://github.com/pyAndr3w/ton-preprocessed-wallet-v2

    "const COMPILED = ..." is a compiled version (byte code) of
    the "ton-preprocessed-wallet-v2" in the bag of cells
    serialization in hexadecimal representation.

    code cell hash(sha256): 45EBBCE9B5D235886CB6BFE1C3AD93B708DE058244892365C9EE0DFE439CB7B5

    Respect the rights of open source software. Thanks! :)
    If you notice copyright violation, please create an issue.
*/
const COMPILED = 'B5EE9C7241010101003D000076FF00DDD40120F90001D0D33FD30FD74CED44D0D3FFD70B0F20A4830FA90822C8CBFFCB0FC9ED5444301046BAF2A1F823BEF2A2F910F2A3F800ED552E766412'

export interface PWV2Transfer {
    destination: Address;
    bounce:      boolean;
    value:       Coins;
    mode:        number;
    body?:       Cell;
    init?:       Block.StateInit;
}

export interface PWV2Storage {
    pubkey: Uint8Array;
    seqno: number;
}

export interface PWV2BuildTransferOptions {
    transfers: PWV2Transfer[];
    seqno: number;
    pkwid: Utils.Helpers.PrivateKeyWithID;
    init?: boolean;
    timeout?: number;
}

export class PreprocessedWalletV2 {
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
            .storeBytes(this._publicKey)
            .storeUint(0, 16) // seqno

        const stateInit = new Block.StateInit({
            code: this._code,
            data: data.cell()
        })

        return stateInit
    }

    public static parseStorage (storage: Slice): PWV2Storage {
        return {
            pubkey: storage.loadBytes(32),
            seqno: storage.loadUint(16)
        }
    }

    public buildTransfer (options: PWV2BuildTransferOptions): Block.Message {
        const {
            transfers,
            seqno,
            pkwid,
            init = false,
            timeout = 60
        } = options
        
        const actions: Block.OutAction[] = []

        for (const t of transfers) {
            const info = new Block.CommonMsgInfo({
                tag: 'int_msg_info',
                dest: t.destination,
                bounce: t.bounce,
                value: t.value
            })

            const action = new Block.OutAction({
                tag: 'action_send_msg',
                mode: t.mode,
                out_msg: new Block.Message({
                    info,
                    body: t.body,
                    init: t.init
                })
            })

            actions.push(action)
        }

        const outlist = new Block.OutList({ action: actions })

        const msgInner = new Builder()
            .storeUint(~~(Date.now() / 1000) + timeout, 64)
            .storeUint(seqno, 16)
            .storeRef(outlist.cell)
            .cell()

        const sign = Utils.Helpers.signCell({ cell: msgInner, ...pkwid })

        const msgBody = new Builder()
            .storeBytes(sign)
            .storeRef(msgInner)

        return new Block.Message({
            info: new Block.CommonMsgInfo({
                tag: 'ext_in_msg_info',
                dest: this._address
            }),
            init: init ? this._init : undefined,
            body: msgBody.cell()
        })
    }
}
