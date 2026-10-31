<div align="center">

# lieflat code video

**Launch films, made in code.**

A Claude Code skill built with Remotion + React, bringing camera movement, product interaction and rhythm into one film.

[简体中文](README.zh-CN.md) · **English**

**64 animated references · 8 Lens chapters**

</div>

[![Watch the lieflat code video showreel](assets/showreel.gif)](assets/showreel.mp4)

**[▶ Watch the full showreel · 55 seconds, with sound](assets/showreel.mp4)**

Four products, four visual directions. The preview above uses excerpts from the full film.

## See the motion before choosing the shot

Lens is a visual vocabulary of **64 animated examples across 8 chapters**. Browse the movement, pick a reference and describe exactly what you want to see.

### 01 — Camera movement

![Lens 01–08: dolly in, pull back, pan, tracking, orbit, crane up, dolly zoom and whip pan](assets/lens-01.gif)

### 02 — Transitions & handoffs

![Lens 09–16: carry, shrink into, push through, cursor follow, beat cuts, match cuts, occlusion and a fade counterexample](assets/lens-02.gif)

<details>
<summary><strong>Explore the other 48 examples →</strong></summary>

### 03 — More cameras & transitions · 17–24

![Fly-through, handheld drift, Dutch angle, parallax, rack focus, burst, blur swap and color changes](assets/lens-03.gif)

### 04 — Physics & rhythm · 25–32

![Springs, overshoot, two-edge stretch, stagger, speed ramps, motion blur, freeze frames and burst-and-breath rhythm](assets/lens-04.gif)

### 05 — Product interfaces · 33–40

![Hero controls, objects in a sentence, soft fields, tilted pages, exploded layers, checklists, notifications and two cursors](assets/lens-05.gif)

### 06 — Typography & claims · 41–48

![Typing, scattered words, word reels, keyword fills, letter substitutions, stacked type, title cards and split claims](assets/lens-06.gif)

### 07 — Proof & data · 49–56

![Counters, live races, dials, metric ladders, file walls, emerging results, asset grids and prompt-to-result](assets/lens-07.gif)

### 08 — Rhythm, interfaces & endings · 57–64

![Slow motion, rotating proof, noise-to-text, before-and-after, seamless loops, light sweeps, one takes and end lockups](assets/lens-08.gif)

</details>

**[Open the Lens source page](lens/index.html)** — download this repository and open `lens/index.html` in a browser to play all eight chapters. No installation or build step is needed. GitHub displays the HTML source; the downloaded file runs locally.

Try a direction like: “Use **09 Carry / morph** for the hook, **13 Cut on the beat** for the proof, then land on **64 End lockup**.”

The 64 entries are references, not 64 finished film templates. **16** is a fade counterexample, **32** describes a rhythm principle, and **15 / 37** are visual concepts without ready-made production components. Lens shows all 64; the full production toolkit has implementations mapped for the other 60.

## One workflow. Different visual worlds.

<table>
<tr>
<td width="50%"><img src="assets/charts.jpg" alt="Lieflat Charts: chart cards arranged in space" width="100%"><br><strong>Lieflat Charts</strong><br>Orbiting cards, data and changing themes.</td>
<td width="50%"><img src="assets/diagrams.jpg" alt="Lieflat Diagrams: a diagram growing from a prompt" width="100%"><br><strong>Lieflat Diagrams</strong><br>A prompt becomes a diagram, then changes form.</td>
</tr>
<tr>
<td width="50%"><img src="assets/writing-dna.jpg" alt="Writing DNA: editorial typography and a terminal interface" width="100%"><br><strong>Writing DNA</strong><br>Editorial type meets a working interface.</td>
<td width="50%"><img src="assets/less-ai-tone.jpg" alt="Less AI Tone: phrases crossed out and rewritten" width="100%"><br><strong>Less AI Tone</strong><br>Words become the action: cut, replace, refine.</td>
</tr>
</table>

All four appear in the [full showreel](assets/showreel.mp4). These are examples of the production workflow; this repository also includes a separate runnable starter, but not the full projects used to render those four films.

