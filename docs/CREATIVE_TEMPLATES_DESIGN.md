# Creative Resume Templates - Design Specification

## Philosophy

> "A resume should feel like opening a premium product box -
> the moment you see it, you know this person invests in quality."

Our templates aren't just layouts - they're **personal brand statements**.

---

## Template 1: "BENTO" - Apple-Inspired Modular Grid

**Inspiration:** Apple.com product pages, iOS widgets, Notion gallery view

**Visual Identity:**

- Rounded cards with varying sizes (2x1, 1x1, 2x2)
- Subtle shadows with hover lift animations
- Clean white space, SF Pro-like typography
- Accent color derived from user's industry

**Layout:**

```
┌─────────────────┬───────────┬───────────┐
│                 │  SKILLS   │  GITHUB   │
│     HERO        │   2x1     │   1x1     │
│     2x2         ├───────────┼───────────┤
│                 │  CONTACT  │  YEARS    │
│                 │   1x1     │   EXP 1x1 │
├─────────────────┴───────────┴───────────┤
│              EXPERIENCE TIMELINE         │
│                    3x1                   │
├─────────────────┬───────────────────────┤
│   PROJECT 1     │      PROJECT 2        │
│      1x2        │         2x2           │
└─────────────────┴───────────────────────┘
```

**Key Features:**

- Cards animate in staggered on page load
- Hover shows "peek" preview (like iOS long-press)
- Skills show as mini progress rings
- Experience as horizontal scroll timeline
- "Download PDF" morphs into share sheet

**Color Palette:**

- Background: #FAFAFA (paper white)
- Cards: #FFFFFF with 0 2px 20px rgba(0,0,0,0.08)
- Accent: Dynamic (Blue for tech, Green for finance, etc.)
- Text: #1D1D1F (Apple black)

**Best For:** Product managers, designers, modern tech roles

---

## Template 2: "TERMINAL" - Developer's Code Editor Theme

**Inspiration:** VS Code, GitHub Readme, iTerm2

**Visual Identity:**

