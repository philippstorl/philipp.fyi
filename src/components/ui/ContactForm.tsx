import { useState, useRef } from 'react'

type FormStatus = 'idle' | 'submitting' | 'success' | 'error'

interface FieldErrors {
    name?: string
    email?: string
    message?: string
}

function validate(data: FormData): FieldErrors {
    const errors: FieldErrors = {}
    const name = (data.get('name') as string | null)?.trim() ?? ''
    const email = (data.get('email') as string | null)?.trim() ?? ''
    const message = (data.get('message') as string | null)?.trim() ?? ''

    if (!name) errors.name = 'Name is required.'
    if (!email) {
        errors.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = 'Please enter a valid email address.'
    }
    if (!message) errors.message = 'Message is required.'

    return errors
}

export default function ContactForm() {
    const formRef = useRef<HTMLFormElement>(null)
    const [status, setStatus] = useState<FormStatus>('idle')
    const [errors, setErrors] = useState<FieldErrors>({})

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form = e.currentTarget
        const data = new FormData(form)

        // Client-side validation
        const fieldErrors = validate(data)
        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors)
            return
        }

        setErrors({})
        setStatus('submitting')

        try {
            const res = await fetch('/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(
                    data as unknown as Record<string, string>,
                ).toString(),
            })
            if (res.ok) {
                setStatus('success')
                form.reset()
            } else {
                setStatus('error')
            }
        } catch {
            setStatus('error')
        }
    }

    if (status === 'success') {
        return (
            <div className="rounded-xl border border-border bg-card p-8 md:p-10">
                <p
                    className="mb-2 font-display text-xl text-foreground"
                    style={{ fontVariationSettings: "'opsz' 24" }}
                >
                    Message sent.
                </p>
                <p className="text-sm text-muted">
                    Thank you for reaching out — I'll get back to you soon.
                </p>
            </div>
        )
    }

    const inputBase =
        'w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/50 transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent'
    const labelBase = 'mb-1.5 block text-xs font-medium text-muted'
    const errorBase = 'mt-1.5 text-xs text-red-500 dark:text-red-400'

    return (
        <form
            ref={formRef}
            onSubmit={handleSubmit}
            name="contact"
            method="POST"
            data-netlify="true"
            data-netlify-honeypot="bot-field"
            noValidate
            className="rounded-xl border border-border bg-card p-6 md:p-8"
        >
            {/* Required hidden fields for Netlify Forms */}
            <input type="hidden" name="form-name" value="contact" />
            <div hidden aria-hidden="true">
                <input name="bot-field" tabIndex={-1} autoComplete="off" />
            </div>

            <div className="space-y-5">
                {/* Name */}
                <div>
                    <label htmlFor="contact-name" className={labelBase}>
                        Name
                    </label>
                    <input
                        id="contact-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        aria-describedby={
                            errors.name ? 'contact-name-error' : undefined
                        }
                        aria-invalid={!!errors.name}
                        className={inputBase}
                        placeholder="Your name"
                    />
                    {errors.name && (
                        <p
                            id="contact-name-error"
                            role="alert"
                            className={errorBase}
                        >
                            {errors.name}
                        </p>
                    )}
                </div>

                {/* Email */}
                <div>
                    <label htmlFor="contact-email" className={labelBase}>
                        Email
                    </label>
                    <input
                        id="contact-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        aria-describedby={
                            errors.email ? 'contact-email-error' : undefined
                        }
                        aria-invalid={!!errors.email}
                        className={inputBase}
                        placeholder="your@email.com"
                    />
                    {errors.email && (
                        <p
                            id="contact-email-error"
                            role="alert"
                            className={errorBase}
                        >
                            {errors.email}
                        </p>
                    )}
                </div>

                {/* Message */}
                <div>
                    <label htmlFor="contact-message" className={labelBase}>
                        Message
                    </label>
                    <textarea
                        id="contact-message"
                        name="message"
                        rows={5}
                        aria-describedby={
                            errors.message ? 'contact-message-error' : undefined
                        }
                        aria-invalid={!!errors.message}
                        className={`${inputBase} resize-none`}
                        placeholder="What's on your mind?"
                    />
                    {errors.message && (
                        <p
                            id="contact-message-error"
                            role="alert"
                            className={errorBase}
                        >
                            {errors.message}
                        </p>
                    )}
                </div>

                {/* Error banner */}
                {status === 'error' && (
                    <p
                        role="alert"
                        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
                    >
                        Something went wrong. Please try again or reach out on
                        LinkedIn.
                    </p>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="inline-flex w-full items-center justify-center rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity duration-150 hover:opacity-80 disabled:opacity-50"
                >
                    {status === 'submitting' ? 'Sending…' : 'Send message'}
                </button>
            </div>
        </form>
    )
}
