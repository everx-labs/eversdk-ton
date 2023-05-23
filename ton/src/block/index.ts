import type { Bit } from '../types'
import { Address } from '../address'
import { Coins } from '../coins'
import { Builder, Cell, HashmapE, Slice } from '../boc'

interface BlockStruct {
    get data (): any;
    get cell (): Cell;
}

export interface TickTockOptions {
    tick: boolean;
    tock: boolean;
}

/**
 *  tick_tock$_ tick:Bool tock:Bool = TickTock;
 */
export class TickTock implements BlockStruct {
    private _data: TickTockOptions

    private _cell: Cell

    constructor (options: TickTockOptions) {
        this._data = options

        this._cell = new Builder()
            .storeBit(options.tick)
            .storeBit(options.tock)
            .cell()
    }

    public static parse (cs: Slice): TickTock {
        const tickTock = new TickTock({
            tick: cs.loadBit() === 1,
            tock: cs.loadBit() === 1
        })

        return tickTock
    }

    public get data (): TickTockOptions { return this._data }

    public get cell (): Cell { return this._cell }
}

export interface SimpleLibOptions {
    public: boolean;
    root:   Cell;
}

/**
 *  simple_lib$_ public:Bool root:^Cell = SimpleLib;
 */
export class SimpleLib implements BlockStruct {
    private _data: SimpleLibOptions

    private _cell: Cell

    constructor (options: SimpleLibOptions) {
        this._data = options

        this._cell = new Builder()
            .storeBit(options.public)
            .storeRef(options.root)
            .cell()
    }

    public static parse (cs: Slice): SimpleLib {
        const simpleLib = new SimpleLib({
            public: cs.loadBit() === 1,
            root: cs.loadRef()
        })

        return simpleLib
    }

    public get data (): SimpleLibOptions { return this._data }

    public get cell (): Cell { return this._cell }
}

export interface StateInitOptions {
    split_depth?:   number;
    special?:       TickTock;
    code?:          Cell;
    data?:          Cell;
    library?:       HashmapE<Bit[], SimpleLib>;
}

/**
 *  _ split_depth:(Maybe (## 5)) special:(Maybe TickTock)
 *      code:(Maybe ^Cell) data:(Maybe ^Cell)
 *      library:(HashmapE 256 SimpleLib) = StateInit;
 */
export class StateInit implements BlockStruct {
    private _data: StateInitOptions

    private _cell: Cell

    constructor (options: StateInitOptions) {
        this._data = options

        const b = new Builder()

        if (this._data.split_depth) {
            b.storeUint(options.split_depth, 5)
        } else {
            b.storeBit(0)
        }

        b.storeMaybeRef(this._data.special?.cell)
        b.storeMaybeRef(this._data.code)
        b.storeMaybeRef(this._data.data)
        b.storeDict(this._data.library)

        this._cell = b.cell()
    }

    public static parse (cs: Slice): StateInit {
        const options: StateInitOptions = {}

        if (cs.loadBit()) { options.split_depth = cs.loadUint(5) }
        if (cs.loadBit()) { options.special = TickTock.parse(cs) }
        if (cs.loadBit()) { options.code = cs.loadRef() }
        if (cs.loadBit()) { options.data = cs.loadRef() }

        const deserializers = {
            key: (k: Bit[]): Bit[] => k,
            value: (v: Cell): SimpleLib => SimpleLib.parse(v.parse())
        }

        options.library = HashmapE.parse(256, cs, { deserializers })

        return new StateInit(options)
    }

    public get data (): StateInitOptions { return this._data }

    public get cell (): Cell { return this._cell }
}

export namespace CommonMsgInfo {
    /**
    * ```
    * int_msg_info$0 ihr_disabled:Bool bounce:Bool bounced:Bool
    *     src:MsgAddressInt dest:MsgAddressInt
    *     value:CurrencyCollection ihr_fee:Grams fwd_fee:Grams
    *     created_lt:uint64 created_at:uint32 = CommonMsgInfo;
    * ```
    */
    export interface int_msg_info {
        tag:            'int_msg_info';
        ihr_disabled?:  boolean;
        bounce:         boolean;
        bounced?:       boolean;
        src?:           Address;
        dest:           Address;
        value:          Coins; // TODO: CurrencyCollection
        ihr_fee?:       Coins;
        fwd_fee?:       Coins;
        created_lt?:    number;
        created_at?:    number;
    }

