import { useState, useRef, useEffect } from 'react'

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
    const nameInputRef = useRef<HTMLInputElement>(null)
    const emailInputRef = useRef<HTMLInputElement>(null)
    const messageInputRef = useRef<HTMLTextAreaElement>(null)
    const successRef = useRef<HTMLDivElement>(null)
    const [status, setStatus] = useState<FormStatus>('idle')
    const [errors, setErrors] = useState<FieldErrors>({})
    // Bumped on every failed submit attempt and used as the summary alert's
    // React key, so it remounts (and gets re-announced) even when a second
    // failed attempt happens to produce the same error count/text as the
    // first — a same-text update alone wouldn't trigger a DOM mutation for
    // React to re-announce.
    const [submitAttempt, setSubmitAttempt] = useState(0)
    const errorCount = Object.keys(errors).length

    useEffect(() => {
        if (status === 'success') successRef.current?.focus()
    }, [status])

    // Deferred to an effect (rather than called inline in handleSubmit) so
    // it runs after React commits aria-invalid/aria-describedby for the
    // newly-erroring field, not before — focusing synchronously during the
    // submit handler would move focus a render early, while the DOM still
    // reflects the previous (valid) state.
    useEffect(() => {
        if (errors.name) nameInputRef.current?.focus()
        else if (errors.email) emailInputRef.current?.focus()
        else if (errors.message) messageInputRef.current?.focus()
    }, [errors])

    // Clears a field's stale error as soon as the user corrects it, rather
    // than leaving it visible until the next full submit-and-revalidate.
    // Doesn't re-run validate() on every keystroke — just drops the error
    // once the field is no longer empty, which is enough to stop the form
    // from reading as "still broken" after the user has fixed it.
    const handleFieldChange =
        (field: keyof FieldErrors) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            if (!errors[field] || !e.target.value.trim()) return
            setErrors((prev) => {
                const next = { ...prev }
                delete next[field]
                return next
            })
        }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (status === 'submitting') return
        const form = e.currentTarget
        const data = new FormData(form)

        const fieldErrors = validate(data)
        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors)
            setSubmitAttempt((n) => n + 1)
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
                    Array.from(data.entries(), ([key, value]) => [
                        key,
                        String(value),
                    ]),
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
            <div
                ref={successRef}
                role="status"
                tabIndex={-1}
                className="rounded-xl border border-border bg-card p-8 md:p-10"
            >
                <p className="mb-2 font-display text-xl text-foreground">
                    Message sent.
                </p>
                <p className="text-sm text-muted">
                    Thank you for reaching out. I'll get back to you soon.
                </p>
            </div>
        )
    }

    const inputBase =
        'w-full rounded-lg border border-border-strong bg-background px-4 py-3 text-base text-foreground placeholder:text-muted transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent'
    const labelBase = 'mb-1.5 block text-xs font-medium text-muted'
    const errorBase = 'mt-1.5 text-xs text-red-700 dark:text-red-400'
    const requiredMarker = (
        <span className="text-red-700 dark:text-red-400" aria-hidden="true">
            {' '}
            *
        </span>
    )

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

            {/* Single assertive summary instead of a role="alert" per field —
            three simultaneous alerts compete with each other and with the
            focus-move announcement that follows a tick later. Keyed on
            submitAttempt so a second failed attempt with the same error
            count still remounts (and gets re-announced) rather than bailing
            out on an unchanged text node. */}
            {errorCount > 0 && (
                <p key={submitAttempt} role="alert" className="sr-only">
                    {errorCount === 1
                        ? '1 field needs attention.'
                        : `${errorCount} fields need attention.`}
                </p>
            )}

            <div className="space-y-5">
                <div>
                    <label htmlFor="contact-name" className={labelBase}>
                        Name
                        {requiredMarker}
                    </label>
                    <input
                        ref={nameInputRef}
                        id="contact-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        onChange={handleFieldChange('name')}
                        aria-required="true"
                        aria-describedby={
                            errors.name ? 'contact-name-error' : undefined
                        }
                        aria-invalid={!!errors.name}
                        className={inputBase}
                        placeholder="Your name"
                    />
                    {errors.name && (
                        <p id="contact-name-error" className={errorBase}>
                            {errors.name}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor="contact-email" className={labelBase}>
                        Email
                        {requiredMarker}
                    </label>
                    <input
                        ref={emailInputRef}
                        id="contact-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        onChange={handleFieldChange('email')}
                        aria-required="true"
                        aria-describedby={
                            errors.email ? 'contact-email-error' : undefined
                        }
                        aria-invalid={!!errors.email}
                        className={inputBase}
                        placeholder="your@email.com"
                    />
                    {errors.email && (
                        <p id="contact-email-error" className={errorBase}>
                            {errors.email}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor="contact-message" className={labelBase}>
                        Message
                        {requiredMarker}
                    </label>
                    <textarea
                        ref={messageInputRef}
                        id="contact-message"
                        name="message"
                        rows={5}
                        onChange={handleFieldChange('message')}
                        aria-required="true"
                        aria-describedby={
                            errors.message ? 'contact-message-error' : undefined
                        }
                        aria-invalid={!!errors.message}
                        className={`${inputBase} resize-none`}
                        placeholder="What's on your mind?"
                    />
                    {errors.message && (
                        <p id="contact-message-error" className={errorBase}>
                            {errors.message}
                        </p>
                    )}
                </div>

                {status === 'error' && (
                    <p
                        role="alert"
                        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
                    >
                        Something went wrong. Please try again or reach out on
                        LinkedIn.
                    </p>
                )}

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
