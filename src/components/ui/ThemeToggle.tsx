import { useState, useEffect } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

type Theme = 'light' | 'dark' | 'system'

// Mirrors the synchronous DOM patch in Header.astro's inline script, which
// runs before this island hydrates and corrects the same buttons' aria-pressed/
// class attributes from the same localStorage read. Computing the identical
// value here means hydration's client render matches what's already in the
// DOM, so React never sees (or needs to repaint past) a mismatch.
function getStoredTheme(): Theme {
    if (typeof window === 'undefined') return 'system'
    try {
        const stored = localStorage.getItem('theme')
        return stored === 'light' || stored === 'dark' ? stored : 'system'
    } catch {
        return 'system'
    }
}

function applyTheme(theme: Theme) {
    const html = document.documentElement
    if (theme === 'dark') {
        html.classList.add('dark')
    } else if (theme === 'light') {
        html.classList.remove('dark')
    } else {
        html.classList.toggle(
            'dark',
            window.matchMedia('(prefers-color-scheme: dark)').matches,
        )
    }
}

export default function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>(getStoredTheme)

    useEffect(() => {
        if (theme !== 'system') return
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        const handler = (e: MediaQueryListEvent) => {
            document.documentElement.classList.toggle('dark', e.matches)
        }
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [theme])

    const select = (next: Theme) => {
        if (next === 'system') {
            localStorage.removeItem('theme')
        } else {
            localStorage.setItem('theme', next)
        }
        applyTheme(next)
        setTheme(next)
    }

    const options: { value: Theme; Icon: typeof Sun; label: string }[] = [
        { value: 'light', Icon: Sun, label: 'Light mode' },
        { value: 'system', Icon: Monitor, label: 'System preference' },
        { value: 'dark', Icon: Moon, label: 'Dark mode' },
    ]

    return (
        <div
            role="group"
            aria-label="Color theme"
            className="flex items-center gap-1 rounded-lg border border-border bg-card p-[3px]"
        >
            {options.map(({ value, Icon, label }) => (
                <button
                    key={value}
                    data-theme-value={value}
                    onClick={() => select(value)}
                    aria-label={label}
                    aria-pressed={theme === value}
                    title={label}
                    className={[
                        'flex size-11 items-center justify-center rounded-md transition-colors duration-150',
                        theme === value
                            ? 'bg-accent/10 text-accent'
                            : 'text-muted hover:bg-foreground/5 hover:text-foreground',
                    ].join(' ')}
                >
                    <Icon size={16} strokeWidth={1.75} />
                </button>
            ))}
        </div>
    )
}