    /**
    * ```
    * ext_in_msg_info$10 src:MsgAddressExt dest:MsgAddressInt
    *       import_fee:Grams = CommonMsgInfo;
    * ```
    */
    export interface ext_in_msg_info {
        tag:            'ext_in_msg_info';
        src?:           Address;
        dest:           Address;
        import_fee?:    Coins;
    }
} // CommonMsgInfo

export type CommonMsgInfoT =
    CommonMsgInfo.int_msg_info |
    CommonMsgInfo.ext_in_msg_info

export class CommonMsgInfo implements BlockStruct {
    private _data: CommonMsgInfoT

    private _cell: Cell

    constructor (data: CommonMsgInfoT) {
        switch (data.tag) {
            case 'int_msg_info': this.int_msg_info(data); break
            case 'ext_in_msg_info': this.ext_in_msg_info(data); break
            default: throw new Error('OutAction: unexpected tag')
        }
    }

    private int_msg_info (data: CommonMsgInfo.int_msg_info) {
        const b = new Builder()
            .storeBits([ 0 ])                           // int_msg_info$0
            .storeBit(data.ihr_disabled || false)       // ihr_disabled:Bool
            .storeBit(data.bounce)                      // bounce:Bool
            .storeBit(data.bounced || false)            // bounced:Bool
            .storeAddress(data.src || Address.NONE)     // src:MsgAddressInt
            .storeAddress(data.dest)                    // dest:MsgAddressInt
            .storeCoins(data.value)                     // value: -> grams:Grams
            .storeBit(0)                                // value: -> other:ExtraCurrencyCollection
            .storeCoins(data.ihr_fee || new Coins(0))   // ihr_fee:Grams
            .storeCoins(data.fwd_fee || new Coins(0))   // fwd_fee:Grams
            .storeUint(data.created_lt || 0, 64)        // created_lt:uint64
            .storeUint(data.created_at || 0, 32)        // created_at:uint32

        this._data = data as CommonMsgInfoT
        this._cell = b.cell()
    }

    /*
    ext_in_msg_info$10 src:MsgAddressExt dest:MsgAddressInt
        import_fee:Grams = CommonMsgInfo;
    */

    private ext_in_msg_info (data: CommonMsgInfo.ext_in_msg_info) {
        const b = new Builder()
            .storeBits([ 1, 0 ])                         // ext_in_msg_info$10
            .storeAddress(data.src || Address.NONE)      // src:MsgAddress
            .storeAddress(data.dest)                     // dest:MsgAddressExt
            .storeCoins(data.import_fee || new Coins(0)) // ihr_fee:Grams

        this._data = data as CommonMsgInfoT
        this._cell = b.cell()
    }

    public static parse (cs: Slice): CommonMsgInfo {
        const frst = cs.loadBit()

        if (frst === 1) {
            const scnd = cs.loadBit()
            if (scnd === 1) throw new Error('CommonMsgInfo: ext_out_msg_info unimplemented')

            return new CommonMsgInfo({
                tag: 'ext_in_msg_info',
                src: cs.loadAddress(),
                dest: cs.loadAddress(),
                import_fee: cs.loadCoins()
            })
        }

        if (frst === 0) {
            const data: CommonMsgInfoT = {
                tag: 'int_msg_info',
                ihr_disabled: cs.loadBit() === 1,
                bounce: cs.loadBit() === 1,
                bounced: cs.loadBit() === 1,
                src: cs.loadAddress(),
                dest: cs.loadAddress(),
                value: cs.loadCoins()
            }

            // TODO: support with ExtraCurrencyCollection
            cs.skipBits(1)

            data.ihr_fee = cs.loadCoins()
            data.fwd_fee = cs.loadCoins()
            data.created_lt = cs.loadUint(64)
            data.created_at = cs.loadUint(32)

            return new CommonMsgInfo(data)
        }

        throw new Error('CommonMsgInfo: invalid tag')
    }

    public get data (): CommonMsgInfoT { return this._data }

    public get cell (): Cell { return this._cell }
}

export interface MessageOptions {
    info:   CommonMsgInfo;
    init?:  StateInit;
    body?:  Cell;
}

/**
 * ```
 *  message$_ {X:Type} info:CommonMsgInfo
 *      init:(Maybe (Either StateInit ^StateInit))
 *      body:(Either X ^X) = Message X;
 * ```
 */