## How a film comes together

![Film structure: Hook → Ask → Work → Proof → Handoff → Close](assets/workflow-en.svg)

Start with what the audience needs to understand. Give each point a slot, fill it with a product interaction or a motion idea, then connect the slots through camera movement and rhythm.

| Layer | What it contributes |
| --- | --- |
| Story | A hook, a task, visible work, proof, a handoff and a closing moment. Roles can repeat or change order. |
| Product | The interface, content and interactions that make this film specific to the product. |
| Motion | Shared objects, camera moves, cursor actions and transitions that connect the scenes. |
| Rhythm | Beat-aware timing, fast and slow passages, and enough time to read the ending. |

The full workflow is **outline → storyboard → configure → preview → check → render → sound**. It uses a single film configuration to coordinate slots, camera and cursors. Structural checks and rendered-film checks help catch missing content, blank frames, freezes and pacing problems.

## Start with a film you can run

The repository includes a **runnable, editable video project**. Its 12-second Acme Notes example is a fictional product film with camera movement, typing, a growing result card, a word reel and a closing lockup. The source for this example is included.

[![Runnable Acme Notes starter example](assets/starter-example.gif)](assets/starter-example.mp4)

**[▶ Watch the actual starter render · 12 seconds, silent](assets/starter-example.mp4)**

### Quick start

Install Node.js 22 or newer. After downloading the repository, run from its root:

```bash
cd starter
npm ci
npm run check
npm run studio
```

Open the local address printed in the terminal. In a second terminal, from the `starter` folder, render the final video:

```bash
npm run render
```

The output is `starter/out/film.mp4`: **1080p, 30 fps, H.264, with motion blur enabled**. Use `npm run preview` for a faster half-size preview. See the [starter guide](starter/README.md) for the complete workflow.

### Make it yours

| What you want to change | Start here |
| --- | --- |
| Product name, copy and colors | `starter/src/content.ts` |
| Beat grid and scene timing | `starter/src/film.ts` |
| Product interface and interactions | `starter/src/Video.tsx` |
| Camera, typography and spring animation | `starter/src/kit/` |
| Work with a coding assistant | Read [SKILL.md](SKILL.md) |

The example is silent by default. You can add your own licensed music; Chinese text also needs an appropriate font. Timeline checks do not replace visual review: inspect readability and scene handoffs after changing the content. Sound, storyboarding and product assets still determine the finished quality.

### Included

```text
SKILL.md               Starter production guide for coding assistants
starter/               Runnable Remotion project and Acme Notes example
  src/content.ts       Product content and colors
  src/film.ts          Timeline, beat grid and events
  src/kit/             Camera, springs, transitions, type and UI helpers
lens/index.html        64 animated motion references
assets/                Showreel, starter render and README visuals
LICENSE.md             Project code license
USAGE.md               Scope and commercial licensing
```

This release includes the code needed to produce the standalone starter example. Full case-study projects, the complete motion and fragment libraries, automated capture, rendered-film verification and advanced audio mixing are not included. You can extend the starter with your own scenes. The main showreel demonstrates the full production workflow; changing a product name alone will not reproduce those films.

## Noncommercial use & commercial licensing

The Lens demonstration code, starter project and production guide are available under the **[PolyForm Noncommercial License 1.0.0](LICENSE.md)**. Personal learning, experimentation and other permitted noncommercial uses are welcome. Commercial use outside that license requires a separate written agreement with the project maintainer.

The showreel and images are provided for viewing and reference. The software license does not grant reuse rights to the music, fonts, product branding or other third-party material shown in them. See [usage and licensing](USAGE.md) for the scope.

For commercial production, client work or integration into a paid product or service, contact **[larashero3@gmail.com](mailto:larashero3@gmail.com)** to discuss authorization.

This project is described as a **noncommercial public preview / source-available release**, rather than OSI open source: the [Open Source Definition](https://opensource.org/osd) requires permission for commercial use.
