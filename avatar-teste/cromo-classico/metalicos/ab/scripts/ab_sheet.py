#!/usr/bin/env python3
"""A/B sheet for the metallic items: final deterministic pass (pixel grid + fixed palette) on every result
and a side-by-side sheet with times and peak VRAM. Output: metal/ab/."""

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from ab_metal import ITEMS, SEEDS, MET, PREP, JOBS, APP, OX, BG

OUT = MET / 'ab'


def cromo_palette():
    """32 colours of the Cromo classico layers (skin tone 4, kit), median cut."""
    px = []
    for f in ['bases/m-pele-4.webp', 'kit/m-camisola.webp', 'kit/m-calcoes.webp', 'kit/meias.webp',
              'kit/chuteiras.webp', 'cabelo/m-penteado-para-tras-castanho-escuro.webp']:
        a = np.asarray(Image.open(APP / f).convert('RGBA'))
        px.append(a[a[..., 3] > 200][:, :3])
    px = np.concatenate(px)
    img = Image.fromarray(px[np.random.default_rng(0).choice(len(px), 60000)].reshape(200, 300, 3))
    return np.asarray(img.quantize(32, method=Image.MEDIANCUT).getpalette()[:96]).reshape(32, 3)


def metal_palette(key, n=16):
    """The item's own colours only (black, dark greys, champagne gold), from its HD: no skin, no blue."""
    hd = np.asarray(Image.open(PREP / f'{key}-hd.png').convert('RGB'))
    fg = hd[np.abs(hd.astype(int) - BG).max(axis=2) > 18]
    img = Image.fromarray(fg[np.random.default_rng(1).choice(len(fg), 40000)].reshape(200, 200, 3))
    pal = np.asarray(img.quantize(n, method=Image.MEDIANCUT).getpalette()[:n * 3]).reshape(n, 3)
    return np.concatenate([pal, [[12, 10, 10]]])  # plus a near-black for the pixel-art outline


def quantize(rgb, pal):
    d = ((rgb[..., None, :].astype(int) - pal[None, None].astype(int)) ** 2).sum(-1)
    return pal[d.argmin(-1)].astype(np.uint8)


def icon(tag, pal):
    from fem_build import background
    im = np.asarray(Image.open(JOBS / f'{tag}.png').convert('RGB'))
    # Background cut by flood fill from the borders, with the generated background's own tone.
    fg = ~background(im.astype(float), tol=26)
    ys, xs = np.where(fg)
    side = max(ys.max() - ys.min(), xs.max() - xs.min()) + 16
    cy, cx = (ys.max() + ys.min()) // 2, (xs.max() + xs.min()) // 2
    box = (cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2)
    small = np.asarray(Image.fromarray(im).crop(box).resize((128, 128), Image.BOX))
    fgs = np.asarray(Image.fromarray((fg * 255).astype(np.uint8)).crop(box).resize((128, 128), Image.BOX)) > 127
    q = quantize(small, pal)
    alpha = np.where(fgs, 255, 0).astype(np.uint8)
    return Image.fromarray(np.dstack([q, alpha]), 'RGBA')