export class Message implements BlockStruct {
    private _data: MessageOptions

    private _cell: Cell

    constructor (options: MessageOptions) {
        this._data = options

        const b = new Builder()

        b.storeSlice(this.data.info.cell.parse()) // info:CommonMsgInfo

        // init:(Maybe (Either StateInit ^StateInit))
        if (this._data.init) {
            b.storeBits([ 1, 0 ])
            b.storeSlice(this.data.init.cell.parse())
        } else {
            b.storeBit(0)
        }

        // body:(Either X ^X)
        if (this._data.body) {
            if (b.bits.length + this._data.body.bits.length + 1 <= 1023) {
                b.storeBit(0)
                b.storeSlice(this._data.body.parse())
            } else {
                b.storeBit(1)
                b.storeRef(this._data.body)
            }
        } else {
            b.storeBit(0)
        }

        this._cell = b.cell()
    }

    public static parse (cs: Slice): Message {
        const data = {} as MessageOptions

        data.info = CommonMsgInfo.parse(cs)

        if (cs.loadBit()) {
            const init = cs.loadBit() ? cs.loadRef().parse() : cs
            data.init = StateInit.parse(init)
        }

        if (cs.loadBit()) {
            data.body = cs.loadRef()
        } else {
            data.body = new Builder().storeSlice(cs).cell()
        }

        return new Message(data)
    }

    public get data (): MessageOptions { return this._data }

    public get cell (): Cell { return this._cell }
}

export namespace OutAction {
    export interface action_send_msg {
        tag:     'action_send_msg';
        mode:    number;
        out_msg: Message;
    }

    export interface action_set_code {
        tag:     'action_set_code';
        new_code: Cell; // new_code:^Cell
    }
}

export type OutActionT =
    OutAction.action_send_msg |
    OutAction.action_set_code

export class OutAction implements BlockStruct {
    private _data: OutActionT

    private _cell: Cell

    constructor (data: OutActionT) {
        switch (data.tag) {
            case 'action_send_msg': this.action_send_msg(data); break
            case 'action_set_code': this.action_set_code(data); break
            default: throw new Error('OutAction: unexpected tag')
        }
    }

    /**
     *  action_send_msg#0ec3c86d mode:(## 8)
     *      out_msg:^(MessageRelaxed Any) = OutAction;
     */
    private action_send_msg (data: OutAction.action_send_msg) {
        const b = new Builder()
            .storeUint(0x0ec3c86d, 32)
            .storeUint(data.mode, 8)
            .storeRef(data.out_msg.cell)

        this._data = data as OutActionT
        this._cell = b.cell()
    }

    /**
     *  action_set_code#ad4de08e new_code:^Cell = OutAction;
     */
    private action_set_code (data: OutAction.action_set_code) {
        const b = new Builder()
            .storeUint(0xad4de08e, 32)
            .storeRef(data.new_code)

        this._data = data as OutActionT
        this._cell = b.cell()
    }

    public static parse (cs: Slice): OutAction {
        const tag = cs.loadUint(32)
        let data = {} as OutActionT

        switch (tag) {
            case 0x0ec3c86d: /* action_send_msg */ {
                const mode = cs.loadUint(8)
                const outMsg = cs.loadRef().parse()
                data = { tag: 'action_send_msg', mode, out_msg: Message.parse(outMsg) }
                break
            }
            case 0xad4de08e: /* action_set_code */ {
                data = { tag: 'action_set_code', new_code: cs.loadRef() }
                break
            }
            default:
                throw new Error('OutAction: unexpected tag')
        }

        return new OutAction(data)
    }

    public get data (): OutActionT { return this._data }

    public get cell (): Cell { return this._cell }
}

export interface OutListOptions {
    action: OutAction[];
}

/**
```
out_list_empty$_ = OutList 0;
out_list$_ {n:#} prev:^(OutList n)
    action:OutAction = OutList (n + 1);
```
*/
export class OutList implements BlockStruct {
    private _data: OutListOptions

    private _cell: Cell

    constructor (options: OutListOptions) {
        this._data = options

        const actions = options.action
        let cur = new Builder().cell()

        for (const a of actions) {
            cur = new Builder()
                .storeRef(cur)
                .storeSlice(a.cell.parse())
                .cell()
        }

        this._cell = cur
    }

    public get data (): OutListOptions { return this._data }

    public get cell (): Cell { return this._cell }
}
