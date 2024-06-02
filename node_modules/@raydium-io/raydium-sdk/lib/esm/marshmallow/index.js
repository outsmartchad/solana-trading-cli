import { PublicKey } from '@solana/web3.js';
import BN, { isBN } from 'bn.js';
import { Blob, Layout, UInt, Structure as _Structure, Union as _Union, offset as _offset, seq as _seq, u32 as _u32, u8 as _u8, union as _union, bits, blob, } from './buffer-layout';
export * from './buffer-layout';
export { blob };
export class BNLayout extends Layout {
    constructor(span, signed, property) {
        //@ts-expect-error type wrong for super()'s type different from extends, but it desn't matter
        super(span, property);
        this.blob = blob(span);
        this.signed = signed;
    }
    /** @override */
    decode(b, offset = 0) {
        const num = new BN(this.blob.decode(b, offset), 10, 'le');
        if (this.signed) {
            return num.fromTwos(this.span * 8).clone();
        }
        return num;
    }
    /** @override */
    encode(src, b, offset = 0) {
        if (typeof src === 'number')
            src = new BN(src); // src will pass a number accidently in union
        if (this.signed) {
            src = src.toTwos(this.span * 8);
        }
        return this.blob.encode(src.toArrayLike(Buffer, 'le', this.span), b, offset);
    }
}
export class WideBits extends Layout {
    // TODO: unknown
    constructor(property) {
        //@ts-expect-error type wrong for super()'s type different from extends , but it desn't matter
        super(8, property);
        this._lower = bits(_u32(), false);
        this._upper = bits(_u32(), false);
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
        return { ...lowerDecoded, ...upperDecoded };
    }
    encode(src /* TEMP */, b, offset = 0) {
        return this._lower.encode(src, b, offset) + this._upper.encode(src, b, offset + this._lower.span);
    }
}
export function u8(property) {
    return new UInt(1, property);
}
export function u32(property) {
    return new UInt(4, property);
}
export function u64(property) {
    return new BNLayout(8, false, property);
}
export function u128(property) {
    return new BNLayout(16, false, property);
}
export function i8(property) {
    return new BNLayout(1, true, property);
}
export function i64(property) {
    return new BNLayout(8, true, property);
}
export function i128(property) {
    return new BNLayout(16, true, property);
}
export class WrappedLayout extends Layout {
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
export function publicKey(property) {
    return new WrappedLayout(blob(32), (b) => new PublicKey(b), (key) => key.toBuffer(), property);
}
export class OptionLayout extends Layout {
    constructor(layout, property) {
        //@ts-expect-error type wrong for super()'s type different from extends , but it desn't matter
        super(-1, property);
        this.layout = layout;
        this.discriminator = _u8();
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
export function option(layout, property) {
    return new OptionLayout(layout, property);
}
export function bool(property) {
    return new WrappedLayout(_u8(), decodeBool, encodeBool, property);
}
export function decodeBool(value) {
    if (value === 0) {
        return false;
    }
    else if (value === 1) {
        return true;
    }
    throw new Error('Invalid bool: ' + value);
}
export function encodeBool(value) {
    return value ? 1 : 0;
}
export function vec(elementLayout, property) {
    const length = _u32('length');
    const layout = struct([
        length,
        seq(elementLayout, _offset(length, -length.span), 'values'),
    ]); // Something I don't know
    return new WrappedLayout(layout, ({ values }) => values, (values) => ({ values }), property);
}
export function tagged(tag, layout, property) {
    const wrappedLayout = struct([u64('tag'), layout.replicate('data')]); // Something I don't know
    function decodeTag({ tag: receivedTag, data }) {
        if (!receivedTag.eq(tag)) {
            throw new Error('Invalid tag, expected: ' + tag.toString('hex') + ', got: ' + receivedTag.toString('hex'));
        }
        return data;
    }
    return new WrappedLayout(wrappedLayout, decodeTag, (data) => ({ tag, data }), property);
}
export function vecU8(property) {
    const length = _u32('length');
    const layout = struct([length, blob(_offset(length, -length.span), 'data')]); // Something I don't know
    return new WrappedLayout(layout, ({ data }) => data, (data) => ({ data }), property);
}
export function str(property) {
    return new WrappedLayout(vecU8(), (data) => data.toString('utf-8'), (s) => Buffer.from(s, 'utf-8'), property);
}
export function rustEnum(variants, property) {
    const unionLayout = _union(_u8(), property);
    variants.forEach((variant, index) => unionLayout.addVariant(index, variant, variant.property));
    return unionLayout; // ?why use UnionLayout? This must be a fault
}
export function array(elementLayout, length, property) {
    const layout = struct([seq(elementLayout, length, 'values')]); // Something I don't know
    return new WrappedLayout(layout, ({ values }) => values, (values) => ({ values }), property);
}
export class Structure extends _Structure {
    /** @override */
    decode(b, offset) {
        return super.decode(b, offset);
    }
}
export function struct(fields, property, decodePrefixes) {
    //@ts-expect-error this type is not quite satisfied the define, but, never no need to worry about.
    return new Structure(fields, property, decodePrefixes);
}
export class Union extends _Union {
    encodeInstruction(instruction) {
        const instructionMaxSpan = Math.max(...Object.values(this.registry).map((r) => r.span));
        const b = Buffer.alloc(instructionMaxSpan);
        return b.slice(0, this.encode(instruction, b));
    }
    decodeInstruction(instruction) {
        return this.decode(instruction);
    }
}
export function union(discr, defaultLayout, property) {
    return new Union(discr, defaultLayout, property);
}
class Zeros extends Blob {
    decode(b, offset) {
        const slice = super.decode(b, offset);
        if (!slice.every((v) => v === 0)) {
            throw new Error('nonzero padding bytes');
        }
        return slice;
    }
}
export function zeros(length) {
    return new Zeros(length);
}
export function seq(elementLayout, count, property) {
    let parsedCount;
    const superCount = typeof count === 'number'
        ? count
        : isBN(count)
            ? count.toNumber()
            : new Proxy(count /* pretend to be Layout<number> */, {
                get(target, property) {
                    if (!parsedCount) {
                        // get count in targetLayout. note that count may be BN
                        const countProperty = Reflect.get(target, 'count');
                        // let targetLayout's  property:count be a number
                        parsedCount = isBN(countProperty) ? countProperty.toNumber() : countProperty;
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
    return _seq(elementLayout, superCount, property);
}
//# sourceMappingURL=index.js.map