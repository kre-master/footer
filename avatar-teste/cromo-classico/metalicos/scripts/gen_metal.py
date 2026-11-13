#!/usr/bin/env python3
"""All metallic items (black + champagne gold, 6 levels) with FLUX.1 Kontext dev: pixel icons, worn layers
(512 and 256) and metalicos.json. Resumable: finished jobs are skipped.

  gen_metal.py run | build
"""

import json
import sys
import time
import urllib.parse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import ab_metal as ab
import ab_sheet as post
import run_layers as r
from fem_build import background
from var_skin import skinlike

ROOT = Path(__file__).resolve().parent
MET = ROOT / 'metal' / 'todos'
PREP = MET / 'prep'
JOBS = MET / 'jobs'
OUT = ROOT / 'repo' / 'avatar-teste' / 'cromo-classico' / 'metalicos'
CAT = ab.CAT
APP = ab.APP
BG = ab.BG
OX = 64
SEED = 1111202911
# Socks 02 and 05 came out as shorts with the default seed (the shorts reference was copied): another seed.
SEED_FOR = {'gear-socks-02': 1111202912, 'gear-socks-05': 1111202912}
LEVELS = ['01', '02', '03', '04', '05', '06']
GRADES = {'01': 'Common', '02': 'Special', '03': 'Rare', '04': 'Epic', '05': 'Legendary', '06': 'Mythic'}
SLOTS = {
    'shirts': {'label': 'football shirt', 'worn': 'sx', 'crop': (0, 130, 384, 514)},
    'shorts': {'label': 'pair of football shorts', 'worn': 'sx', 'crop': (0, 380, 384, 636)},
    'socks': {'label': 'pair of tall football socks', 'worn': 'shared', 'crop': (0, 704, 384, 1024)},
    'boots': {'label': 'pair of football boots', 'worn': 'shared', 'crop': (0, 768, 384, 1024)},
    'balls': {'label': 'football', 'worn': 'prop', 'box512': (80, 80)},
    'pennants': {'label': 'pennant', 'worn': 'prop', 'box512': (86, 110)},
}
MASKS = {
    ('shirts', 'm'): ROOT / 'v2' / 'mascara-camisola-v2.png', ('shirts', 'f'): ROOT / 'fem' / 'mascara-camisola-f.png',
    ('shorts', 'm'): ROOT / 'v2' / 'mascara-calcoes-v2.png', ('shorts', 'f'): ROOT / 'fem' / 'mascara-calcoes-f.png',
    ('socks', 'm'): ROOT / 'var' / 'prep' / 'mascara-meias-inteiras.png',
}
SOCKS_PROMPT = ('a pair of tall knee-high football socks (long tubes with a foot), not shorts, not trousers, in exactly the same design language as the reference garment: the same '
                'matte black fabric, the same champagne-gold trims, stripes and emblem, the same amount of ornament, '
                'shown as a pixel art game inventory icon, centred, front view')


def flat(im):
    return ab.flat(im)


def crop2x(img, crop):
    c = img.crop(crop)
    return c.resize((c.width * 2, c.height * 2), Image.NEAREST)


def layer384(name, sx):
    return Image.open(APP / name.format(sx=sx)).convert('RGBA').crop((OX, 0, OX + 384, 1024))


