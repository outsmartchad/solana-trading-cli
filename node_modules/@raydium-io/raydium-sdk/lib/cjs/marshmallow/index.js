"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seq = exports.zeros = exports.union = exports.Union = exports.struct = exports.Structure = exports.array = exports.rustEnum = exports.str = exports.vecU8 = exports.tagged = exports.vec = exports.encodeBool = exports.decodeBool = exports.bool = exports.option = exports.OptionLayout = exports.publicKey = exports.WrappedLayout = exports.i128 = exports.i64 = exports.i8 = exports.u128 = exports.u64 = exports.u32 = exports.u8 = exports.WideBits = exports.BNLayout = exports.blob = void 0;
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = __importStar(require("bn.js"));
const buffer_layout_1 = require("./buffer-layout");
Object.defineProperty(exports, "blob", { enumerable: true, get: function () { return buffer_layout_1.blob; } });
__exportStar(require("./buffer-layout"), exports);
class BNLayout extends buffer_layout_1.Layout {
    constructor(span, signed, property) {
        //@ts-expect-error type wrong for super()'s type different from extends, but it desn't matter
        super(span, property);
        this.blob = (0, buffer_layout_1.blob)(span);
        this.signed = signed;
    }
    /** @override */
    decode(b, offset = 0) {
        const num = new bn_js_1.default(this.blob.decode(b, offset), 10, 'le');
        if (this.signed) {
            return num.fromTwos(this.span * 8).clone();
        }
        return num;
    }
    /** @override */
    encode(src, b, offset = 0) {
        if (typeof src === 'number')
            src = new bn_js_1.default(src); // src will pass a number accidently in union
        if (this.signed) {
            src = src.toTwos(this.span * 8);
        }
        return this.blob.encode(src.toArrayLike(Buffer, 'le', this.span), b, offset);
    }
}
exports.BNLayout = BNLayout;
class WideBits extends buffer_layout_1.Layout {
    // TODO: unknown
    constructor(property) {
        //@ts-expect-error type wrong for super()'s type different from extends , but it desn't matter
        super(8, property);
        this._lower = (0, buffer_layout_1.bits)((0, buffer_layout_1.u32)(), false);
        this._upper = (0, buffer_layout_1.bits)((0, buffer_layout_1.u32)(), false);
    }
    addBoolean(property) {
        if (this._lower.fields.length < 32) {
            this._lower.addBoolean(property);
        }
        else {
            this._upper.addBoolean(property);
        }
    }
    decode(b, offset = 0) {
        const lowerDecoded = this._lower.decode(b, offset);
        const upperDecoded = this._upper.decode(b, offset + this._lower.span);
        return Object.assign(Object.assign({}, lowerDecoded), upperDecoded);
    }
    encode(src /* TEMP */, b, offset = 0) {
        return this._lower.encode(src, b, offset) + this._upper.encode(src, b, offset + this._lower.span);
    }
}
exports.WideBits = WideBits;
function u8(property) {
    return new buffer_layout_1.UInt(1, property);
}
exports.u8 = u8;
function u32(property) {
    return new buffer_layout_1.UInt(4, property);
}
exports.u32 = u32;
function u64(property) {
    return new BNLayout(8, false, property);
}
exports.u64 = u64;
function u128(property) {
    return new BNLayout(16, false, property);
}
exports.u128 = u128;
function i8(property) {
    return new BNLayout(1, true, property);
}
exports.i8 = i8;
function i64(property) {
    return new BNLayout(8, true, property);
}
exports.i64 = i64;
function i128(property) {
    return new BNLayout(16, true, property);
}
exports.i128 = i128;
class WrappedLayout extends buffer_layout_1.Layout {
    constructor(layout, decoder, encoder, property) {
        //@ts-expect-error type wrong for super()'s type different from extends , but it desn't matter
        super(layout.span, property);
        this.layout = layout;
        this.decoder = decoder;
        this.encoder = encoder;
    }
    decode(b, offset) {
        return this.decoder(this.layout.decode(b, offset));
    }
    encode(src, b, offset) {
        return this.layout.encode(this.encoder(src), b, offset);
    }
    getSpan(b, offset) {
        return this.layout.getSpan(b, offset);
    }
}
exports.WrappedLayout = WrappedLayout;
function publicKey(property) {
    return new WrappedLayout((0, buffer_layout_1.blob)(32), (b) => new web3_js_1.PublicKey(b), (key) => key.toBuffer(), property);
}
exports.publicKey = publicKey;
class OptionLayout extends buffer_layout_1.Layout {
    constructor(layout, property) {
        //@ts-expect-error type wrong for super()'s type different from extends , but it desn't matter
        super(-1, property);
        this.layout = layout;
        this.discriminator = (0, buffer_layout_1.u8)();
    }
    encode(src, b, offset = 0) {
        if (src === null || src === undefined) {
            return this.discriminator.encode(0, b, offset);
        }
        this.discriminator.encode(1, b, offset);
        return this.layout.encode(src, b, offset + 1) + 1;
    }
    decode(b, offset = 0) {
        const discriminator = this.discriminator.decode(b, offset);
        if (discriminator === 0) {
            return null;
        }
        else if (discriminator === 1) {
            return this.layout.decode(b, offset + 1);
        }
        throw new Error('Invalid option ' + this.property);
    }
    getSpan(b, offset = 0) {
        const discriminator = this.discriminator.decode(b, offset);
        if (discriminator === 0) {
            return 1;
        }
        else if (discriminator === 1) {
            return this.layout.getSpan(b, offset + 1) + 1;
        }
        throw new Error('Invalid option ' + this.property);
    }
}
exports.OptionLayout = OptionLayout;
function option(layout, property) {
    return new OptionLayout(layout, property);
}
exports.option = option;
function bool(property) {
    return new WrappedLayout((0, buffer_layout_1.u8)(), decodeBool, encodeBool, property);
}
exports.bool = bool;
function decodeBool(value) {
    if (value === 0) {
        return false;
    }
    else if (value === 1) {
        return true;
    }
    throw new Error('Invalid bool: ' + value);
}
exports.decodeBool = decodeBool;
function encodeBool(value) {
    return value ? 1 : 0;
}
exports.encodeBool = encodeBool;
function vec(elementLayout, property) {
    const length = (0, buffer_layout_1.u32)('length');
    const layout = struct([
        length,
        seq(elementLayout, (0, buffer_layout_1.offset)(length, -length.span), 'values'),
    ]); // Something I don't know
    return new WrappedLayout(layout, ({ values }) => values, (values) => ({ values }), property);
}
exports.vec = vec;
function tagged(tag, layout, property) {
    const wrappedLayout = struct([u64('tag'), layout.replicate('data')]); // Something I don't know
    function decodeTag({ tag: receivedTag, data }) {
        if (!receivedTag.eq(tag)) {
            throw new Error('Invalid tag, expected: ' + tag.toString('hex') + ', got: ' + receivedTag.toString('hex'));
        }
        return data;
    }
    return new WrappedLayout(wrappedLayout, decodeTag, (data) => ({ tag, data }), property);
}
exports.tagged = tagged;
function vecU8(property) {
    const length = (0, buffer_layout_1.u32)('length');
    const layout = struct([length, (0, buffer_layout_1.blob)((0, buffer_layout_1.offset)(length, -length.span), 'data')]); // Something I don't know
    return new WrappedLayout(layout, ({ data }) => data, (data) => ({ data }), property);
}
exports.vecU8 = vecU8;
function str(property) {
    return new WrappedLayout(vecU8(), (data) => data.toString('utf-8'), (s) => Buffer.from(s, 'utf-8'), property);
}
exports.str = str;
function rustEnum(variants, property) {
    const unionLayout = (0, buffer_layout_1.union)((0, buffer_layout_1.u8)(), property);
    variants.forEach((variant, index) => unionLayout.addVariant(index, variant, variant.property));
    return unionLayout; // ?why use UnionLayout? This must be a fault
}
exports.rustEnum = rustEnum;
function array(elementLayout, length, property) {
    const layout = struct([seq(elementLayout, length, 'values')]); // Something I don't know
    return new WrappedLayout(layout, ({ values }) => values, (values) => ({ values }), property);
}
exports.array = array;
class Structure extends buffer_layout_1.Structure {
    /** @override */
    decode(b, offset) {
        return super.decode(b, offset);
    }
}
exports.Structure = Structure;
function struct(fields, property, decodePrefixes) {
    //@ts-expect-error this type is not quite satisfied the define, but, never no need to worry about.
    return new Structure(fields, property, decodePrefixes);
}
exports.struct = struct;
class Union extends buffer_layout_1.Union {
    encodeInstruction(instruction) {
        const instructionMaxSpan = Math.max(...Object.values(this.registry).map((r) => r.span));
        const b = Buffer.alloc(instructionMaxSpan);
        return b.slice(0, this.encode(instruction, b));
    }
    decodeInstruction(instruction) {
        return this.decode(instruction);
    }
}
exports.Union = Union;
function union(discr, defaultLayout, property) {
    return new Union(discr, defaultLayout, property);
}
exports.union = union;
class Zeros extends buffer_layout_1.Blob {
    decode(b, offset) {
        const slice = super.decode(b, offset);
        if (!slice.every((v) => v === 0)) {
            throw new Error('nonzero padding bytes');
        }
        return slice;
    }
}
function zeros(length) {
    return new Zeros(length);
}
exports.zeros = zeros;
function seq(elementLayout, count, property) {
    let parsedCount;
    const superCount = typeof count === 'number'
        ? count
        : (0, bn_js_1.isBN)(count)
            ? count.toNumber()
            : new Proxy(count /* pretend to be Layout<number> */, {
                get(target, property) {
                    if (!parsedCount) {
                        // get count in targetLayout. note that count may be BN
                        const countProperty = Reflect.get(target, 'count');
                        // let targetLayout's  property:count be a number
                        parsedCount = (0, bn_js_1.isBN)(countProperty) ? countProperty.toNumber() : countProperty;
                        // record the count
                        Reflect.set(target, 'count', parsedCount);
                    }
                    return Reflect.get(target, property);
                },
                set(target, property, value) {
                    if (property === 'count') {
                        parsedCount = value;
                    }
                    return Reflect.set(target, property, value);
                },
            });
    // @ts-expect-error force type
    return (0, buffer_layout_1.seq)(elementLayout, superCount, property);
}
exports.seq = seq;
//# sourceMappingURL=index.js.map