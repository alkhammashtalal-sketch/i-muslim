# The widgets' and the name card's sky texture (add-on 0072-add53, Talal's decision of 31 October): the lapis of the
# approved welcome painting (web/public/art/welcome-B4.webp, 1320 x 2857) cut at its own resolution from the largest
# region with no star, no gold and no plant in it: the ground under the garden, inside the inner gold frame
# (x 100..1221, y 2511..2764; 1121 x 253 px). Its tone is the date card's sky's own (mean RGB 26/46/85 against 23/45/90).
# Nothing is painted over, scaled or recompressed: the output is lossless PNG, every pixel the painting's. Drawn once
# as cover (never tiled); the stars are drawn over it in code (Theme.swift SkyStars, WidgetPainter.java, SkyStars.tsx).
# Usage: python3 web/scripts/sky-lapis-cut.py web/public/art/welcome-B4.webp <out.png> [<out.png> ...]
import sys
import numpy as np
from PIL import Image

SRC, OUTS = sys.argv[1], sys.argv[2:]
B = np.asarray(Image.open(SRC).convert('RGB'))
assert B.shape[:2] == (2857, 1320), B.shape
X0, Y0, X1, Y1 = 100, 2511, 1221, 2764
cut = B[Y0:Y1, X0:X1]
# No star, gold or leaf: every pixel a dark lapis (red well under blue, nothing bright).
r, g, b = (cut[..., i].astype(int) for i in range(3))
assert (r - b < -15).all() and (r < 90).all() and (g < 100).all(), 'the cut has a non-lapis pixel'
for out in OUTS:
    Image.fromarray(cut).save(out, 'PNG', optimize=True)
    back = np.asarray(Image.open(out).convert('RGB'))
    assert np.array_equal(back, cut), 'lossless round trip failed'
    print(out, cut.shape[1], 'x', cut.shape[0])
