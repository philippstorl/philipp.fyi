export interface ThirdPartyNoticeGroup {
    licenseName: string
    packages: { name: string; role: string; homepage: string }[]
    copyright: string
    text: string
}

// MIT and ISC both require the copyright and permission notice to be
// included in distributed copies of the software — verbatim from each
// package's own LICENSE file (node_modules/<pkg>/LICENSE), not paraphrased.
// react/react-dom compile into the client bundle for the ThemeToggle/
// ContactForm React islands; lucide-react's icons are used across several
// components. All three are minified in production, which strips their
// source comments' own @license banners (issue #189).
export const thirdPartyNotices: ThirdPartyNoticeGroup[] = [
    {
        licenseName: 'MIT License',
        packages: [
            {
                name: 'React',
                role: 'Powers the ContactForm and ThemeToggle islands.',
                homepage: 'https://react.dev/',
            },
            {
                name: 'React DOM',
                role: 'Renders those islands into the page.',
                homepage: 'https://react.dev/',
            },
        ],
        copyright: 'Copyright (c) Meta Platforms, Inc. and affiliates.',
        text: `Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`,
    },
    {
        licenseName: 'ISC License',
        packages: [
            {
                name: 'lucide-react',
                role: 'Provides the icons used throughout the site.',
                homepage: 'https://lucide.dev/',
            },
        ],
        copyright: 'Copyright (c) 2026 Lucide Icons and Contributors',
        text: `Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`,
    },
    {
        // lucide-react's own LICENSE file carries a second, separate block:
        // a subset of its icons are derived from the Feather project and
        // separately MIT-licensed, on top of the package's own ISC license
        // above. Several of those Feather-derived icons (ArrowRight,
        // ChevronLeft/Right, Monitor, Moon, X) are actually imported in
        // this codebase, so that second notice applies too, not just ISC.
        licenseName: 'MIT License (Feather-derived Lucide icons)',
        packages: [
            {
                name: 'lucide-react',
                role: 'Some of its icons are derived from the Feather icon set.',
                homepage:
                    'https://github.com/lucide-icons/lucide/blob/main/LICENSE',
            },
        ],
        copyright: 'Copyright (c) 2013-present Cole Bemis',
        text: `Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`,
    },
]
