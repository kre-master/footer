#!/usr/bin/env python3
"""Hair as a layer over the shaved base, and hair colours without AI (luminance on a colour ramp)."""

import numpy as np
from PIL import Image, ImageFilter

# shadow, mid, highlight
COLOURS = {
    'preto': ((10, 9, 10), (38, 33, 32), (86, 78, 76)),
    'castanho-escuro': ((24, 15, 11), (64, 40, 28), (122, 86, 62)),
    'castanho': ((42, 25, 15), (106, 66, 38), (170, 120, 76)),
    'ruivo': ((66, 22, 10), (156, 66, 28), (224, 128, 66)),
    'loiro': ((104, 74, 36), (198, 156, 86), (246, 222, 160)),
    'grisalho': ((54, 54, 58), (136, 136, 140), (214, 214, 216)),
}


def _morph(m, f):
    return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(f)) > 127


def hair_layer(result, base, mask, face):
    """Pixels inside the hairstyle mask where the result differs clearly from the shaved base,
    cleaned of isolated specks; never on the face box. result/base: RGB arrays, same grid."""
    from var_skin import skinlike
    diff = np.abs(result.astype(int) - base.astype(int)).max(axis=-1) > 35
    # Skin that changed (ears, neck redrawn) is not hair: hair here is dark, skin is lighter.
    light_skin = skinlike(result) & (result.astype(int).mean(axis=-1) > 95)
    # White blobs (earring-like specks) are not hair either; grey/blond come from the recolouring.
    rgbi = result.astype(int)
    light_skin |= (rgbi.min(axis=-1) > 170) & (rgbi.max(axis=-1) - rgbi.min(axis=-1) < 60)
    m = mask & diff & ~face & ~light_skin
    m = _morph(_morph(m, ImageFilter.MinFilter(3)), ImageFilter.MaxFilter(3)) & mask & diff & ~face & ~light_skin
    m = _morph(_morph(m, ImageFilter.MaxFilter(3)), ImageFilter.MinFilter(3)) & mask & ~face & ~light_skin
    # Fill the holes left by the removed white blobs (enclosed by hair) from the neighbouring hair.
    rgbi = result.astype(int)
    white = (rgbi.min(axis=-1) > 170) & (rgbi.max(axis=-1) - rgbi.min(axis=-1) < 60)
    closed = _morph(_morph(m, ImageFilter.MaxFilter(11)), ImageFilter.MinFilter(11))
    holes = closed & ~m & mask & ~face & _morph(white, ImageFilter.MaxFilter(3))
    # Background gaps enclosed by hair (beside the jaw, where the face box kept the model out).
    bg_base = np.abs(base.astype(int) - [0xE9, 0xDC, 0xC3]).max(axis=-1) < 8
    # Border = the face's own outline (opaque pixels inside the box), not the whole box.
    hugged = _morph(_morph(m | (face & ~bg_base), ImageFilter.MaxFilter(13)), ImageFilter.MinFilter(13))
    holes |= hugged & ~m & bg_base
    # Filled with the hair's own shadow tone (the hair behind the jaw is in shade).
    col = np.where(m[..., None], result, 0).astype(float)
    have = m.copy()
    if m.any() and holes.any():
        lum = result.astype(float) @ [0.299, 0.587, 0.114]
        shade = np.percentile(result[m & (lum >= 9)].reshape(-1, 3), 15, axis=0) if (m & (lum >= 9)).any() else result[m][0]
        col[holes] = shade
        have |= holes
    m = m | (holes & have)
    out = np.zeros(result.shape[:2] + (4,), np.uint8)
    out[m, :3] = np.clip(col[m], 0, 255).astype(np.uint8)
    out[m, 3] = 255
    return out


def recolour(layer, colour, outline=9):
    """outline: luminance below which pixels stay as they are (0 for beards, which are mostly black)."""
    out = layer.copy()
    a = out[..., 3] > 0
    rgb = out[..., :3].astype(float)
    lum = rgb @ [0.299, 0.587, 0.114]
    sel = a & (lum >= outline)  # only the near-black outline stays as it is
    if not sel.any():
        return out
    p5, p50, p95 = np.percentile(lum[sel], [5, 50, 95])
    sh, mid, hi = (np.array(c, float) for c in COLOURS[colour])
    l = lum[sel]
    lo = np.clip((l - p5) / max(p50 - p5, 1), 0, 1)[:, None]
    up = np.clip((l - p50) / max(p95 - p50, 1), 0, 1.2)[:, None]
    col = np.where((l < p50)[:, None], sh + lo * (mid - sh), mid + up * (hi - mid))
    out[sel, :3] = np.clip(col, 0, 255).astype(np.uint8)
    return out
