import { expect, test } from '@playwright/test'
import { verifyNetlifySignature } from '../../netlify/functions/_shared/verify-netlify-signature'
import { signNetlifyWebhook } from './helpers'

const SECRET = 'test-webhook-secret'
const BODY = JSON.stringify({ state: 'ready', branch: 'main' })

test('accepts a valid signature over the exact body', () => {
    expect(
        verifyNetlifySignature(BODY, signNetlifyWebhook(BODY, SECRET), SECRET),
    ).toBe(true)
})

test('rejects a signature made with a different secret', () => {
    expect(
        verifyNetlifySignature(
            BODY,
            signNetlifyWebhook(BODY, 'wrong-secret'),
            SECRET,
        ),
    ).toBe(false)
})

test('rejects a valid signature attached to a tampered body', () => {
    const signature = signNetlifyWebhook(BODY, SECRET)
    const tampered = BODY.replace('main', 'evil')
    expect(verifyNetlifySignature(tampered, signature, SECRET)).toBe(false)
})

test('rejects a missing, stripped or malformed signature header', () => {
    const [header, payload] = signNetlifyWebhook(BODY, SECRET).split('.')
    for (const value of [
        null,
        '',
        `${header}.${payload}`,
        `${header}.${payload}.`,
        'not-a-jwt',
        'a.b.c',
    ]) {
        expect(verifyNetlifySignature(BODY, value, SECRET), String(value)).toBe(
            false,
        )
    }
})

test('rejects a correctly signed token with the wrong alg or issuer', () => {
    expect(
        verifyNetlifySignature(
            BODY,
            signNetlifyWebhook(BODY, SECRET, { header: { alg: 'none' } }),
            SECRET,
        ),
    ).toBe(false)
    expect(
        verifyNetlifySignature(
            BODY,
            signNetlifyWebhook(BODY, SECRET, { payload: { iss: 'attacker' } }),
            SECRET,
        ),
    ).toBe(false)
})

test('rejects a correctly signed token with a missing or wrong-length digest', () => {
    expect(
        verifyNetlifySignature(
            BODY,
            signNetlifyWebhook(BODY, SECRET, {
                payload: { sha256: undefined },
            }),
            SECRET,
        ),
    ).toBe(false)
    expect(
        verifyNetlifySignature(
            BODY,
            signNetlifyWebhook(BODY, SECRET, { payload: { sha256: 'abcd' } }),
            SECRET,
        ),
    ).toBe(false)
})

test('rejects a truncated signature without throwing', () => {
    const [header, payload] = signNetlifyWebhook(BODY, SECRET).split('.')
    // Wrong length would make timingSafeEqual throw (a 500) without the length guard.
    expect(
        verifyNetlifySignature(BODY, `${header}.${payload}.AAAA`, SECRET),
    ).toBe(false)
})
