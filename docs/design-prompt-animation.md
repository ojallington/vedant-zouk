# Claude Design prompt — Brazilian Zouk in Noir Gold, 32 s

Technique: each dancer is a single ribbon of light tracing the spine (crown to hip), the follower's crown fraying into hair strands, both leaving a fading long-exposure trail — Zouk lives in the spine and the head-path, and that is the one thing a browser can draw beautifully where an articulated body would be uncanny. It is also a direct descendant of the poster's gold trails, so it reads as the site's hero come to life.
Vocabulary corrected against Zouk sources: the hair whip non-dancers recognise is *bate cabelo*; *chicote* is the sharper head accent on 1 or 5 — the prompt uses both. Basic timing is slow-quick-quick (steps on 1, 3, 4 / 5, 7, 8).
The one risk: two ribbons may fail to read as two people in the first second; the connection line between the hands, the floor pool and the caption are there to carry that, and the poster frame must be checked for it before anything else.

```
Build a silent, looping 32-second animation in HTML/CSS/JS: ten shots showcasing the signature moves of Brazilian Zouk, in the visual system of https://ojallington.github.io/vedant-zouk/01-noir-gold/ (warm charcoal, champagne light, cinematic dance-film poster). 16:9 stage, fluid width, 1200×675 reference.

TECHNIQUE — commit to this, do not draw bodies.
Each dancer is one continuous ribbon of light tracing the spine from crown to hip, drawn as a smooth bezier band; a small ellipse for the head, a faint short cross-stroke for the shoulders, nothing below the hip. The follower's crown frays into 5–7 thin hair strands that lag the head by a quarter-beat. A single 0.7px line joins the two ribbons where the hands would be — the connection. Every ribbon leaves a long-exposure trail that decays over two counts, so each move is seen as its path, not its pose. Reason: Zouk is a dance of spines and head-paths, and a browser can draw a ribbon perfectly where an articulated figure would be uncanny — and the ribbons are the poster's gold trails come to life.
Leader: #c9a66b, 6px, calmer and more upright throughout. Follower: #e6cfa6, 4px, tip of the crown #f2e4c8. Trail gradient as the site's: #d9b98a → #e8d2ab → #c9a66b, fading to 0. The pair stand in a floor pool: an ellipse of the site's spot light, radial-gradient rgba(222,186,130,.17) → 0 at 72%, which tightens, widens and slides with the movement. Grain overlay at 4.5% opacity over everything. Ground #141110, never pure black; no bloom, no neon.

MUSIC GRID — there is no audio; this is the clock.
90 BPM, 4/4: beat 667 ms, one 8-count 5.33 s, six 8-counts = 32.0 s. The basic is slow-quick-quick: weight lands on 1, 3, 4 and 5, 7, 8. Nothing else pulses on the beat. Cuts land only on count 1 or 5. The trail of the outgoing shot lingers one count into the incoming one, so the eye is carried across every cut; one hard cut in the whole piece, placed on purpose.

SHOT LIST (phrase · counts · time)
1. Cambré — P1, 1–8, 0:00–5.33. Poster frame. Mid shot. The follower's ribbon is a deep backward arc, hip anchored, crown near the floor pool's edge; the leader's ribbon upright and slightly over her, connection line short. Held for counts 1–4 while a champagne rake (the site's heading sweep gradient, #e6cfa6 → #f2e4c8 → #fff8ea) crosses her spine once. On 5–8 she recovers from the hip upward, head last. Exit: the pool widens.
2. Lateral — P2, 1–4, 5.33–8.0. Wide. The pair slide side by side across the floor: 1 slow, 3–4 quick, 5 slow, 7–8 quick. Ribbons vertical, trails horizontal and thin. This is the step everything returns to; keep it plain.
3. Ondulação — P2, 5–8, 8.0–10.67. Close on the follower. A single wave travels hip → head across the four counts; the trail shows the S. No cut: the pool irises in.
4. Elástico — P3, 1–4, 10.67–13.33. Wide. On 1 the pair stretch apart and the connection line goes taut and thins to 0.4px; on 3 it recoils and they draw together; 4 settles. Ribbons lean into the stretch, not the legs.
5. Boneca — P3, 5–8, 13.33–16.0. Mid. The follower turns under the held hand, head tipped opposite to the shoulder line, hair strands drifting behind. Leader still. Soft dissolve out.
6. Travelling tilted turn (spiral) — P4, 1–8, 16.0–21.33. The one unbroken take. The follower's ribbon tilts ~25° off vertical and rotates around an axis that drifts left to right across the stage for the full 8-count, laying down a helix trail; the leader orbits her at the same tilt. The pool follows the axis.
7. Chicote — P5, 1–4, 21.33–24.0. The hard cut, on 1. Tight on head and hair. The head accents on 1, the strands lash a 180° arc, the trail flares to #f2e4c8 for one frame and decays over 2–4. Then stillness.
8. Counter-balance — P5, 5–8, 24.0–26.67. Wide. Both ribbons lean away from each other, held only by the connection line; the pool stretches to a narrow ellipse between them. Nothing moves except the trail settling.
9. Bate cabelo into lateral — P6, 1–4, 26.67–29.33. Mid. On 1–2 the follower's hair traces a figure-eight (the whip non-dancers recognise), the head stays soft; on 3–4 the pair are already back in the travelling basic.
10. Sink to cambré — P6, 5–8, 29.33–32.0. Same framing as shot 1. She arcs back over 5–8 and arrives at the exact poster frame on the loop's count 1. Seamless loop; no fade to black.

CAPTIONS
Each shot carries a bottom-left caption: an eyebrow in Jost 500, 0.72rem, 0.24em tracking, uppercase, #c9a66b (e.g. "Counts 1–4"), then the move name in Cormorant Garamond 300 italic, #e6cfa6. Captions crossfade with the light, never slide. Shot 1 also carries the title as on the site: "Brazilian" in Cormorant Garamond, "Zouk" in Style Script — the only use of the script face.

PLAYBACK
Autoplays, silent, loops. The first painted frame is shot 1's held cambré with trails fully drawn and the title in place; it must work as a still poster. prefers-reduced-motion: render that poster frame only, static, with the ten move names listed as a caption row in Jost, and a small "Play" button (#c9a66b outline) that opts in. Load fonts from Google Fonts with Garamond / Futura / cursive fallbacks.

NON-GOALS
No jointed stick figures, rotoscoped photos or 3D bodies. No neon, bloom, lens flare or particle bursts. No pulsing, strobing or camera shake on the beat. Nothing bouncy or acrobatic — the dance is weighted and continuous. No colours outside the palette above; no pink, red or blue. No typewriter text. No music, no metronome.
```
