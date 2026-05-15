Build a production-ready “Mochi Panda Mascot Evolution System” for a couple dating app.

## Goal

Create a living mascot system for the daily mission feature.
The mascot represents the couple’s shared relationship progress.

It should feel like a small emotional game character, not a static illustration.

---

## Mascot Concept

Mascot name: **Mochi**

Style:

* cute panda
* soft 3D / 2.5D feeling
* warm, romantic, playful
* suitable for mobile app UI
* expressive eyes
* gentle idle motion
* no scary / aggressive / childish extremes

---

## Evolution Stages

### Stage 1 — Mochi Bé Xíu

XP: 0–299

Visual:

* only panda head
* no body
* no accessories
* simple, innocent, tiny
* soft blush cheeks

Animations:

* idle breathing
* blink
* tiny bounce
* tap reaction: blink + small happy bounce

---

### Stage 2 — Mochi Tinh Nghịch

XP: 300–799

Visual:

* panda head
* green round Vietnamese-style “nón cối” hat
* small pink flower on hat
* no body yet

Animations:

* idle breathing
* blink
* hat bobbing slightly
* tap reaction: happy bounce
* mission completed: eyes smile + heart pop

---

### Stage 3 — Mochi Yêu Trúc

XP: 800–1499

Visual:

* panda upper body appears
* visible arms
* holding bamboo close to body
* bamboo must be close, not floating far away
* cute happy expression

Animations:

* idle breathing
* blink
* bamboo sway very slightly
* tap reaction: wave bamboo subtly
* mission completed: hug bamboo + hearts
* all missions completed: small jump + confetti

---

### Stage 4 — Mochi Trưởng Thành

XP: 1500+

Visual:

* full body panda
* green outfit
* green round hat
* bamboo in hand
* bamboo forest background
* more mature, warm, confident
* still cute and soft

Animations:

* idle breathing
* blink
* soft forest parallax
* bamboo leaves sway
* mission completed: wave + hearts
* all missions completed: celebration + confetti
* streak broken: sad face, head down slightly

---

## Rive Requirements

Use Rive for production animation.

Create one `.riv` file containing:

* one artboard: `MochiMascot`
* one state machine: `MochiStateMachine`

Inputs:

```ts
stage: number // 1, 2, 3, 4
mood: number // 0 idle, 1 happy, 2 excited, 3 sad
triggerTap: trigger
triggerMissionComplete: trigger
triggerAllComplete: trigger
triggerStreakBroken: trigger
```

State machine behavior:

```text
Idle
→ TapReaction
→ MissionComplete
→ AllComplete
→ Sad
→ Evolution
```

Rules:

* `stage` controls visible layers
* stage 1 shows head only
* stage 2 shows hat + flower
* stage 3 shows body + arms + bamboo
* stage 4 shows full body + outfit + forest background

Animation priorities:

1. AllComplete
2. MissionComplete
3. TapReaction
4. Sad
5. Idle

---

## Layer Structure

Suggested Rive layer groups:

```text
MochiMascot
├── Background
│   ├── Stage4_BambooForest
│   ├── LightGlow
│   └── GroundShadow
├── Panda
│   ├── Head
│   ├── Ears
│   ├── Face
│   │   ├── Eyes
│   │   ├── EyeHighlights
│   │   ├── Nose
│   │   ├── Mouth
│   │   └── Cheeks
│   ├── Body
│   ├── Arms
│   ├── Legs
│   └── Outfit
├── Accessories
│   ├── Hat
│   ├── Flower
│   └── Bamboo
├── Effects
│   ├── Hearts
│   ├── Confetti
│   └── Sparkles
```

---

## Animation Details

### Idle

* head/body breathing scale: 1 → 1.02 → 1
* eyes blink every 3–5 seconds
* cheeks opacity pulse slightly
* stage 4 background bamboo sway subtly

### TapReaction

* quick bounce
* eyes smile
* tiny heart appears
* duration: 600–900ms

### MissionComplete

* happy bounce
* heart particles
* XP glow
* duration: 1000–1500ms

### AllComplete

* bigger bounce
* confetti burst
* sparkle glow
* duration: 1800–2500ms

### StreakBroken / Sad

* eyes lower
* mouth sad
* head drops slightly
* no harsh sadness
* duration: 1200–1800ms

### Evolution

When stage changes:

* soft white glow
* scale up
* sparkle transition
* reveal new stage layers
* duration: 1800–2200ms

---

## React Integration

Use `@rive-app/react-canvas`.

Component API:

```ts
type MochiMascotProps = {
  xp: number;
  streak: number;
  mood?: "idle" | "happy" | "excited" | "sad";
  className?: string;
  onTap?: () => void;
};
```

Stage calculation:

```ts
function getMochiStage(xp: number) {
  if (xp >= 1500) return 4;
  if (xp >= 800) return 3;
  if (xp >= 300) return 2;
  return 1;
}
```

---

## React Component Behavior

* Load `/rive/mochi-mascot.riv`
* Set `stage` input based on XP
* Fire animation triggers based on events
* Detect stage changes and trigger evolution animation
* Tapping mascot fires `triggerTap`
* Completing mission fires `triggerMissionComplete`
* Completing all 3 missions fires `triggerAllComplete`
* Broken streak fires `triggerStreakBroken`

---

## Fallback

If Rive fails to load:

* show static PNG/WebP mascot based on stage
* fallback path:

```ts
/images/mascot/mochi-stage-1.webp
/images/mascot/mochi-stage-2.webp
/images/mascot/mochi-stage-3.webp
/images/mascot/mochi-stage-4.webp
```

---

## UI Card

Create `MochiMascotCard`.

It should show:

* mascot
* name
* stage label
* XP progress bar
* streak pill
* next evolution hint

Example:

```text
Mascot của tụi mình
Mochi Yêu Trúc
Đã có cây trúc bên mình · 800–1499 XP

[animated mascot]

1020 XP           68%
[progress bar]

Hoàn thành nhiệm vụ để Mochi lớn thêm.
```

---

## Production Requirements

* mobile-first
* smooth 60fps where possible
* lazy load Rive
* avoid layout shift
* fallback while loading
* keep Rive file lightweight
* use WebP fallback images
* no autoplay heavy effects when user is idle
* respect reduced-motion setting

---

## Accessibility

* mascot is decorative unless tapped
* provide aria-label:
  “Mascot Mochi của hai bạn”
* if reduced motion is enabled:

  * disable particle effects
  * keep only static mascot + progress bar

---

## Final Deliverables

Implement:

* Rive integration component
* stage calculation
* animation trigger system
* fallback image system
* mascot UI card
* XP progress
* streak display
* evolution detection
* reduced motion handling

Do not use CSS-only mascot for production.
Use Rive as the primary animation system.
