#!/usr/bin/env python3
"""Count tofu boxes (the empty-rectangle glyph of a missing font) in screenshots (add-on 0072-add58 §2).

    python3 web/scripts/tofu-count.py [--boxes] shot.png [more.png ...]   ->  one line per file: "<count>\t<path>"
    (with --boxes, each box's x0,y0,x1,y1 after it), then the total
    exit status: 0 when every file has none, 1 otherwise.

A tofu box is what WebKit draws from the LastResort font when no font in the stack has the letter: a hollow rectangle
about the height of a glyph with a small mark (a «?») inside. The script finds it by shape, with no font and no
reference image: the pixels that stand out from their surroundings (darker or lighter than the local mean, both
polarities, for dark text on light ground and light text on a dark button) are grouped into connected parts, and a
part counts when it is a closed thin frame of glyph size (all four sides drawn along their length, nothing of the
frame inside it) with a separate small mark in its middle. Standard library only (zlib PNG reader), 8-bit RGB/RGBA
non-interlaced PNGs, as `xcrun simctl io screenshot` and Playwright write them.
"""
import struct
import sys
import zlib
from array import array

WIN = 20  # half-window of the local mean (px)
DIFF = 38  # how far from the local mean a pixel must be to count as ink (0-255 luminance)
MIN_SIDE, MAX_SIDE = 14, 120  # a box's height and width at 2x-3x screenshots


def read_png(path):
    data = open(path, 'rb').read()
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError(f'{path}: not a PNG')
    pos, idat, w = 8, [], 0
    while pos < len(data):
        n, kind = struct.unpack('>I4s', data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + n]
        if kind == b'IHDR':
            w, h, depth, ctype, _, _, interlace = struct.unpack('>IIBBBBB', body)
            if depth != 8 or ctype not in (2, 6) or interlace:
                raise ValueError(f'{path}: only 8-bit RGB/RGBA non-interlaced PNGs')
            bpp = 3 if ctype == 2 else 4
        elif kind == b'IDAT':
            idat.append(body)
        pos += 12 + n
    raw = zlib.decompress(b''.join(idat))
    stride = w * bpp
    lum = array('B', bytes(w * h))
    prev = bytearray(stride)
    i = 0
    for y in range(h):
        f = raw[i]
        line = bytearray(raw[i + 1:i + 1 + stride])
        i += 1 + stride
        if f == 1:
            for x in range(bpp, stride):
                line[x] = (line[x] + line[x - bpp]) & 255
        elif f == 2:
            for x in range(stride):
                line[x] = (line[x] + prev[x]) & 255
        elif f == 3:
            for x in range(stride):
                left = line[x - bpp] if x >= bpp else 0
                line[x] = (line[x] + ((left + prev[x]) >> 1)) & 255
        elif f == 4:
            for x in range(stride):
                a = line[x - bpp] if x >= bpp else 0
                b = prev[x]
                c = prev[x - bpp] if x >= bpp else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        r, g, bl = line[0::bpp], line[1::bpp], line[2::bpp]
        lum[y * w:(y + 1) * w] = array('B', ((77 * a + 150 * b + 29 * c) >> 8 for a, b, c in zip(r, g, bl)))
        prev = line
    return w, h, lum


def ink_masks(w, h, lum):
    """Two masks: pixels darker, and pixels lighter, than the mean of the (2*WIN+1)^2 square around them."""
    W1 = w + 1
    integ = array('q', bytes(8 * W1 * (h + 1)))
    for y in range(h):
        run = 0
        row, base, up = y * w, (y + 1) * W1, y * W1
        for x in range(w):
            run += lum[row + x]
            integ[base + x + 1] = integ[up + x + 1] + run
    dark, light = bytearray(w * h), bytearray(w * h)
    for y in range(h):
        y0, y1 = max(0, y - WIN), min(h, y + WIN + 1)
        r0, r1 = y0 * W1, y1 * W1
        row = y * w
        for x in range(w):
            x0, x1 = max(0, x - WIN), min(w, x + WIN + 1)
            s = integ[r1 + x1] - integ[r0 + x1] - integ[r1 + x0] + integ[r0 + x0]
            m = s / ((y1 - y0) * (x1 - x0))
            v = lum[row + x]
            if v < m - DIFF:
                dark[row + x] = 1
            elif v > m + DIFF:
                light[row + x] = 1
    return dark, light