- Dark background (#0D1117 GitHub dark)
- Monospace typography (JetBrains Mono)
- Syntax-highlighted sections
- Blinking cursor animations
- File tree navigation sidebar

**Layout:**

````
┌──────────────────────────────────────────┐
│ 📁 resume.md          ─ □ ✕             │
├────────────┬─────────────────────────────┤
│ EXPLORER   │ # John Doe                  │
│ ▾ src/     │                             │
│   about.md │ > Software Engineer @ FAANG │
│   exp/     │                             │
│   skills/  │ ## About                    │
│   projects │ ```javascript               │
│ ▾ config   │ const skills = [            │
│   links    │   "React", "Node.js"...     │
│            │ ];                          │
│            │ ```                         │
│            │                             │
│            │ ## Experience               │
│            │ - **Google** (2022-Present) │
│            │   - Built search infra...   │
└────────────┴─────────────────────────────┘
````

**Key Features:**

- Click sidebar to "navigate" sections
- Typing animation on page load
- `git log` style experience timeline
- Skills as `package.json` dependencies
- Easter egg: Konami code shows "vim mode"

**Color Palette:**

- Background: #0D1117
- Sidebar: #161B22
- Text: #C9D1D9
- Keywords: #FF7B72 (red), #79C0FF (blue), #A5D6FF (cyan)
- Strings: #A5D6FF
- Comments: #8B949E

**Best For:** Developers, DevOps, open-source contributors

---

## Template 3: "EDITORIAL" - Magazine Typography Focus

**Inspiration:** NYT, Medium, Monocle magazine, Stripe press

**Visual Identity:**

- Large serif headlines (Playfair Display)
- Multi-column newspaper layout
- Pull quotes and drop caps
- Elegant dividers and rules
- Black & white with one accent color

**Layout:**

```
┌──────────────────────────────────────────┐
│                                          │
│    J O H N   D O E                       │
│    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│    VP of Engineering • 15 Years • NYC    │
│                                          │
├────────────────────┬─────────────────────┤
│                    │                     │
│  "Building teams   │  EXPERIENCE         │
│   that build       │  ───────────        │
│   products that    │  Google             │
│   change the       │  2020 – Present     │
│   world."          │                     │
│                    │  Led 200-person...  │
│  ─ Featured in     │                     │
│    Forbes 30u30    │  ───────────        │
│                    │  Meta               │
│                    │  2015 – 2020        │
│                    │                     │
├────────────────────┴─────────────────────┤
│                                          │
│  S K I L L S                             │
│  Strategy • Leadership • Architecture   │
│                                          │
└──────────────────────────────────────────┘
```

**Key Features:**

- Drop caps on summary paragraph
- Pull quote highlighted in sidebar
- Skills as elegant horizontal list
- Experience with subtle left border accent
- "Read time: 2 min" like Medium

**Typography:**

- Headlines: Playfair Display (serif)
- Body: Inter or Source Serif Pro
- Captions: Small caps, letterspaced

**Color Palette:**

- Background: #FFFCF9 (warm white)
- Text: #1A1A1A
- Accent: #B91C1C (deep red) or user-selected
- Rules: #E5E5E5

**Best For:** Executives, consultants, thought leaders, writers

---

## Template 4: "NOIR" - Dark Mode Premium

**Inspiration:** Vercel, Linear, high-end luxury brands

**Visual Identity:**

- Pure black background (#000000)
- Subtle gradients and glows
- Gold/silver metallic accents
- Minimal, spacious, luxurious
- Micro-animations on scroll

**Layout:**

```
┌──────────────────────────────────────────┐
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  ✦  JOHN DOE                       │  │
│  │      Staff Engineer                │  │
│  │                                    │  │
│  │  ┌─────────────────────────────┐   │  │
│  │  │ "Architecting systems that  │   │  │
│  │  │  scale to billions."        │   │  │
│  │  └─────────────────────────────┘   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                          │
│  GOOGLE        META         STRIPE       │
│  2022–Now      2019–22      2016–19      │
│                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                          │
│  ◆ Distributed Systems    ◆ Go          │
│  ◆ Kubernetes             ◆ Rust        │
│                                          │
└──────────────────────────────────────────┘
```

**Key Features:**

- Gradient border glow on hover (like Vercel cards)
- Company logos rendered in monochrome
- Skills with subtle shimmer animation
- Scroll-triggered fade-in sections
- "Verified" badge option for premium users

**Color Palette:**

- Background: #000000
- Card bg: #0A0A0A with gradient border
- Text: #FFFFFF / #A1A1A1
- Accent: Linear gradient (gold → rose) or (blue → purple)
- Borders: rgba(255,255,255,0.1)

**Best For:** Senior engineers, founders, premium tier users

---

## Implementation Priority

| Template  | Complexity | Target Users   | Priority |
| --------- | ---------- | -------------- | -------- |
| Bento     | Medium     | PMs, Designers | P1       |
| Terminal  | High       | Developers     | P1       |
| Editorial | Medium     | Executives     | P2       |
| Noir      | Medium     | Premium tier   | P2       |

---

## Tiered Access Model

| Feature                     | Free | Premium | Enterprise |
| --------------------------- | ---- | ------- | ---------- |
| Standard templates          | ✓    | ✓       | ✓          |
| Masonry                     | ✓    | ✓       | ✓          |
| **Bento**                   | —    | ✓       | ✓          |
| **Terminal**                | —    | ✓       | ✓          |
| **Editorial**               | —    | —       | ✓          |
| **Noir**                    | —    | —       | ✓          |
| Custom accent colors        | —    | ✓       | ✓          |
| PDF export styling          | —    | ✓       | ✓          |
| Remove "Made with SwitchCV" | —    | —       | ✓          |

---

## Template Selector UI Concept

```
┌────────────────────────────────────────────────────────────┐
│  Choose Your Style                                         │
│  ─────────────────                                         │
│  AI recommends: BENTO (based on your profile)              │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Standard │  │  Bento   │  │ Terminal │  │   Noir   │   │
│  │  [img]   │  │  [img]   │  │  [img]   │  │  [img]   │   │
│  │          │  │    ★     │  │   🔒     │  │   🔒     │   │
│  │  FREE    │  │ PREMIUM  │  │ PREMIUM  │  │  ENTER.  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                            │
│  [Preview All] [Apply Selected]                            │
└────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. Build Bento template first (most visual impact)
2. Add template gallery with live preview
3. Integrate with subscription tier checks
4. Add PDF export with template styling preserved
