"""Generate the Open Graph card from the site's own glass palette.

Values are lifted straight from styles.css so the preview card and the page
cannot drift apart: same base colour, same four gradient blobs, same card
material, same text colours (the AA-checked ones).
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os, sys

W, H = 1200, 630
FONTS = os.path.join(os.environ["WINDIR"], "Fonts")
bold = lambda s: ImageFont.truetype(os.path.join(FONTS, "segoeuib.ttf"), s)
semi = lambda s: ImageFont.truetype(os.path.join(FONTS, "seguisb.ttf"), s)
reg  = lambda s: ImageFont.truetype(os.path.join(FONTS, "segoeui.ttf"), s)

BASE = (234, 238, 251)                      # --bg
BLOBS = [                                   # .backdrop, light mode
    ((0.12, -0.08), (0.725, 1.066), (120, 155, 255), 0.55),
    ((0.88,  0.06), (0.600, 0.965), (197, 148, 255), 0.45),
    ((0.72,  0.92), (0.650, 1.117), (255, 173, 190), 0.40),
    ((0.22,  0.78), (0.550, 0.914), (129, 226, 226), 0.38),
]
TEXT      = (26, 31, 46)                    # --text
SECONDARY = (54, 61, 82)                    # --text-secondary
TERTIARY  = (74, 79, 96)                    # --text-tertiary

x = np.linspace(0, 1, W)[None, :]
y = np.linspace(0, 1, H)[:, None]
canvas = np.zeros((H, W, 3), float) + np.array(BASE, float)

for (cx, cy), (rx, ry), colour, alpha in BLOBS:
    d = np.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2)
    # CSS fades to transparent at 62% of the radius.
    a = np.clip(1.0 - d / 0.62, 0.0, 1.0)[:, :, None] * alpha
    canvas = canvas * (1 - a) + np.array(colour, float) * a

img = Image.fromarray(np.clip(canvas, 0, 255).astype("uint8"), "RGB").convert("RGBA")

# The glass card: --material over the field, with the --specular top edge.
card = Image.new("RGBA", (W, H), (0, 0, 0, 0))
cd = ImageDraw.Draw(card)
box = (72, 96, W - 72, H - 96)
cd.rounded_rectangle(box, radius=34, fill=(255, 255, 255, 108))
cd.rounded_rectangle(box, radius=34, outline=(255, 255, 255, 230), width=2)
cd.line((box[0] + 34, box[1] + 2, box[2] - 34, box[1] + 2), fill=(255, 255, 255, 242), width=2)
img = Image.alpha_composite(img, card)

d = ImageDraw.Draw(img)

def tracked(xy, text, font, fill, tracking=0.0):
    """PIL has no letter-spacing; the site's tracking is size-specific and
    the display type needs its negative value or it reads as loose."""
    px, py = xy
    for ch in text:
        d.text((px, py), ch, font=font, fill=fill)
        px += d.textlength(ch, font=font) + tracking
    return px

L, T = box[0] + 62, box[1] + 52
tracked((L, T), "LONDON, UK", semi(19), TERTIARY, 2.6)
tracked((L, T + 50), "Kang Ji", bold(112), TEXT, -4.4)
d.text((L, T + 204), "BSc Data Science at UCL, on track for a First.", font=semi(31), fill=SECONDARY)
d.text((L, T + 250), "Data pipelines, machine learning systems and privacy engineering.",
       font=reg(28), fill=SECONDARY)

# Footer row: the three headline facts, matching the hero. Positions come
# from measured widths — fixed columns collided at the first caption.
fy = box[3] - 76
ffig, fcap, GAP = bold(40), reg(21), 46
fx = L
for figure, caption in [("1st", "NVIDIA hackathon"),
                        ("81%", "weighted average"),
                        ("3",   "internships")]:
    d.text((fx, fy), figure, font=ffig, fill=TEXT)
    fx += d.textlength(figure, font=ffig) + 12
    d.text((fx, fy + 16), caption, font=fcap, fill=TERTIARY)
    fx += d.textlength(caption, font=fcap) + GAP

out = sys.argv[1]
img.convert("RGB").save(out, "PNG", optimize=True)
print(out, os.path.getsize(out), "bytes", img.size)
