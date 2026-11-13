#!/usr/bin/env python3
"""Female «Cromo clássico»: layers cut by the masks, cream collar, shared socks, compositions,
male/female comparison and weights.

  post_fem.py <camisola seed> <calcoes seed>
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

import post_v2 as p

ROOT = Path(__file__).resolve().parent
FEM = ROOT / 'fem'
JOBS = FEM / 'jobs'
OUT = FEM / 'resultado-comfy-feminino'
V3 = ROOT / 'repo' / 'avatar-teste' / 'cromo-classico' / 'resultado-comfy-v3'
W, H, CW, OX = p.W, p.H, p.CW, p.OX
CREAM = np.array([0xE8, 0xD9, 0xB5])
MANNEQUIN_SEEDS = [1111202671, 1111202672, 1111202673, 1111202674]
PIECE_SEEDS = [1111202681, 1111202682, 1111202683]
ORDER = ['calcoes', 'camisola', 'meias-chuteiras']


def fmask(slot):
    return np.asarray(Image.open(FEM / f'mascara-{slot}-f.png')) > 127


def layer(slot, seed):
    """Cut by the mask: inside it, everything on the body stays (cream is close to the background
    colour, so a difference-to-background cut leaves holes); off the body, only what differs from it."""
    rgb = np.asarray(Image.open(JOBS / f'{slot}-f-{seed}.png').convert('RGB').resize((W, H), Image.BOX)).astype(int)
    man = np.asarray(Image.open(FEM / 'manequim-feminino.png').convert('RGBA')).astype(int)
    body = man[..., 3] > 0
    keep = fmask(slot) & (body | (np.abs(rgb - p.BG).max(axis=2) > 12))
    if slot == 'camisola':
        # Where jersey and shorts overlap, keep only what the jersey painted (not skin or white briefs).
        base = np.asarray(Image.open(FEM / 'prep' / 'manequim-f-flat.png').convert('RGB')).astype(int)
        unchanged = np.abs(rgb - base).max(axis=2) < 40
        bright = rgb.min(axis=2) > 170
        keep &= ~(fmask('calcoes') & (unchanged | bright))
        # Collar and cuffs in warm cream #E8D9B5, keeping light and shade (no AI).
        lum = rgb @ [0.299, 0.587, 0.114]
        sat = rgb.max(axis=2) - rgb.min(axis=2)
        sel = keep & (lum > 150) & (sat < 60)
        if sel.any():
            ref = np.percentile(lum[sel], 75)
            rgb[sel] = np.clip(CREAM * ((0.5 * ref + 0.5 * lum[sel]) / ref)[:, None], 0, 255).astype(int)
    if slot == 'calcoes':
        # Where the shorts came out slimmer than the briefs, close the gap with the dark outline.
        gap = fmask(slot) & ~keep & body & (man[..., :3].min(axis=2) > 170)
        rgb[gap] = (24, 20, 30)
        keep |= gap
    alpha = np.where(keep, 255, 0).astype(np.uint8)
    rgb[alpha == 0] = 0
    return p.wide(Image.fromarray(np.dstack([rgb.astype(np.uint8), alpha]), 'RGBA'))


def props(canvas):
    pennant = Image.open(p.SRC / 'icone-galhardete.png').convert('RGBA')
    pennant = pennant.crop(pennant.getbbox())
    pennant = pennant.resize((round(pennant.width * 110 / pennant.height), 110), Image.LANCZOS)
    ball = Image.open(p.SRC / 'icone-bola.png').convert('RGBA')
    ball = ball.crop(ball.getbbox()).resize((80, 80), Image.LANCZOS)
    return pennant, (OX + 330, 140), ball, (OX + 372, H - 100)


def compose(base, layers):
    canvas = Image.new('RGBA', (CW, H), (0, 0, 0, 0))
    pennant, ppos, ball, bpos = props(canvas)
    canvas.alpha_composite(pennant, ppos)
    canvas.alpha_composite(base)
    for slot in ORDER:
        canvas.alpha_composite(layers[slot])
    canvas.alpha_composite(ball, bpos)
    return canvas


def main(chosen):
    for sub in ['', 'camadas', 'seeds']:
        (OUT / sub).mkdir(parents=True, exist_ok=True)
    base = p.wide(Image.open(FEM / 'manequim-feminino.png').convert('RGBA'))
    socks = Image.open(FEM / 'meias-chuteiras-partilhada.png').convert('RGBA')
    layers = {'camisola': layer('camisola', chosen['camisola']), 'calcoes': layer('calcoes', chosen['calcoes']),
              'meias-chuteiras': socks}

    report = {'escolhidas': chosen, 'webp_kb': {}, 'png_kb': {}}
    for name, im in [('manequim-feminino', base)] + [(s, layers[s]) for s in ['camisola', 'calcoes']] + \
                    [('meias-chuteiras-partilhada', socks)]:
        im.save(OUT / 'camadas' / f'{name}.png', optimize=True)
        im.save(OUT / 'camadas' / f'{name}.webp', lossless=True, method=6)
        report['webp_kb'][name] = p.webp_kb(im)
        report['png_kb'][name] = p.png_kb(im)

    # Contact sheet: 4 mannequins, then 3 jerseys and 3 shorts on the chosen mannequin.
    tile = 240
    th = round(tile * H / W)
    sheet = Image.new('RGB', (10 + 4 * (tile + 10), 3 * (th + 40)), (40, 40, 40))
    draw = ImageDraw.Draw(sheet)
    rows = [('manequim', MANNEQUIN_SEEDS), ('camisola', PIECE_SEEDS), ('calcoes', PIECE_SEEDS)]
    for row, (slot, seeds) in enumerate(rows):
        for col, seed in enumerate(seeds):
            if slot == 'manequim':
                im = Image.open(JOBS / f'manequim-f-{seed}.png').convert('RGB').resize((W, H), Image.BOX)
                mark = ' (escolhida)' if seed == chosen['manequim'] else ''
            else:
                lay = layer(slot, seed)
                lay.save(OUT / 'seeds' / f'{slot}-f-{seed}.png', optimize=True)
                im = p.flat(p.on(base, lay)).crop((OX, 0, OX + W, H))
                mark = ' (escolhida)' if seed == chosen[slot] else ''
            x, y = 10 + col * (tile + 10), row * (th + 40)
            sheet.paste(im.resize((tile, th), Image.BOX), (x, y + 30))
            draw.text((x + 4, y + 10), f'{slot} {seed}{mark}', fill=(255, 230, 160))
    sheet.save(OUT / 'folha-contacto-seeds.png', optimize=True)

    canvas = compose(base, layers)
    canvas.save(OUT / 'a-composicao-completa.png', optimize=True)
    p.flat(canvas).save(OUT / 'a-composicao-completa-fundo.png', optimize=True)
    report['webp_kb']['composicao'] = p.webp_kb(canvas)
    report['png_kb']['composicao'] = p.png_kb(canvas)

    swaps = Image.new('RGB', (10 + 4 * (CW + 10), H), (40, 40, 40))
    for i, im in enumerate([base] + [p.on(base, layers[s]) for s in ['camisola', 'calcoes', 'meias-chuteiras']]):
        swaps.paste(p.flat(im), (10 + i * (CW + 10), 0))
    swaps.save(OUT / 'b-trocas.png', optimize=True)

    # Checks: outside each layer the mannequin is untouched; no white top/briefs or bare waist shows.
    proof = {}
    for slot in ORDER:
        diff = np.abs(np.asarray(p.on(base, layers[slot])).astype(int) - np.asarray(base).astype(int))
        proof[slot] = int(diff[np.asarray(layers[slot])[..., 3] == 0].max())
    report['diferenca_max_fora_da_camada'] = proof
    covered = np.zeros((H, CW), bool)
    for slot in ORDER:
        covered |= np.asarray(layers[slot])[..., 3] > 0
    px = np.asarray(base).astype(int)
    torso = np.pad(fmask('camisola') | fmask('calcoes'), ((0, 0), (OX, CW - W - OX)))
    white = (px[..., 3] > 127) & (px[..., :3].min(axis=2) > 170) & ((px[..., :3].max(axis=2) - px[..., :3].min(axis=2)) < 45)
    report['branco_do_top_ou_cuecas_a_vista_vestida'] = int((white & torso & ~covered).sum())
    report['partilha_meias'] = json.loads((FEM / 'teste-partilha-meias.json').read_text())

    half = canvas.resize((CW // 2, H // 2), Image.BOX)
    half.save(OUT / 'c-metade-256x512.png', optimize=True)
    p.flat(half).resize((CW, H), Image.NEAREST).save(OUT / 'c-metade-ampliada-2x.png', optimize=True)
    report['webp_kb']['metade'] = p.webp_kb(half)
    bust = p.flat(canvas).crop((OX + 64, 0, OX + 320, 256)).resize((128, 128), Image.BOX)
    bust.save(OUT / 'c-busto-128.png', optimize=True)
    bust.resize((512, 512), Image.NEAREST).save(OUT / 'c-busto-ampliado-4x.png', optimize=True)
    report['webp_kb']['busto'] = p.webp_kb(bust)

    # Male (v3) and female side by side: mannequins, then dressed.
    male = Image.open(V3 / 'a-composicao-completa.png').convert('RGBA')
    male_base = Image.open(V3 / 'camadas' / 'manequim-cuecas-brancas.png').convert('RGBA')
    side = Image.new('RGB', (10 + 4 * (CW + 10), H + 40), (40, 40, 40))
    draw = ImageDraw.Draw(side)
    for i, (label, im) in enumerate([('manequim masculino', male_base), ('manequim feminino', base),
                                     ('masculino vestido', male), ('feminina vestida', canvas)]):
        side.paste(p.flat(im), (10 + i * (CW + 10), 40))
        draw.text((14 + i * (CW + 10), 14), label, fill=(255, 230, 160))
    # Guide lines: head top and floor of the male figure, to check the height match.
    ma = np.asarray(male_base)[..., 3] > 127
    rows = np.where(ma.any(axis=1))[0]
    for y in (rows[0], rows[-1]):
        draw.line([(0, 40 + y), (side.width, 40 + y)], fill=(80, 160, 255), width=1)
    side.save(OUT / 'd-comparacao-masculino-feminino.png', optimize=True)
    fa = np.asarray(base)[..., 3] > 127
    frows = np.where(fa.any(axis=1))[0]
    report['altura'] = {'masculino_topo_chao': [int(rows[0]), int(rows[-1])],
                        'feminino_topo_chao': [int(frows[0]), int(frows[-1])]}

    (OUT / 'relatorio.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main({'manequim': 1111202671, 'camisola': int(sys.argv[1]), 'calcoes': int(sys.argv[2])})
