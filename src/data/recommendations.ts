export interface Recommendation {
    slug: string
    name: string
    title: string
    date: string
    relationship: string
    quote: string[]
    featured: boolean
}

export const recommendations: Recommendation[] = [
    {
        slug: 'juliane-kiesenbauer',
        name: 'Dr. Juliane Kiesenbauer',
        title: 'General Manager / SVP at Staffbase',
        date: 'June 25, 2026',
        relationship: 'Dr. Juliane worked with Philipp on the same team',
        featured: true,
        quote: [
            'I first met Philipp when he became my Culture Buddy during my onboarding at Staffbase. Looking back, that already says a lot about who he is. He genuinely cared that new people felt welcome.',
            'Over the years, I had the chance to work with Philipp both as a people leader and later as an individual contributor. What always stood out to me was the combination of precision, intellectual curiosity, and genuine ownership. Whether it was our website, a technical challenge, or a strategic discussion, Philipp consistently looked beyond the obvious and cared about finding the best solution, not the quickest one.',
            "He takes other people's perspectives seriously, asks thoughtful questions, and has an impressive ability to work through complex problems together with others. That's what made him such a valuable sparring partner for me, not only on technical topics, but also when discussing marketing strategy and broader business decisions.",
            "Philipp brings real intellectual honesty to the table. He keeps the bigger picture in mind, isn't afraid to voice a different perspective when it leads to a better outcome, and once a decision is made, fully commits to making it successful.",
            "That's why people like Philipp are incredibly valuable for leadership teams. They don't just contribute expertise but they elevate the quality of conversations and decisions through critical thinking, sound judgment, and a genuine commitment to the success of the business.",
        ],
    },
    {
        slug: 'tilo-zemke',
        name: 'Tilo Zemke',
        title: 'CTO at Staffbase',
        date: 'June 24, 2026',
        relationship:
            "Tilo was senior to Philipp but didn't manage Philipp directly",
        featured: false,
        quote: [
            "During his time at Staffbase, Philipp has seen a lot of growth – both in the company as well as in himself. It was an honor to watch that. Over the years, he's put in not just a lot of hours, but also his heart and his passion. We're forever grateful for all his contributions and being part of this incredible growth story.",
            'He started with a small company’s website, grew both the website and the team, at times as a manager, at times as a leader. Philipp was always eager to connect and align across the team boundaries, seeking hints and advice, showing a big appetite to learn and stay up-to-date, for example with the deeper machine room and infrastructure topics.',
            'Thank you for everything! \u{1F917}',
        ],
    },
    {
        slug: 'david-burnand',
        name: 'David Burnand',
        title: 'Chief Marketing Officer @ Sparta | GTM Strategy, B2B Marketing',
        date: 'June 14, 2026',
        relationship: 'David managed Philipp directly',
        featured: true,
        quote: [
            "I had the pleasure of working with Philipp at Staffbase, and he's one of the most capable web developers I've come across. His technical skill is matched by a rare attention to detail, the kind that catches the things in the back end that most people miss and quietly makes the whole product better.",
            'Philipp led our transition from WordPress to Storyblok, a significant undertaking that he managed with real command of the technical and practical challenges involved. He then launched our website across five languages, delivering a polished, multilingual experience without compromising on quality or consistency.',
            "Beyond the craft, Philipp is a genuine person and a pleasure to work alongside. He's straightforward, dependable, and invested in doing things properly. Any team would be lucky to have him.",
        ],
    },
    {
        slug: 'bartek-jaglowski',
        name: 'Bartek Jaglowski',
        title: 'Senior Product Management & Web Strategy professional | Expertise in leading digital initiatives, programs and innovation across teams and functions',
        date: 'June 12, 2026',
        relationship:
            "Bartek was in a neighboring team before becoming Philipp's manager",
        featured: true,
        quote: [
            'I worked with Philipp at Staffbase for several years, including as his manager. Philipp built and owned the marketing web function from the ground up: multiple web properties, end-to-end technical ownership, Jira workflows, team processes, and continued to be the backbone of that infrastructure throughout our time working together.',
            'He has broad technical depth across frontend development, infrastructure, and tooling, and was consistently the first point of escalation for anything technically complex.',
            "Philipp leads with conviction and challenges assumptions where it matters, which consistently pushed the team toward sharper decisions and better outcomes. He's equally thorough when the situation calls for it and pragmatic when required. He delivered on his commitments.",
            'Philipp takes ownership end-to-end and creates the conditions for teams to move fast and build things that last.',
        ],
    },
    {
        slug: 'philipp-munzert',
        name: 'Philipp Munzert',
        title: 'Founder PHMU & Coach',
        date: 'June 11, 2026',
        relationship:
            'Philipp worked with Philipp but they were at different companies',
        featured: true,
        quote: [
            "I have worked with Philipp Storl for over eight years, and our story has an unusual start: I was Staffbase's external implementation partner before Philipp joined in 2018. I watched him take over in-house what had been my role and instead of that ending our collaboration, it became the beginning of one of the most rewarding partnerships my agency has had.",
            'Over those years, krawall & wunder built and maintained several of Staffbase’s web properties like the blog, the careers site, and the Niners "Player of the Game" site, with Philipp as our primary technical counterpart throughout. It never felt like a client–vendor relationship. We made decisions together: we jointly kicked off the Gatsby-to-Astro migration in a shared planning session, agreed dependency policies as a team, and reviewed each other’s pull requests. Philipp regularly asked us to review his own changes, which tells you a lot about how he works.',
            "He's also exactly the counterpart you want when things get tricky. When our team was accidentally removed from the Staffbase GitHub organization, he caught it and got it resolved immediately, protecting a partnership that wasn't even his to defend. Clear briefs, well-documented handovers, and direct communication were simply the norm.",
            'Through rebrands, platform migrations, and years of organizational change, Philipp stayed the constant and the work was always renewed on merit, never inertia. Any team would be lucky to have him.',
        ],
    },
    {
        slug: 'lutz-gerlach',
        name: 'Lutz Gerlach',
        title: 'Co-founder at Staffbase',
        date: 'June 9, 2026',
        relationship:
            "Lutz was senior to Philipp but didn't manage Philipp directly",
        featured: false,
        quote: [
            "As a Co-Founder of Staffbase, I had the privilege of watching Philipp's journey unfold over nearly eight years. Being part of a company's evolution from an early-stage startup to a global scale-up is a unique experience, and Philipp was there for it all—navigating the fast-paced growth and organizational changes firsthand.",
            'While we didn’t work together directly in the day-to-day business, it was great to see him grow professionally alongside the company. Throughout his time, he was a reliable teammate who contributed positively to our culture and aligned well with our values. Spending eight years in a rapidly scaling environment naturally gives someone a very solid foundation of adaptability and resilience.',
            'Philipp leaves us with highly valuable scale-up experience and a great mindset. I am grateful for his long-standing dedication to Staffbase and wish him all the best for his next career step!',
        ],
    },
    {
        slug: 'firas-najar',
        name: 'Firas Najar',
        title: 'Product Design (UX/UI) | Staffbase',
        date: 'June 1, 2026',
        relationship: 'Firas worked with Philipp on the same team',
        featured: false,
        quote: [
            "I've had the chance to work closely with Philipp since joining the web team at Staffbase. From the beginning, he made it really easy for me to get up to speed. He explains things clearly, doesn't overcomplicate anything, and has a very structured way of thinking that makes working together easy.",
            "What I appreciated most was his ability to think beyond the task in front of him. Whenever we ran into design or implementation questions, he was never focused on the quickest fix. Instead, he'd look at the bigger picture and ask how we could solve the problem in a way that would improve the system as a whole. As a designer, I learned a lot from that way of thinking.",
            'We also collaborated closely every day, bouncing ideas off each other, discussing trade-offs, and figuring out the best solutions together. He always made time for questions, explained the reasoning behind decisions, and genuinely cared about building things the right way.',
            "Finally, and most importantly, he's just a great person to work with. Reliable, structured, approachable, and someone you can count on when things get busy. I'd happily work with him again and can confidently recommend him to any team lucky enough to have him!!",
        ],
    },
    {
        slug: 'katja-holubek',
        name: 'Katja Holubek',
        title: 'People Experience @Staffbase',
        date: 'June 1, 2026',
        relationship: 'Katja worked with Philipp but on different teams',
        featured: false,
        quote: [
            'Philipp and I worked alongside over several years at Staffbase, where he served as a Principal Web Developer and one of the longest-tenured members of the team. What stood out across our conversations was his reliability, structured thinking, and his genuine care for the people around him. He approached his work with real ownership and transparency, which made him a trusted point of contact well beyond his own team. Philipp will bring that same energy to whatever he takes on next.',
        ],
    },
    {
        slug: 'philipp-scherber',
        name: 'Philipp Scherber',
        title: 'Senior Content Marketing Manager bei Staffbase',
        date: 'May 29, 2026',
        relationship: 'Philipp worked with Philipp but on different teams',
        featured: false,
        quote: [
            'If our unofficial Philipp Club at Staffbase had ever elected a chairman, it would have been Philipp Storl. Not just because he was the longest-serving member, but because he would have been the right choice on every level — professionally and personally.',
            'I worked with him on many projects, and what always struck me was how much broader his understanding was than his job title suggested. He knows web development deeply, but he also understands marketing, design, and the business as a whole. That combination made him a very effective counterpart for someone on the content side.',
            'What I appreciated most was his approach to quality. Philipp always wants to understand what a stakeholder is actually trying to achieve bringing his experience and judgment to that alongside best practices. When I raised tickets, those requests were taken seriously, thought through, and resolved properly. He made us content editors more capable and more independent, not more dependent on the web team.',
            'The same clarity showed up in how he communicated. Technical issues were never just "it’s broken." He explained what caused it, what the scope was, and what the fix involved. That meant I actually learned something each time, rather than just waiting for a problem to disappear. He also built and maintained documentation and processes that let the content team work autonomously in Storyblok.',
            'The question of who owns the better BVB coffee mug remains unresolved. But what is very much resolved is that Philipp Storl is one of the most thoughtful, principled, engaged, and nice colleagues I’ve had the pleasure of working with.',
        ],
    },
    {
        slug: 'janet-levrel',
        name: 'Janet Levrel',
        title: 'Head of Brand Design · Design with intent at Staffbase',
        date: 'May 28, 2026',
        relationship: 'Janet worked with Philipp on the same team',
        featured: true,
        quote: [
            'I had the pleasure of working with Philipp across nearly his entire time at Staffbase. First in close delivery loops where I was designing pages and he was bringing them to life in code, and later in brand governance work where he became a trusted quality gate for how Staffbase showed up across web properties. Two very different phases, but the same Philipp: reliable, precise, and genuinely invested in getting things right.',
            'What stood out most was how faithfully he translated design intent into working code, down to font weights, color consistency, and layout details that most developers would wave through. He never deflected design questions; he engaged with them. That made him a truly valuable team player and someone you could actually think out loud with.',
            'Eight years of collaboration across multiple team structures says something. Whoever works with Philipp next is in good hands.',
        ],
    },
    {
        slug: 'oskar-stark',
        name: 'Oskar Stark',
        title: 'Managing Director @ SensioLabs Deutschland',
        date: 'May 12, 2026',
        relationship:
            'Oskar worked with Philipp but they were at different companies',
        featured: false,
        quote: [
            'Working with Philipp as part of our collaboration with Staffbase was a genuinely positive experience. He is someone who brings both strong expertise and a very approachable, collaborative mindset to the table.',
            'Philipp consistently demonstrated initiative, thoughtful problem-solving, and a strong focus on delivering quality results. I especially appreciated his calm and analytical approach when working through complex topics, as well as his ability to create a constructive and positive working atmosphere.',
            'Beyond his professional skills, Philipp stands out through his reliability, openness, and team spirit. I would gladly work with him again and can strongly recommend him to any organization looking for a skilled and dependable professional.',
        ],
    },
    {
        slug: 'alex-vasilyev',
        name: 'Alex Vasilyev',
        title: 'Design, Development, Entrepreneurship, Leadership, Marketing',
        date: 'May 26, 2023',
        relationship: 'Alex reported to Philipp directly',
        featured: true,
        quote: [
            'I have had the privilege of working alongside Philipp at Staffbase for a year and a half, and I must say, he has been an exceptional and inspirational leader. His dedication to driving continuous improvement and growth for every team member and the company as a whole has been truly remarkable.',
            'One of the most notable aspects of Philipp’s leadership is the atmosphere of openness, transparency, and growth that he has cultivated. These qualities have created an environment where each team member feels motivated and encouraged to contribute their best and support one another.',
            'Moreover, Philipp has been a role model when it comes to striking a balance between the daily challenges of our work, striving for high performance, and prioritizing personal growth and mental well-being. This has become increasingly significant, especially with the implementation of a hybrid work model and the need to collaborate across different time zones.',
            'I want to express my gratitude to Philipp for everything he does on a daily basis. Your leadership and guidance have made a significant impact on both the team and the company as a whole. Thank you for being an outstanding leader and for fostering an environment that encourages our professional and personal development.',
        ],
    },
    {
        slug: 'joshua-saldanha',
        name: 'Joshua Saldanha',
        title: 'Web Developer',
        date: 'May 25, 2023',
        relationship: 'Joshua reported to Philipp directly',
        featured: false,
        quote: [
            'Philipp is an excellent example of what a good leader should be.',
            'From the moment we started working together, my professional and personal life has been enriched with nuggets of wisdom, and knowledge that he has always taken the time to share with me and our entire team.',
            "He pushes us to strive for excellence at all times and does so in the most encouraging way that not only makes our work shine as a team, but leaves us feeling proud of our accomplishments. He doesn't just talk the talk, but charges in the front lines leading by example.",
            "He is very deliberate about taking time to be informed of everything and is a wealth of knowledge of everything that was happening in our team, but peripherally as well. I've often had conversations with him about his workflow as it sometimes felt like he was like an octopus with his hands in everything at the same time, yet somehow he managed to stay laser focused on the task at hand to deliver quick and perfect results.",
            'He has been meticulous about setting guidelines for us to follow, and these foundations set us up to work and communicate efficiently and openly. As a manager, I always felt comfortable going to Philipp with any issues that I may have been going through and know that I could find the support, understanding and guidance that I would require to tackle whatever obstacles I may encounter head on. I will always be appreciative for this as it has had a massive impact in the way I approach my work and challenges that get thrown my way.',
            'An incredible professional and an equally incredible human being and I am grateful to have had the opportunity to work alongside him.',
            'Thank you, Philipp for being the picture perfect example of what a good skipper at the helm should be.',
        ],
    },
]
