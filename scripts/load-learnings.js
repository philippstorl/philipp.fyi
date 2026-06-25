import fs from 'fs'

const path = 'LEARNINGS.md'

if (fs.existsSync(path)) {
    const content = fs.readFileSync(path, 'utf8').trim()
    if (content) {
        console.log(
            JSON.stringify({
                hookSpecificOutput: {
                    hookEventName: 'SessionStart',
                    additionalContext: `From LEARNINGS.md:\n\n${content}`,
                },
            }),
        )
    }
}
