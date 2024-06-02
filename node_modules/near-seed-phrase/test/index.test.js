const assert = require('assert');
const nacl = require('tweetnacl');
const {
    generateSeedPhrase,
    normalizeSeedPhrase,
    parseSeedPhrase,
    findSeedPhraseKey
} = require('../');

describe('seed phrase', () => {
    it('generate', () => {
        const { seedPhrase, secretKey, publicKey } = generateSeedPhrase();
        assert.ok(seedPhrase);
        assert.ok(secretKey);
        assert.ok(publicKey);
    });

    it('generate with entropy', () => {
        const entropy = Buffer.from(nacl.hash(Buffer.from('The quick brown fox jumps over the lazy dog', 'utf8'))).toString('hex')
        const { seedPhrase, secretKey } = generateSeedPhrase(entropy.substr(0, 32));
        const { secretKey: secretKey2 } = parseSeedPhrase(seedPhrase);
        assert.strictEqual(secretKey, secretKey2);
    });

    it('normalize', () => {
        assert.equal(normalizeSeedPhrase(' Almost a Seed    Phrase'), 'almost a seed phrase');
    });

    it('parse seed phrase', () => {
        const { secretKey, publicKey } = parseSeedPhrase('Shoot island position soft burden budget tooth cruel issue economy destroy Above')

        assert.equal(secretKey, 'ed25519:3jFpZEcbhcjpqVE27zU3d7WHcS7Wq716v5WryU8Tj4EaNTHTj8iAhtPW7KCdFV2fnjNf9toawUbdqZnhrRtLKe6w');
        assert.equal(publicKey, 'ed25519:r4yuiZE45mzeZAENDEF2pWeFBJkW8mQYGx3rU46zCqh');
    });

    it('find matching public key', () => {
        const { seedPhrase, secretKey, publicKey } = generateSeedPhrase();

        const keyInfo = findSeedPhraseKey(seedPhrase, ["whatever", publicKey, "something"]);
        assert.deepStrictEqual(keyInfo, { seedPhrase, secretKey, publicKey });
    });

    it('find matching public key (not found)', () => {
        const { seedPhrase } = generateSeedPhrase();

        const keyInfo = findSeedPhraseKey(seedPhrase, ["whatever", "something"]);
        assert.deepStrictEqual(keyInfo, {});
    });
});