def prep_item(slot, lvl):
    key = f'gear-{slot}-{lvl}'
    PREP.mkdir(parents=True, exist_ok=True)
    hd_path = PREP / f'{key}-hd.png'
    if slot != 'socks' and not hd_path.exists():
        hd = Image.open(CAT / f'{key}.png')
        hd = hd.crop(hd.getbbox())
        hd.thumbnail((768, 768), Image.LANCZOS)
        canvas = Image.new('RGB', (768, 768), BG)
        canvas.paste(flat(hd), ((768 - hd.width) // 2, (768 - hd.height) // 2))
        canvas.save(hd_path)
    return key


def worn_inputs(slot, lvl, sx):
    """Body crop (2x) and mask crop (2x) for a worn slot."""
    it = SLOTS[slot]
    tag = f'gear-{slot}-{lvl}-{sx}'
    base = layer384('bases/{sx}-pele-4.webp', sx)
    if slot == 'shirts':
        base.alpha_composite(layer384('kit/{sx}-calcoes.webp', sx))
    if slot in ('shorts', 'boots'):
        base.alpha_composite(layer384('kit/meias.webp', sx))
    body = flat(base)
    if slot == 'boots':
        boots = np.asarray(layer384('kit/chuteiras.webp', sx))
        mask = Image.fromarray(((boots[..., 3] > 0) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))
    else:
        mask = Image.open(MASKS[(slot, sx)]).convert('L')
    body2, mask2 = crop2x(body, it['crop']), crop2x(mask, it['crop'])
    body2.save(PREP / f'{tag}-corpo-2x.png')
    mask2.save(PREP / f'{tag}-mascara-2x.png')
    return tag


def run_job(tag, graph):
    JOBS.mkdir(parents=True, exist_ok=True)
    if (JOBS / f'{tag}.png').exists():
        return json.loads((JOBS / f'{tag}.json').read_text()) if (JOBS / f'{tag}.json').exists() else {}
    (JOBS / f'{tag}.api.json').write_text(json.dumps(graph, indent=2))
    for attempt in range(3):
        try:
            pid = r.request('/prompt', payload={'prompt': graph, 'client_id': 'footer-metal'})['prompt_id']
            while True:
                rec = r.request('/history/' + pid).get(pid)
                if rec and rec.get('status', {}).get('completed') is not None:
                    break
                time.sleep(2)
            break
        except Exception as e:  # transient connection drops: retry the same job
            print('retry', tag, e, flush=True)
            time.sleep(10)
    state = rec['status']
    times = {n: d.get('timestamp') for n, d in state.get('messages', []) if isinstance(d, dict)}
    secs = (times['execution_success'] - times['execution_start']) / 1000 \
        if times.get('execution_success') and times.get('execution_start') else None
    for out in rec.get('outputs', {}).values():
        for im in out.get('images', []):
            q = urllib.parse.urlencode({k: im[k] for k in ('filename', 'subfolder', 'type')})
            (JOBS / f'{tag}.png').write_bytes(r.OPENER.open(r.BASE_URL + '/view?' + q, timeout=60).read())
    seed = next((n['inputs'].get('seed') for n in graph.values() if 'seed' in n['inputs']), SEED)
    info = {'segundos': secs, 'estado': state.get('status_str'), 'seed': seed}
    (JOBS / f'{tag}.json').write_text(json.dumps(info))
    print(tag, info, flush=True)
    return info


def run():
    blank = PREP / 'vazio-768.png'
    PREP.mkdir(parents=True, exist_ok=True)
    Image.new('RGB', (768, 768), BG).save(blank)
    for lvl in LEVELS:
        for slot in ['socks', 'shirts', 'shorts', 'boots', 'balls', 'pennants']:
            it = SLOTS[slot]
            key = prep_item(slot, lvl)
            # Icon. Socks have no HD: generated from the shorts of the same level as the design reference.
            ref = PREP / (f'gear-shorts-{lvl}-hd.png' if slot == 'socks' else f'{key}-hd.png')
            if slot == 'socks':
                prep_item('shorts', lvl)
                prompt = f'{SOCKS_PROMPT}, {ab.METAL}, {ab.PIXEL}, plain flat beige background'
                names = {'base': r.upload(blank)[0], 'item': r.upload(ref)[0]}
                g = ab.kontext(prompt, SEED_FOR.get(key, SEED), names, 768, 768, False, f'Footer/metal/{key}-icone')
            else:
                names = {'base': r.upload(blank)[0], 'item': r.upload(ref)[0]}
                g = ab.kontext(ab.prompts({'label': it['label']}, 'kontext', False), SEED, names, 768, 768, False,
                               f'Footer/metal/{key}-icone')
            run_job(f'{key}-icone', g)
            # Worn layers.
            if it['worn'] in ('sx', 'shared'):
                item_ref = JOBS / f'{key}-icone.png' if slot == 'socks' else ref
                for sx in (['m', 'f'] if it['worn'] == 'sx' else ['m']):
                    tag = worn_inputs(slot, lvl, sx)
                    files = {'base': PREP / f'{tag}-corpo-2x.png', 'mask': PREP / f'{tag}-mascara-2x.png',
                             'item': item_ref}
                    names = {k: r.upload(p)[0] for k, p in files.items()}
                    w, h = Image.open(files['base']).size
                    prompt = ab.prompts({'label': it['label']}, 'kontext', True)
                    if sx == 'f':
                        prompt = prompt.replace('pixel art footballer', 'pixel art female footballer').replace(
                            'his body', 'her body')
                    run_job(f'{tag}-vestido', ab.kontext(prompt, SEED_FOR.get(key, SEED), names, w, h, True,
                                                         f'Footer/metal/{tag}-vestido'))


# ---------------------------------------------------------------- final pass


def palette_for(slot, lvl):
    src = PREP / (f'gear-shorts-{lvl}-hd.png' if slot == 'socks' else f'gear-{slot}-{lvl}-hd.png')
    hd = np.asarray(Image.open(src).convert('RGB'))
    fg = hd[np.abs(hd.astype(int) - BG).max(axis=2) > 18]
    img = Image.fromarray(fg[np.random.default_rng(1).choice(len(fg), 40000)].reshape(200, 200, 3))
    pal = np.asarray(img.quantize(16, method=Image.MEDIANCUT).getpalette()[:48]).reshape(16, 3)
    return np.concatenate([pal, [[12, 10, 10]]])


def cut_icon(tag, pal, size):
    im = np.asarray(Image.open(JOBS / f'{tag}.png').convert('RGB'))
    fg = ~background(im.astype(float), tol=26)
    ys, xs = np.where(fg)
    w, h = size
    span = max((ys.max() - ys.min()) / h, (xs.max() - xs.min()) / w) * 1.08
    cy, cx = (ys.max() + ys.min()) / 2, (xs.max() + xs.min()) / 2
    box = (int(cx - span * w / 2), int(cy - span * h / 2), int(cx + span * w / 2), int(cy + span * h / 2))
    small = np.asarray(Image.fromarray(im).crop(box).resize(size, Image.BOX))
    a = np.asarray(Image.fromarray((fg * 255).astype(np.uint8)).crop(box).resize(size, Image.BOX)) > 127
    out = np.zeros((h, w, 4), np.uint8)
    out[a, :3] = post.quantize(small, pal)[a]
    out[a, 3] = 255
    return out


def cut_worn(tag, slot, pal):
    x0, y0, x1, y1 = SLOTS[slot]['crop']
    res = np.asarray(Image.open(JOBS / f'{tag}-vestido.png').convert('RGB').resize((x1 - x0, y1 - y0), Image.BOX))
    mask = np.asarray(Image.open(PREP / f'{tag}-mascara-2x.png').convert('L').resize((x1 - x0, y1 - y0), Image.NEAREST)) > 127
    base = np.asarray(Image.open(PREP / f'{tag}-corpo-2x.png').convert('RGB').resize((x1 - x0, y1 - y0), Image.NEAREST))
    changed = np.abs(res.astype(int) - base.astype(int)).max(axis=2) > 12
    keep = mask & changed & ~skinlike(res)
    layer = np.zeros((1024, 512, 4), np.uint8)
    sub = layer[y0:y1, OX + x0:OX + x1]
    sub[keep, :3] = post.quantize(res, pal)[keep]
    sub[keep, 3] = 255
    return layer


def half(arr, pal):
    """256 version: area reduction, re-quantized to the item palette, alpha only 0 or 255 (no seams)."""
    a = arr[..., 3:].astype(float) / 255
    pre = np.dstack([arr[..., :3] * a, a * 255]).astype(np.uint8)
    h, w = arr.shape[:2]
    small = np.asarray(Image.fromarray(pre, 'RGBA').resize((max(w // 2, 1), max(h // 2, 1)), Image.BOX)).astype(float)
    al = small[..., 3] / 255
    rgb = np.where(al[..., None] > 0, small[..., :3] / np.maximum(al[..., None], 1e-6), 0)
    out = np.zeros(small.shape, np.uint8)
    keep = al >= 0.5
    out[keep, :3] = post.quantize(np.clip(rgb, 0, 255).astype(np.uint8), pal)[keep]
    out[keep, 3] = 255
    return out


def save(arr, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(arr, 'RGBA').save(path, 'WEBP', lossless=True, method=6)


def build():
    entries = []
    for lvl in LEVELS:
        for slot, it in SLOTS.items():
            key = f'gear-{slot}-{lvl}'
            pal = palette_for(slot, lvl)
            ic = cut_icon(f'{key}-icone', pal, (128, 128))
            (OUT / 'icones').mkdir(parents=True, exist_ok=True)
            Image.fromarray(ic, 'RGBA').save(OUT / 'icones' / f'{key}.png', optimize=True)
            e = {'slot': slot, 'nivel': lvl, 'grau': GRADES[lvl], 'nome': key,
                 'hd_origem': None if slot == 'socks' else f'footer-original-catalogue/metallic/masters/{key}.png',
                 'icone': f'icones/{key}.png', 'camadas': {}}
            if it['worn'] == 'prop':
                w, h = it['box512']
                big = cut_icon(f'{key}-icone', pal, (w, h))
                save(big, OUT / '512' / f'{key}.webp')
                save(half(big, pal), OUT / '256' / f'{key}.webp')
                e['camadas'] = {'512': f'512/{key}.webp', '256': f'256/{key}.webp'}
                e['silhueta'] = 'objeto'
            else:
                for sx in (['m', 'f'] if it['worn'] == 'sx' else ['m']):
                    tag = f'{key}-{sx}'
                    layer = cut_worn(tag, slot, pal)
                    name = f'{key}-{sx}' if it['worn'] == 'sx' else key
                    save(layer, OUT / '512' / f'{name}.webp')
                    save(half(layer, pal), OUT / '256' / f'{name}.webp')
                    e['camadas'][sx if it['worn'] == 'sx' else 'partilhada'] = {
                        '512': f'512/{name}.webp', '256': f'256/{name}.webp'}
                e['silhueta'] = 'por sexo (m, f)' if it['worn'] == 'sx' else 'partilhada (m e f)'
            entries.append(e)
    doc = {'colecao': 'cromo-classico-metalicos', 'familia': 'preto e dourado-champanhe',
           'modelo': 'FLUX.1 Kontext dev FP8, seed %d' % SEED,
           'tela': {'512': [512, 1024], '256': [256, 512]},
           'nota': 'Camadas de corpo com a tela inteira, empilham-se em (0,0). Bola e galhardete sao objetos com o '
                   'tamanho da caixa do manifesto (512: 80x80 e 86x110; 256: 40x40 e 43x55). Meias e chuteiras sao '
                   'partilhadas pelas duas silhuetas.',
           'itens': entries}
    (OUT / 'metalicos.json').write_text(json.dumps(doc, ensure_ascii=False, indent=2))
    print(len(entries), 'itens')


def sheets():
    """Review sheets: icons (levels x slots) and both figures dressed per level, at 512."""
    order = ['shirts', 'shorts', 'socks', 'boots', 'balls', 'pennants']
    T = 140
    g = Image.new('RGB', (40 + len(order) * T, 30 + len(LEVELS) * T), (40, 40, 40))
    d = ImageDraw.Draw(g)
    for c, slot in enumerate(order):
        d.text((44 + c * T, 8), slot, fill=(255, 230, 160))
    for rI, lvl in enumerate(LEVELS):
        d.text((4, 30 + rI * T + 60), lvl, fill=(255, 230, 160))
        for c, slot in enumerate(order):
            ic = Image.open(OUT / 'icones' / f'gear-{slot}-{lvl}.png').convert('RGBA')
            cell = Image.new('RGB', (128, 128), BG)
            cell.paste(ic, (0, 0), ic)
            g.paste(cell, (40 + c * T, 30 + rI * T))
    g.save(OUT / 'folha-icones.png', optimize=True)

    W = 256
    f = Image.new('RGB', (len(LEVELS) * 2 * (W + 6) + 6, 512 + 30), (40, 40, 40))
    d = ImageDraw.Draw(f)
    for i, lvl in enumerate(LEVELS):
        for j, sx in enumerate('mf'):
            fig = Image.new('RGBA', (512, 1024), BG + (255,))
            pen = Image.open(OUT / '512' / f'gear-pennants-{lvl}.webp').convert('RGBA')
            fig.alpha_composite(pen, (394, 140))
            fig.alpha_composite(Image.open(APP / 'bases' / f'{sx}-pele-4.webp').convert('RGBA'))
            for name in [f'gear-socks-{lvl}', f'gear-boots-{lvl}', f'gear-shorts-{lvl}-{sx}', f'gear-shirts-{lvl}-{sx}']:
                fig.alpha_composite(Image.open(OUT / '512' / f'{name}.webp').convert('RGBA'))
            hair = 'cabelo/m-penteado-para-tras-castanho-escuro.webp' if sx == 'm' else 'cabelo/f-coque-castanho-escuro.webp'
            if sx == 'm':
                fig.alpha_composite(Image.open(APP / 'barba' / 'm-bigode-castanho-escuro.webp').convert('RGBA'))
            fig.alpha_composite(Image.open(APP / hair).convert('RGBA'))
            fig.alpha_composite(Image.open(OUT / '512' / f'gear-balls-{lvl}.webp').convert('RGBA'), (424, 924))
            x = 6 + (i * 2 + j) * (W + 6)
            f.paste(fig.convert('RGB').resize((W, 512), Image.BOX), (x, 30))
            d.text((x + 4, 8), f'{lvl} {GRADES[lvl]} {sx}', fill=(255, 230, 160))
    f.save(OUT / 'folha-vestidos.png', optimize=True)


if __name__ == '__main__':
    {'run': run, 'build': build, 'sheets': sheets}[sys.argv[1]]()
