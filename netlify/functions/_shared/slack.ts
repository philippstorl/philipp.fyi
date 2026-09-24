// Fields here may be attacker-controlled — escape Slack mrkdwn (&, <, >) against
// injection and neutralize backticks so a value can't break a code fence.
export function sanitizeSlackText(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/`/g, 'ˋ')
}

// Truncates by code point, not `.slice()` (can split a surrogate pair), and
// before sanitizing (can't cut mid-entity, e.g. inside `&amp;`). Stops after
// maxLength code points, so cost doesn't scale with an attacker-sized input.
export function truncateForSlack(
    text: string,
    maxLength: number,
    marker: string,
): string {
    // UTF-16 length is never below the code-point count.
    if (text.length <= maxLength) return sanitizeSlackText(text)
    let truncated = ''
    let count = 0
    for (const char of text) {
        if (count === maxLength) return sanitizeSlackText(truncated) + marker
        truncated += char
        count++
    }
    return sanitizeSlackText(text)
}

export async function postToSlack(
    webhookUrl: string,
    text: string,
    errorContext: string,
): Promise<void> {
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ text }),
        })
        if (!response.ok) {
            console.error(
                errorContext,
                `Slack responded with ${response.status} ${response.statusText}`,
            )
        }
    } catch (error) {
        console.error(errorContext, error)
    }
}
