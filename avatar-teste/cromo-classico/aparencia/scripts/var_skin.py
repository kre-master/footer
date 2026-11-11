#!/usr/bin/env python3
"""Skin tones without AI: skin mask per mannequin and a luminance remap onto a skin ramp per tone.
Kit layers lose their skin pixels so the mannequin's (remapped) skin shows through."""

import numpy as np

# Tone 4 is the current skin, left untouched. Each ramp: shadow, mid, highlight.
TONES = {
    1: ((214, 160, 130), (246, 214, 190), (255, 238, 222)),
    2: ((196, 136, 100), (236, 190, 150), (252, 220, 188)),
    3: ((180, 104, 58), (226, 156, 100), (246, 196, 146)),
    4: None,
    5: ((108, 56, 28), (162, 94, 52), (204, 132, 84)),
    6: ((60, 36, 22), (100, 62, 40), (142, 96, 68)),
}


def skinlike(rgb):
    """Skin hue: warm (R > G > B), not white/cream (G/R low), not the gold stripes, not outlines."""
    rgb = rgb.astype(int)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = rgb.mean(axis=-1)
    return (r - b >= 40) & (g - b >= 12) & (g <= 0.72 * r) & (lum > 45) & (lum < 245)


def skin_mask(px, head=None, exclude=None):
    """head: (x0, y0, x1, y1) box where dark pixels (eyebrows, moustache, stubble) stay as they are."""
    m = (px[..., 3] > 127) & skinlike(px[..., :3])
    if head is not None:
        x0, y0, x1, y1 = head
        dark = px[..., :3].astype(int).mean(axis=-1) < 60
        m[y0:y1, x0:x1] &= ~dark[y0:y1, x0:x1]
    if exclude is not None:
        m &= ~exclude
    return m


def remap(px, mask, tone, stats=None):
    """Luminance of each skin pixel placed on the tone's ramp: p5 -> shadow, p50 -> mid, p95 -> highlight.
    stats: (p5, p50, p95) fixed from another image, so two versions of a base map identically."""
    out = px.copy()
    if TONES[tone] is None:
        return out
    rgb = px[..., :3].astype(float)
    lum = rgb @ [0.299, 0.587, 0.114]
    p5, p50, p95 = stats if stats is not None else np.percentile(lum[mask], [5, 50, 95])
    sh, mid, hi = (np.array(c, float) for c in TONES[tone])
    l = lum[mask]
    lo = np.clip((l - p5) / max(p50 - p5, 1), -0.5, 1)[:, None]
    up = np.clip((l - p50) / max(p95 - p50, 1), 0, 1.3)[:, None]
    col = np.where((l < p50)[:, None], sh + lo * (mid - sh), mid + up * (hi - mid))
    out[mask, :3] = np.clip(col, 0, 255).astype(np.uint8)
    return out


def strip_skin(layer, keep_below=None):
    """Kit layer without skin pixels (alpha 0), so the mannequin's skin shows through.
    keep_below: rows from which nothing is stripped (the boots' brown leather and studs)."""
    out = layer.copy()
    m = (out[..., 3] > 0) & skinlike(out[..., :3])
    if keep_below is not None:
        m[keep_below:] = False
    out[m] = 0
    return out, int(m.sum())


def stats_of(px, mask):
    lum = px[..., :3].astype(float) @ [0.299, 0.587, 0.114]
    return tuple(np.percentile(lum[mask], [5, 50, 95]))
