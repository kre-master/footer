#!/usr/bin/env python3
"""A/B for the metallic items: FLUX.2 Klein 4B (current pipeline) vs FLUX.1 Kontext dev (FP8), same items,
same masks, same final deterministic pass (pixel grid + fixed palette).

  ab_metal.py prep | run | sheet
"""

import json
import sys
import threading
import time
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import run_layers as r
import run_v2 as v2

ROOT = Path(__file__).resolve().parent
MET = ROOT / 'metal'
PREP = MET / 'prep'
JOBS = MET / 'jobs'
CAT = Path('/home/joao/maestro/footer-original-catalogue/metallic/masters')
APP = ROOT / 'repo' / 'avatar-teste' / 'cromo-classico' / 'aparencia' / '512'
CC = ROOT / 'repo' / 'avatar-teste' / 'cromo-classico'
BG = (0xE9, 0xDC, 0xC3)
OX = 64
SEEDS = [1111202901, 1111202902]
ITEMS = {
    'gear-shirts-03': {'slot': 'camisola', 'label': 'football shirt', 'style_icon': 'icone-camisola.png',
                       'crop': (0, 130, 384, 514)},
    'gear-boots-04': {'slot': 'chuteiras', 'label': 'pair of football boots', 'style_icon': 'icone-chuteiras.png',
                      'crop': (0, 768, 384, 1024)},
    'gear-pennants-06': {'slot': 'galhardete', 'label': 'pennant', 'style_icon': 'icone-galhardete.png', 'crop': None},
}
PIXEL = ('pixel art, crisp hard-edged pixels, dark stepped outlines, low-colour cel shading, no blur, no gradients '
         'noise, no anti-aliasing')
METAL = 'matte black fabric with metallic champagne-gold trim, the gold shines with a few bright highlight pixels'


def flat(im):
    im = im.convert('RGBA')
    out = Image.new('RGB', im.size, BG)
    out.paste(im, (0, 0), im)
    return out


