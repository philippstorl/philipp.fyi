# Security policy

## Reporting a vulnerability

Please do not report security vulnerabilities through public GitHub issues, pull requests, or discussions.

Report them privately through GitHub's private vulnerability reporting instead:

1. Go to the repository's [Security tab](https://github.com/philippstorl/philipp.fyi/security).
2. Click **Report a vulnerability** (or open [a new advisory](https://github.com/philippstorl/philipp.fyi/security/advisories/new) directly).
3. Fill in the form and submit it. The report stays private to you and the repository maintainers.

If that option is unavailable for any reason, use the [contact form](https://philipp.fyi/contact/) to ask for a private channel, without including vulnerability details in the message.

The same contact details are published at [`/.well-known/security.txt`](https://philipp.fyi/.well-known/security.txt) ([RFC 9116](https://www.rfc-editor.org/rfc/rfc9116)).

## What to include

- The affected URL, file, or component (for example a Netlify Function under `netlify/functions/`, the Content Security Policy in `netlify.toml`, or the contact form)
- Steps to reproduce, or a proof of concept
- The impact you believe it has
- Any suggested fix, if you have one

## Scope

In scope: the source code in this repository and the site it deploys to, [philipp.fyi](https://philipp.fyi), including its HTTP security headers and serverless functions.

A vulnerable dependency version this repository ships, or an insecure way it uses a dependency, is also in scope. A bug inside a dependency itself should be reported to that dependency's maintainers.

Out of scope: vulnerabilities in the third-party services the site runs on (Netlify, GitHub), which should be reported to those providers. Findings that only apply to outdated browsers, and automated scanner output without a demonstrated impact, are also out of scope.

## What to expect

This is a personal site maintained by one person, so there is no formal service-level agreement. You can expect an acknowledgment of your report within a few days, followed by updates as it is investigated and fixed. Please allow reasonable time for a fix to be deployed before disclosing the issue publicly. With your permission, you will be credited in the published security advisory.
