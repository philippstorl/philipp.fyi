export async function postToSlack(
    webhookUrl: string,
    text: string,
    errorContext: string,
): Promise<void> {
    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ text }),
        })
    } catch (error) {
        console.error(errorContext, error)
    }
}
