const borsh = require('../../lib/index');
const BN = require('bn.js');

class Assignable {
    constructor(properties) {
        Object.keys(properties).map((key) => {
            this[key] = properties[key];
        });
    }
}

class Test extends Assignable { }

class Serializable {
    constructor(data) {
        this.data = data;
    }

    static borshDeserialize(reader) {
        return new Serializable(reader.readU8());
    }

    borshSerialize(writer) {
        writer.writeU8(this.data);
    }
}

test('serialize object', async () => {
    const value = new Test({ x: 255, y: 20, z: '123', q: [1, 2, 3] });
    const schema = new Map([[Test, { kind: 'struct', fields: [['x', 'u8'], ['y', 'u64'], ['z', 'string'], ['q', [3]]] }]]);
    const buf = borsh.serialize(schema, value);
    const newValue = borsh.deserialize(schema, Test, buf);
    expect(newValue.x).toEqual(255);
    expect(newValue.y.toString()).toEqual('20');
    expect(newValue.z).toEqual('123');
    expect(newValue.q).toEqual(new Uint8Array([1, 2, 3]));
});

test('serialize optional field', async () => {
    const schema = new Map([[Test, { kind: 'struct', fields: [['x', { kind: 'option', type: 'string' }]]}]]);

    let buf = borsh.serialize(schema, new Test({ x: '123', }));
    let newValue = borsh.deserialize(schema, Test, buf);
    expect(newValue.x).toEqual('123');

    buf = borsh.serialize(schema, new Test({ }));
    newValue = borsh.deserialize(schema, Test, buf);
    expect(newValue.x).toEqual(undefined);
});

test('serialize max uint', async () => {
    const u64MaxHex = 'ffffffffffffffff';
    const value = new Test({
        x: 255,
        y: 65535,
        z: 4294967295,
        q: new BN(u64MaxHex, 16),
        r: new BN(u64MaxHex.repeat(2), 16),
        s: new BN(u64MaxHex.repeat(4), 16),
        t: new BN(u64MaxHex.repeat(8), 16)
    });
    const schema = new Map([[Test, {
        kind: 'struct',
        fields: [
            ['x', 'u8'],
            ['y', 'u16'],
            ['z', 'u32'],
            ['q', 'u64'],
            ['r', 'u128'],
            ['s', 'u256'],
            ['t', 'u512']
        ]
    }]]);
    const buf = borsh.serialize(schema, value);
    const newValue = borsh.deserialize(schema, Test, buf);
    expect(newValue.x).toEqual(255);
    expect(newValue.y).toEqual(65535);
    expect(newValue.z).toEqual(4294967295);
    expect(newValue.q.toString()).toEqual('18446744073709551615');
    expect(newValue.r.toString()).toEqual('340282366920938463463374607431768211455');
    expect(newValue.s.toString()).toEqual('115792089237316195423570985008687907853269984665640564039457584007913129639935');
    expect(newValue.t.toString()).toEqual('13407807929942597099574024998205846127479365820592393377723561443721764030073546976801874298166903427690031858186486050853753882811946569946433649006084095');
});

test('serialize/deserialize with class methods', () => {
    const item = new Serializable(10);

    const buf = borsh.serialize(null, item);
    const newValue = borsh.deserialize(null, Serializable, buf);

    expect(newValue).toEqual(item);
});

test('serialize/deserialize fixed array', () => {
    const value = new Test({
        a: ['hello', 'world']
    });
    const schema = new Map([[Test, {
        kind: 'struct',
        fields: [
            ['a', ['string', 2]]
        ]
    }]]);

    const buf = borsh.serialize(schema, value);
    const deserializedValue = borsh.deserialize(schema, Test, buf);

    expect(buf).toEqual(Buffer.from([5, 0, 0, 0, 104, 101, 108, 108, 111, 5, 0, 0, 0, 119, 111, 114, 108, 100]));
    expect(deserializedValue.a).toEqual(['hello', 'world']);
});

test('errors serializing fixed array of wrong size', () => {
    const value = new Test({
        a: ['hello', 'world', 'you']
    });
    const schema = new Map([[Test, {
        kind: 'struct',
        fields: [
            ['a', ['string', 2]]
        ]
    }]]);

    expect(() => borsh.serialize(schema, value)).toThrow('Expecting byte array of length 2, but got 3 bytes');
});

test('errors serializing fixed array of wrong type', () => {
    const value = new Test({
        a: [244, 34]
    });
    const schema = new Map([[Test, {
        kind: 'struct',
        fields: [
            ['a', ['string', 2]]
        ]
    }]]);

    expect(() => borsh.serialize(schema, value)).toThrow('The first argument must be of type string');
});

test('baseEncode string test', async () => {
    const encodedValue = borsh.baseEncode('244ZQ9cgj3CQ6bWBdytfrJMuMQ1jdXLFGnr4HhvtCTnM');
    const expectedValue = 'HKk9gqNj4xb4rLdJuzT5zzJbLa4vHBdYCxQT9H99csQh6nz3Hfpqn4jtWA92';
    expect(encodedValue).toEqual(expectedValue);
});

test('baseEncode array test', async () => {
    expect(borsh.baseEncode([1, 2, 3, 4, 5])).toEqual('7bWpTW');
});

test('baseDecode test', async () => {
    const value = 'HKk9gqNj4xb4rLdJu';
    const expectedDecodedArray = [3, 96, 254, 84, 10, 240, 93, 199, 52, 244, 164, 240, 6];
    const expectedBuffer = Buffer.from(expectedDecodedArray);
    expect(borsh.baseDecode(value)).toEqual(expectedBuffer);
});

test('base encode and decode test', async () => {
    const value = '244ZQ9cgj3CQ6bWBdytfrJMuMQ1jdXLFGnr4HhvtCTnM';
    expect(borsh.baseEncode(borsh.baseDecode(value))).toEqual(value);
});

test('serialize with custom writer/reader', async () => {
    class ExtendedWriter extends borsh.BinaryWriter {
        writeDate(value) {
            this.writeU64(value.getTime());
        }
    }

    class ExtendedReader extends borsh.BinaryReader {
        readDate() {
            const value = this.readU64();
            return new Date(value.toNumber());
        }
    }

    const time = 'Aug 12, 2021 12:00:00 UTC+00:00';
    const value = new Test({ x: new Date(time) });
    const schema = new Map([[Test, {kind: 'struct', fields: [['x', 'date']]}]]);

    const buf = borsh.serialize(schema, value, ExtendedWriter);
    const newValue = borsh.deserialize(schema, Test, buf, ExtendedReader);
    expect(newValue.x).toEqual(new Date(time));
});
