# Chakra UI v3 Reference (app/salon)

## Setup
- Package: `@chakra-ui/react` ^3.38.0
- Provider: `src/components/ui/provider.tsx` uses `ChakraProvider value={defaultSystem}` + `ColorModeProvider` (next-themes).
- Color mode: `src/components/ui/color-mode.tsx` exports `ColorModeButton`, `useColorMode`, `useColorModeValue`.
- Styling: Chakra style props + Tailwind v4 (`@import "tailwindcss"` in `src/index.css`).

## Component Categories (v3)
Typography: Blockquote, Code, Code Block, Em, Heading, Highlight, Kbd, Link, Link Overlay, List, Mark, Prose, Rich Text Editor, Text
Buttons: Button, Close Button, Icon Button, Download Trigger
Forms: Input, Textarea, Select, Checkbox, Radio, Switch, Slider, Number Input, Pin Input, Tags Input, Field, Fieldset, Form Control
Date/Time: Date Input, Date Picker, Calendar
Collections: Combobox, Command, Listbox, Select, Tree View
Overlays: Dialog, Drawer, Popover, Tooltip, Hover Card, Menu, Toast
Disclosure: Accordion, Breadcrumb, Carousel, Collapsible, Pagination, Steps, Tabs
Feedback: Alert, Empty State, Progress, Progress Circle, Skeleton, Spinner, Status, Toast
Data Display: Avatar, Badge, Card, Clipboard, Image, Data List, Icon, Marquee, QR Code, Stat, Table, Tag, Timeline
Navigation: (Navbar implemented locally with Box/Flex/Link/Button)
Layout: Box, Flex, Grid, Stack, HStack, VStack, Container, Center, AbsoluteCenter, Spacer, AspectRatio, Separator, Wrap
Media: Image, Icon, Avatar
Utilities: Checkmark, ClientOnly, EnvironmentProvider, For, Presence, Portal, RadioMark, Show, SkipNav, VisuallyHidden, Theme

## Theme Tokens

### Semantic colors (auto light/dark)
- bg, bg.subtle, bg.muted, bg.emphasized, bg.inverted, bg.panel, bg.error, bg.warning, bg.success, bg.info
- fg, fg.muted, fg.subtle, fg.inverted, fg.error, fg.warning, fg.success, fg.info
- border, border.muted, border.subtle, border.emphasized, border.inverted, border.error
- Per-palette (gray, red, orange, yellow, green, teal, blue, cyan, purple, pink): solid, contrast, fg, muted, subtle, emphasized, focusRing, border

### Primitive color palettes
gray, red, orange, yellow, green, teal, blue, cyan, purple, pink, whiteAlpha, blackAlpha (50-950 steps)

### Spacing (rem/px)
0.5=2px, 1=4px, 1.5=6px, 2=8px, 2.5=10px, 3=12px, 3.5=14px, 4=16px, 5=20px, 6=24px, 7=28px, 8=32px, 9=36px, 10=40px, 12=48px, 14=56px, 16=64px, 20=80px, 24=96px, 28=112px, 32=128px, 36=144px, 40=160px, 44=176px, 48=192px, 52=208px, 56=224px, 60=240px, 64=256px, 72=288px, 80=320px, 96=384px

### Typography
- fonts: body, heading, mono (Inter stack)
- fontSizes: 2xs, xs, sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl, 6xl, 7xl, 8xl, 9xl
- fontWeights: thin, extralight, light, normal, medium, semibold, bold, extrabold, black
- lineHeights: shorter, short, moderate, tall, taller
- letterSpacings: tighter, tight, wide, wider, widest

### Radii
sm, md, lg, xl, 2xl, 3xl, full

### Breakpoints
sm=480px, md=768px, lg=1024px, xl=1280px, 2xl=1536px

### Shadows / zIndices
default shadow tokens; zIndices base/docked/dropdown/sticky/banner/overlay/modal/popover/skipLink/toast/tooltip

## Local Components Created
- `src/components/Navbar.tsx` (Chakra Box/Flex/HStack/VStack/IconButton/Button/Text)
- `src/components/landing/landing-footer.tsx` (Chakra Box/Container/Grid/VStack/Heading/Text)
- `src/layouts/PublicLayout.tsx` wires Navbar + main(pt=16) + LandingFooter
- `src/layouts/AuthLayout.tsx`, `DashboardLayout.tsx`, `StaffLayout.tsx`, `AdminLayout.tsx`, `MainLayout.tsx` placeholders

## Notes
- Use `asChild` for router integration instead of `as={RouterLink}`.
- Semantic tokens adapt to color mode automatically; prefer them over raw colors.
- `defaultSystem` is used; custom theming via `defineConfig` + `createSystem` if needed.