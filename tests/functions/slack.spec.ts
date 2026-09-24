import { expect, test } from '@playwright/test'
import {
    postToSlack,
    sanitizeSlackText,
    truncateForSlack,
} from '../../netlify/functions/_shared/slack'
import { SLACK_WEBHOOK, quietConsole, stubFetch } from './helpers'

test('sanitizeSlackText escapes mrkdwn control characters and backticks', () => {
    expect(sanitizeSlackText('<!here> & `code` <a|b>')).toBe(
        '&lt;!here&gt; &amp; ˋcodeˋ &lt;a|b&gt;',
    )
})

test('truncateForSlack cuts by code point, never inside a surrogate pair', () => {
    expect(truncateForSlack('😀😀😀', 2, '…')).toBe('😀😀…')
    expect(truncateForSlack('😀😀', 2, '…')).toBe('😀😀')
})

test('truncateForSlack truncates before escaping, so no entity is cut in half', () => {
    expect(truncateForSlack('ab&cd', 3, '…')).toBe('ab&amp;…')
})

test('postToSlack posts {text} and never throws on Slack or network failure', async () => {
    const logs = quietConsole()
    const fetchStub = stubFetch()
    try {
        await postToSlack(SLACK_WEBHOOK, 'hello', 'ctx')
        expect(fetchStub.slackTexts()).toEqual(['hello'])

        globalThis.fetch = async () => new Response('no', { status: 404 })
        await postToSlack(SLACK_WEBHOOK, 'hello', 'ctx')
        globalThis.fetch = async () => {
            throw new Error('offline')
        }
        await postToSlack(SLACK_WEBHOOK, 'hello', 'ctx')
        expect(logs.errors).toHaveLength(2)
    } finally {
        fetchStub.restore()
        logs.restore()
    }
})
