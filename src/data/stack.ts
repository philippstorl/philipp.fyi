export interface StackItem {
    name: string
    role: string
}

export const stack: StackItem[] = [
    {
        name: 'Astro',
        role: 'Mostly static HTML, with React only where a page actually needs interactivity',
    },
    {
        name: 'Tailwind CSS v4',
        role: 'CSS-first config: theme tokens live in global.css, no config file',
    },
    {
        name: 'React',
        role: 'Two islands total: the contact form and the theme toggle',
    },
    {
        name: 'TypeScript',
        role: 'Strict mode throughout',
    },
    {
        name: 'Netlify',
        role: 'Deploys with a locked-down CSP',
    },
]