def parts(w, h, mask):
    """Connected parts (8-neighbour) of a mask: (x0, y0, x1, y1, pixels) for each, with a label image."""
    label = array('i', bytes(4 * w * h))
    out = []
    for start in range(w * h):
        if not mask[start] or label[start]:
            continue
        n = len(out) + 1
        label[start] = n
        stack, pix = [start], []
        x0 = y0 = 1 << 30
        x1 = y1 = -1
        while stack:
            p = stack.pop()
            pix.append(p)
            y, x = divmod(p, w)
            x0, x1, y0, y1 = min(x0, x), max(x1, x), min(y0, y), max(y1, y)
            for dy in (-1, 0, 1):
                yy = y + dy
                if yy < 0 or yy >= h:
                    continue
                for dx in (-1, 0, 1):
                    xx = x + dx
                    if 0 <= xx < w:
                        q = yy * w + xx
                        if mask[q] and not label[q]:
                            label[q] = n
                            stack.append(q)
        out.append((x0, y0, x1, y1, pix))
    return out, label


def is_box(w, mask, label, n, x0, y0, x1, y1):
    bw, bh = x1 - x0 + 1, y1 - y0 + 1
    if not (MIN_SIDE <= bh <= MAX_SIDE and MIN_SIDE * 0.7 <= bw <= MAX_SIDE) or not (0.5 <= bw / bh <= 1.4):
        return False
    band = max(2, round(min(bw, bh) * 0.12))

    def covered(xs, ys):  # every position along the middle of a side has frame pixels within the band
        return all(any(label[yy * w + xx] == n for yy, xx in ys(t)) for t in xs)

    mx = range(x0 + bw // 6, x1 - bw // 6 + 1)
    my = range(y0 + bh // 6, y1 - bh // 6 + 1)
    if not covered(mx, lambda t: [(y0 + k, t) for k in range(band)]):
        return False
    if not covered(mx, lambda t: [(y1 - k, t) for k in range(band)]):
        return False
    if not covered(my, lambda t: [(t, x0 + k) for k in range(band)]):
        return False
    if not covered(my, lambda t: [(t, x1 - k) for k in range(band)]):
        return False
    # Inside: none of the frame itself (a filled shape or a letter is not a frame), and a separate small mark.
    ix0, ix1, iy0, iy1 = x0 + band + 1, x1 - band - 1, y0 + band + 1, y1 - band - 1
    if ix1 <= ix0 or iy1 <= iy0:
        return False
    area = (ix1 - ix0 + 1) * (iy1 - iy0 + 1)
    own = other = 0
    for yy in range(iy0, iy1 + 1):
        for xx in range(ix0, ix1 + 1):
            q = yy * w + xx
            if label[q] == n:
                own += 1
            elif mask[q]:
                other += 1
    return own <= area * 0.02 and area * 0.02 <= other <= area * 0.45


def boxes(path):
    w, h, lum = read_png(path)
    out = []
    for mask in ink_masks(w, h, lum):
        found, label = parts(w, h, mask)
        for n, (x0, y0, x1, y1, pix) in enumerate(found, 1):
            if len(pix) >= 2 * MIN_SIDE and is_box(w, mask, label, n, x0, y0, x1, y1):
                out.append((x0, y0, x1, y1))
    return out


def main(paths):
    show = '--boxes' in paths  # also print each box's bounds (x0,y0,x1,y1)
    paths = [p for p in paths if p != '--boxes']
    if not paths:
        print(__doc__.strip().splitlines()[2].strip())
        return 2
    grand = 0
    for p in paths:
        found = boxes(p)
        grand += len(found)
        print(f'{len(found)}\t{p}' + (''.join(f'\t{b}' for b in found) if show else ''), flush=True)
    print(f'{grand}\ttotal ({len(paths)} files)')
    return 0 if grand == 0 else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