def prep():
    PREP.mkdir(parents=True, exist_ok=True)
    base = Image.open(APP / 'bases' / 'm-pele-4.webp').convert('RGBA').crop((OX, 0, OX + 384, 1024))
    socks = Image.open(APP / 'kit' / 'meias.webp').convert('RGBA').crop((OX, 0, OX + 384, 1024))
    boots = np.asarray(Image.open(APP / 'kit' / 'chuteiras.webp').convert('RGBA').crop((OX, 0, OX + 384, 1024)))
    shirt_mask = Image.open(ROOT / 'v2' / 'mascara-camisola-v2.png').convert('L')
    boots_mask = Image.fromarray(((boots[..., 3] > 0) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))
    for key, it in ITEMS.items():
        hd = Image.open(CAT / f'{key}.png')
        hd = hd.crop(hd.getbbox())
        hd.thumbnail((768, 768), Image.LANCZOS)
        canvas = Image.new('RGB', (768, 768), BG)
        canvas.paste(flat(hd), ((768 - hd.width) // 2, (768 - hd.height) // 2))
        canvas.save(PREP / f'{key}-hd.png')
        flat(Image.open(CC / it['style_icon'])).save(PREP / f'{key}-estilo.png')
        if it['crop']:
            x0, y0, x1, y1 = it['crop']
            body = base.copy()
            if it['slot'] == 'chuteiras':
                body.alpha_composite(socks)
            img = flat(body).crop(it['crop'])
            img.resize((img.width * 2, img.height * 2), Image.NEAREST).save(PREP / f'{key}-corpo-2x.png')
            m = (shirt_mask if it['slot'] == 'camisola' else boots_mask).crop(it['crop'])
            m.resize((m.width * 2, m.height * 2), Image.NEAREST).save(PREP / f'{key}-mascara-2x.png')
    Image.new('RGB', (768, 768), BG).save(PREP / 'vazio-768.png')
    print('ok')


def node(kind, **inputs):
    return {'class_type': kind, 'inputs': inputs}


def klein(prompt, seed, names, w, h, inpaint, prefix):
    g = {'1': node('UNETLoader', unet_name='flux-2-klein-base-4b-fp8.safetensors', weight_dtype='default'),
         '2': node('CLIPLoader', clip_name='qwen_3_4b.safetensors', type='flux2', device='default'),
         '3': node('VAELoader', vae_name='flux2-vae.safetensors'),
         '4': node('LoadImage', image=names['base']),
         '9': node('VAEEncode', pixels=['4', 0], vae=['3', 0]),
         '12': node('CLIPTextEncode', clip=['2', 0], text=prompt),
         '13': node('CLIPTextEncode', clip=['2', 0], text='')}
    pos, neg = ['12', 0], ['13', 0]
    lat = [['9', 0]] if inpaint else []
    for i, ref in enumerate(['item', 'style']):
        g[f'3{i}'] = node('LoadImage', image=names[ref])
        g[f'4{i}'] = node('VAEEncode', pixels=[f'3{i}', 0], vae=['3', 0])
        lat.append([f'4{i}', 0])
    for i, l in enumerate(lat):
        g[f'5{i}'] = node('ReferenceLatent', conditioning=pos, latent=l)
        g[f'6{i}'] = node('ReferenceLatent', conditioning=neg, latent=l)
        pos, neg = [f'5{i}', 0], [f'6{i}', 0]
    g.update({'20': node('CFGGuider', model=['1', 0], positive=pos, negative=neg, cfg=5.0),
              '21': node('KSamplerSelect', sampler_name='euler'),
              '22': node('Flux2Scheduler', steps=20, width=w, height=h),
              '24': node('RandomNoise', noise_seed=seed)})
    if inpaint:
        g['5'] = node('LoadImage', image=names['mask'])
        g['6'] = node('ImageToMask', image=['5', 0], channel='red')
        g['23'] = node('SetLatentNoiseMask', samples=['9', 0], mask=['6', 0])
        latent = ['23', 0]
    else:
        g['23'] = node('EmptyFlux2LatentImage', width=w, height=h, batch_size=1)
        latent = ['23', 0]
    g['25'] = node('SamplerCustomAdvanced', noise=['24', 0], guider=['20', 0], sampler=['21', 0], sigmas=['22', 0],
                   latent_image=latent)
    g['26'] = node('VAEDecode', samples=['25', 0], vae=['3', 0])
    out = ['26', 0]
    if inpaint:
        g['27'] = node('ImageCompositeMasked', destination=['4', 0], source=['26', 0], x=0, y=0,
                       resize_source=False, mask=['6', 0])
        out = ['27', 0]
    g['28'] = node('SaveImage', images=out, filename_prefix=prefix)
    return g


def kontext(prompt, seed, names, w, h, inpaint, prefix):
    g = {'1': node('UNETLoader', unet_name='flux1-dev-kontext_fp8_scaled.safetensors', weight_dtype='default'),
         '2': node('DualCLIPLoader', clip_name1='clip_l.safetensors', clip_name2='t5xxl_fp8_e4m3fn_scaled.safetensors',
                   type='flux', device='default'),
         '3': node('VAELoader', vae_name='ae.safetensors'),
         '4': node('LoadImage', image=names['base']),
         '9': node('VAEEncode', pixels=['4', 0], vae=['3', 0]),
         '12': node('CLIPTextEncode', clip=['2', 0], text=prompt),
         '30': node('LoadImage', image=names['item']),
         '40': node('VAEEncode', pixels=['30', 0], vae=['3', 0])}
    pos = ['12', 0]
    refs = ([['9', 0]] if inpaint else []) + [['40', 0]]
    for i, l in enumerate(refs):
        g[f'5{i}'] = node('ReferenceLatent', conditioning=pos, latent=l)
        pos = [f'5{i}', 0]
    g['15'] = node('FluxGuidance', conditioning=pos, guidance=2.5)
    g['16'] = node('ConditioningZeroOut', conditioning=['12', 0])
    if inpaint:
        g['5'] = node('LoadImage', image=names['mask'])
        g['6'] = node('ImageToMask', image=['5', 0], channel='red')
        g['23'] = node('SetLatentNoiseMask', samples=['9', 0], mask=['6', 0])
    else:
        g['23'] = node('EmptySD3LatentImage', width=w, height=h, batch_size=1)
    g['25'] = node('KSampler', model=['1', 0], seed=seed, steps=20, cfg=1.0, sampler_name='euler', scheduler='simple',
                   positive=['15', 0], negative=['16', 0], latent_image=['23', 0], denoise=1.0)
    g['26'] = node('VAEDecode', samples=['25', 0], vae=['3', 0])
    out = ['26', 0]
    if inpaint:
        g['27'] = node('ImageCompositeMasked', destination=['4', 0], source=['26', 0], x=0, y=0,
                       resize_source=False, mask=['6', 0])
        out = ['27', 0]
    g['28'] = node('SaveImage', images=out, filename_prefix=prefix)
    return g


def prompts(it, model, inpaint):
    if inpaint:
        what = (f'dress the pixel art footballer in exactly the {it["label"]} from the reference image, same design, '
                f'same colours and same ornaments, fitted to his body and pose')
    else:
        what = (f'a single {it["label"]} as a pixel art game inventory icon, exactly the same design, colours and '
                f'ornaments as the reference image, centred, front view, same pixel style as the small icon reference')
    if model == 'kontext' and not inpaint:
        what = (f'Convert this {it["label"]} into a pixel art game inventory icon. Keep exactly the same design, '
                f'colours and ornaments, centred, front view')
    return f'{what}, {METAL}, {PIXEL}, plain flat beige background'


class VramWatch(threading.Thread):
    def __init__(self):
        super().__init__(daemon=True)
        self.peak, self.stop = 0, False
        self.op = urllib.request.build_opener(urllib.request.ProxyHandler({}))

    def run(self):
        while not self.stop:
            try:
                d = json.load(self.op.open(r.BASE_URL + '/system_stats', timeout=5))['devices'][0]
                self.peak = max(self.peak, d['vram_total'] - d['vram_free'])
            except Exception:
                pass
            time.sleep(0.5)


def run():
    JOBS.mkdir(parents=True, exist_ok=True)
    v2.JOBS = JOBS
    results = json.loads((MET / 'ab-tempos.json').read_text()) if (MET / 'ab-tempos.json').exists() else {}
    for model, build in (('klein', klein), ('kontext', kontext)):
        for key, it in ITEMS.items():
            for kind in (['icone', 'vestido'] if it['crop'] else ['icone']):
                inpaint = kind == 'vestido'
                files = {'item': PREP / f'{key}-hd.png', 'style': PREP / f'{key}-estilo.png'}
                if inpaint:
                    files['base'] = PREP / f'{key}-corpo-2x.png'
                    files['mask'] = PREP / f'{key}-mascara-2x.png'
                    w, h = Image.open(files['base']).size
                else:
                    files['base'] = PREP / 'vazio-768.png'
                    w, h = 768, 768
                names = {k: r.upload(p)[0] for k, p in files.items()}
                for seed in SEEDS:
                    tag = f'{model}-{key}-{kind}-{seed}'
                    if (JOBS / f'{tag}.png').exists():
                        continue
                    g = build(prompts(it, model, inpaint), seed, names, w, h, inpaint, f'Footer/metal-ab/{tag}')
                    (JOBS / f'{tag}.api.json').write_text(json.dumps(g, indent=2))
                    watch = VramWatch()
                    watch.start()
                    t0 = time.time()
                    pid = r.request('/prompt', payload={'prompt': g, 'client_id': 'footer-metal-ab'})['prompt_id']
                    while True:
                        rec = r.request('/history/' + pid).get(pid)
                        if rec and rec.get('status', {}).get('completed') is not None:
                            break
                        time.sleep(2)
                    watch.stop = True
                    state = rec['status']
                    times = {n: d.get('timestamp') for n, d in state.get('messages', []) if isinstance(d, dict)}
                    secs = (times['execution_success'] - times['execution_start']) / 1000 \
                        if times.get('execution_success') and times.get('execution_start') else round(time.time() - t0, 1)
                    for out in rec.get('outputs', {}).values():
                        for im in out.get('images', []):
                            q = urllib.parse.urlencode({k: im[k] for k in ('filename', 'subfolder', 'type')})
                            (JOBS / f'{tag}.png').write_bytes(r.OPENER.open(r.BASE_URL + '/view?' + q, timeout=60).read())
                    results[tag] = {'segundos': secs, 'vram_pico_gb': round(watch.peak / 1e9, 2),
                                    'estado': state.get('status_str')}
                    print(tag, results[tag], flush=True)
                    (MET / 'ab-tempos.json').write_text(json.dumps(results, indent=2))


if __name__ == '__main__':
    {'prep': prep, 'run': run}[sys.argv[1]]()
