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
// before sanitizing (can't cut mid-entity, e.g. inside `&amp;`).
export function truncateForSlack(
    text: string,
    maxLength: number,
    marker: string,
): string {
    const codePoints = Array.from(text)
    if (codePoints.length <= maxLength) return sanitizeSlackText(text)
    return sanitizeSlackText(codePoints.slice(0, maxLength).join('')) + marker
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
