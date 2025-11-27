# Design Guidelines: Transformer Token Generation Exhibition Display

## Design Approach

**Hybrid Approach**: Combining Material Design's data visualization principles with exhibition-grade interactive design. Drawing inspiration from museum interactive displays and educational visualization tools like Observable and D3.js showcases.

**Core Principle**: Create a full-screen, immersive experience that transforms technical AI concepts into visually striking, educational moments. Every element serves the narrative of "watching AI think."

---

## Typography

**Font Stack**: 
- Primary: "Inter" (900, 700, 500, 400) - Clean, modern, excellent readability at display sizes
- Monospace: "JetBrains Mono" (500, 400) - For generated text and technical elements

**Hierarchy**:
- Prompt Input Label: text-sm font-medium uppercase tracking-wider
- User Prompt: text-2xl md:text-3xl font-medium
- Generated Tokens: text-4xl md:text-6xl font-bold (current token), text-3xl md:text-5xl font-medium (previous tokens)
- Probability Labels: text-xs md:text-sm font-mono
- Controls/UI: text-base font-medium

---

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Micro spacing: 2, 4 (between related elements)
- Component padding: 6, 8
- Section spacing: 12, 16, 24

**Full-Screen Grid**:
```
┌─────────────────────────────────┐
│  API Selector (top-right, p-6)  │
├─────────────────────────────────┤
│                                 │
│    Prompt Area (max-w-4xl)     │
│         (centered, py-12)       │
│                                 │
├─────────────────────────────────┤
│                                 │
│   Generation Display Area       │
│   (flex-1, centered content)    │
│   - Current/Previous Tokens     │
│   - Cursor/Loading State        │
│                                 │
├─────────────────────────────────┤
│                                 │
│  Probability Visualization      │
│     (max-w-2xl, py-16)         │
│                                 │
├─────────────────────────────────┤
│   Controls (bottom, p-8)        │
│   [Next] [Fast Forward] [Reset] │
└─────────────────────────────────┘
```

**Container**: Always use h-screen with flex flex-col to fill viewport appropriately

---

## Component Library

### 1. API Selector Toggle
- Segmented control design (OpenAI | Gemini)
- Position: absolute top-6 right-6
- Subtle border, active state with filled background
- Disabled when generation is active

### 2. Prompt Input Area
- Large textarea with minimal border (focus:ring-2)
- Prominent "Generate" button (px-12 py-4, text-lg)
- Character counter (text-xs, subtle)
- State: Empty → Filled → Generating → Complete

### 3. Token Display
- Flex-wrap container for horizontal token flow
- Current token: Highlighted with subtle background, scale animation entrance
- Previous tokens: Slightly dimmed opacity-80
- Blinking cursor indicator (animate-pulse) when generating
- Smooth stagger animation for each new token (fade-in + slide-in)

### 4. Probability Distribution Visualization
- Top 5-8 alternative tokens shown as horizontal bars
- Each bar contains:
  - Token text (left, font-mono)
  - Animated progress bar (height: h-12, rounded-lg)
  - Percentage (right, font-mono)
- Bars animate from 0 to target width (transition-all duration-700)
- Color gradient: Highest probability → Lower probability (opacity variation)
- Staggered entrance animation (delay-100, delay-200, etc.)

### 5. Control Buttons
- Three states: Next (primary), Fast Forward (secondary), Reset (tertiary)
- Large touch targets: min-h-14 px-8
- Icon + Text labels
- Next: Disabled until ready, pulses when available
- Fast Forward: Skip animation, shows final result
- Reset: Returns to initial prompt state
- Spacing between buttons: gap-4

### 6. Status Indicators
- Loading spinner (during API call)
- Token counter: "X / Y tokens generated"
- Generation complete checkmark with micro-animation

---

## Animations

**Token Entrance** (when new token appears):
```
Opacity: 0 → 1 (duration-300)
Transform: translateY(8px) → translateY(0) (duration-300)
```

**Probability Bars**:
```
Width: 0% → X% (duration-700, ease-out)
Stagger: Each bar delays by 75ms
Entrance: opacity-0 → opacity-100 + translateX(-20px) → 0
```

**Blinking Cursor**: 
```
animate-pulse (1s interval)
```

**Button Interactions**:
- Next button pulse: subtle scale(1.02) when enabled
- All buttons: hover:opacity-90 transition-opacity

---

## State Management & Flow

**States**:
1. **Initial**: Prompt input visible, controls hidden
2. **Generating**: Token-by-token reveal with probability updates
3. **Paused**: Between tokens, waiting for Next button
4. **Fast-Forward**: Rapid token reveal (100ms intervals)
5. **Complete**: All tokens shown, Reset button prominent

**Visual State Indicators**:
- Generating: Animated gradient background shift
- Paused: Steady state, Next button highlighted
- Complete: Success indicator, subtle celebration micro-animation

---

## Accessibility

- Focus visible on all interactive elements (ring-2 ring-offset-2)
- ARIA labels for all buttons and controls
- Keyboard navigation: Space/Enter for Next, Cmd+Enter for Fast Forward, Escape for Reset
- High contrast text on all backgrounds
- Minimum touch target: 44x44px for all buttons
- Screen reader announcements for token generation progress

---

## Images

**No images required** - This is a pure data visualization application where the animated interface IS the visual centerpiece.

---

## Special Considerations

**Exhibition Optimization**:
- All text sizes 20% larger than standard web (for viewing from distance)
- Animations slower and more dramatic (700-1000ms vs typical 300ms)
- High contrast for monitor display environments
- No scrolling - everything fits in viewport with intelligent spacing
- Idle state: Subtle ambient animation to attract attention

**Technical Display Notes**:
- Probability bars should clearly show percentage labels
- Monospace font for technical accuracy
- Clear visual distinction between user input and AI output
- Generation speed controls should be intuitive at a glance