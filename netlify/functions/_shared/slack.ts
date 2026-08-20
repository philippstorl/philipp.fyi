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