def worn(tag, key, pal):
    it = ITEMS[key]
    x0, y0, x1, y1 = it['crop']
    res = Image.open(JOBS / f'{tag}.png').convert('RGB')
    res = np.asarray(res.resize((x1 - x0, y1 - y0), Image.BOX))
    mask = np.asarray(Image.open(PREP / f'{key}-mascara-2x.png').convert('L').resize((x1 - x0, y1 - y0), Image.NEAREST)) > 127
    base = np.asarray(Image.open(PREP / f'{key}-corpo-2x.png').convert('RGB').resize((x1 - x0, y1 - y0), Image.NEAREST))
    changed = np.abs(res.astype(int) - base.astype(int)).max(axis=2) > 12
    q = quantize(res, pal)
    from var_skin import skinlike
    # Skin redrawn inside the mask (neck, arms) is not fabric: leave it to the base, in its own tone.
    alpha = np.where(mask & changed & ~skinlike(res), 255, 0).astype(np.uint8)
    layer = np.zeros((1024, 512, 4), np.uint8)
    layer[y0:y1, OX + x0:OX + x1] = np.dstack([q, alpha])
    return layer


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    times = json.loads((MET / 'ab-tempos.json').read_text())
    cromo = cromo_palette()
    base = Image.open(APP / 'bases' / 'm-pele-4.webp').convert('RGBA')
    kit = {k: Image.open(APP / 'kit' / f).convert('RGBA') for k, f in
           [('meias', 'meias.webp'), ('chuteiras', 'chuteiras.webp'), ('calcoes', 'm-calcoes.webp'), ('camisola', 'm-camisola.webp')]}
    cols = ['HD (referência)'] + [f'{m} seed {s}' for m in ('klein', 'kontext') for s in SEEDS]
    cell = 300
    rows = sum(2 if it['crop'] else 1 for it in ITEMS.values())
    sheet = Image.new('RGB', (10 + len(cols) * (cell + 10), 40 + rows * (cell + 50)), (40, 40, 40))
    d = ImageDraw.Draw(sheet)
    for c, name in enumerate(cols):
        d.text((14 + c * (cell + 10), 10), name, fill=(255, 230, 160))
    row = 0
    for key, it in ITEMS.items():
        pal = metal_palette(key)
        for kind in (['icone', 'vestido'] if it['crop'] else ['icone']):
            y = 40 + row * (cell + 50)
            hd = Image.open(PREP / f'{key}-hd.png').resize((cell, cell), Image.LANCZOS)
            sheet.paste(hd, (10, y))
            d.text((14, y + cell + 4), f'{key} · {kind}', fill=(255, 230, 160))
            for c, (m, s) in enumerate([(m, s) for m in ('klein', 'kontext') for s in SEEDS], start=1):
                tag = f'{m}-{key}-{kind}-{s}'
                x = 10 + c * (cell + 10)
                if not (JOBS / f'{tag}.png').exists():
                    d.text((x + 4, y + 4), 'sem resultado', fill=(255, 120, 120))
                    continue
                if kind == 'icone':
                    ic = icon(tag, pal)
                    ic.save(OUT / f'{tag}.png')
                    show = Image.new('RGB', (128, 128), BG)
                    show.paste(ic, (0, 0), ic)
                    sheet.paste(show.resize((cell - 44, cell - 44), Image.NEAREST), (x + 22, y + 22))
                else:
                    layer = worn(tag, key, pal)
                    Image.fromarray(layer, 'RGBA').save(OUT / f'{tag}.png')
                    fig = base.copy()
                    order = ['meias', 'calcoes', 'camisola'] if it['slot'] == 'camisola' else ['meias', 'calcoes', 'camisola']
                    for k in order:
                        if k != it['slot']:
                            fig.alpha_composite(kit[k])
                    fig.alpha_composite(Image.fromarray(layer, 'RGBA'))
                    flatfig = Image.new('RGB', fig.size, BG)
                    flatfig.paste(fig, (0, 0), fig)
                    x0, y0, x1, y1 = it['crop']
                    crop = flatfig.crop((OX + x0, y0, OX + x1, y1))
                    crop.thumbnail((cell, cell), Image.NEAREST)
                    sheet.paste(crop, (x + (cell - crop.width) // 2, y + (cell - crop.height) // 2))
                t = times.get(tag, {})
                d.text((x + 4, y + cell + 4), f"{t.get('segundos', '?')} s · VRAM {t.get('vram_pico_gb', '?')} GB",
                       fill=(200, 220, 255))
            row += 1
    sheet.save(OUT / 'folha-ab.png', optimize=True)
    summary = {}
    for m in ('klein', 'kontext'):
        v = [t for k, t in times.items() if k.startswith(m + '-')]
        if v:
            summary[m] = {'trabalhos': len(v), 'media_segundos': round(sum(t['segundos'] for t in v) / len(v), 1),
                          'vram_pico_gb': max(t['vram_pico_gb'] for t in v)}
    (OUT / 'resumo.json').write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary))


if __name__ == '__main__':
    main()
