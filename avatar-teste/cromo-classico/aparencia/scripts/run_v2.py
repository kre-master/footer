#!/usr/bin/env python3
"""Round 2: white-underwear mannequin, then the three slots on it. Resumable like run_layers.py.

  run_v2.py submit manequim            4 seeds of the new mannequin
  run_v2.py pick <seed>                save manequim-cuecas-brancas.png and the v2 masks
  run_v2.py submit pecas               camisola/calcoes/meias-chuteiras, chosen + new seed
  run_v2.py collect
"""

import json
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

import run_layers as r

ROOT = Path(__file__).resolve().parent
V2 = ROOT / 'v2'
PREP = V2 / 'prep'
JOBS = V2 / 'jobs'
SRC = r.SRC
W, H, S = r.W, r.H, r.SCALE
MANNEQUIN_SEEDS = [1111202611, 1111202612, 1111202613, 1111202614]
PIECE_SEEDS = {'camisola': [1111202601, 1111202621], 'calcoes': [1111202604, 1111202621],
               'meias-chuteiras': [1111202601, 1111202621]}
MANNEQUIN_PROMPT = (
    'pixel art footballer mannequin, same pose, same body, same face, same arms and legs, '
    'shirtless with a bare muscular chest and stomach in the same warm tan skin tone, '
    'wearing only simple plain white short boxer briefs, no undershirt, no other clothing, '
    'dark stepped outlines, warm low-colour shading, crisp pixels, plain flat beige background')
EXTRA = {
    # The jersey now has to reach down over the waist so no skin or white shows between pieces.
    'camisola': ', the jersey is long and tucked in, its ribbed burgundy hem reaches down over the waist',
    'calcoes': ', high waistband reaching up to the jersey hem, the shorts fully cover the underwear',
    'meias-chuteiras': '',
}


def node(kind, **inputs):
    return {'class_type': kind, 'inputs': inputs}


def graph(prompt, seed, names, refs, prefix, base_ref=True):
    g = {
        '1': node('UNETLoader', unet_name='flux-2-klein-base-4b-fp8.safetensors', weight_dtype='default'),
        '2': node('CLIPLoader', clip_name='qwen_3_4b.safetensors', type='flux2', device='default'),
        '3': node('VAELoader', vae_name='flux2-vae.safetensors'),
        '4': node('LoadImage', image=names['base']),
        '5': node('LoadImage', image=names['mask']),
        '6': node('ImageToMask', image=['5', 0], channel='red'),
        '9': node('VAEEncode', pixels=['4', 0], vae=['3', 0]),
        '12': node('CLIPTextEncode', clip=['2', 0], text=prompt),
        '13': node('CLIPTextEncode', clip=['2', 0], text=''),
    }
    pos, neg = ['12', 0], ['13', 0]
    latents = [['9', 0]] if base_ref else []
    for i, ref in enumerate(refs):
        g[f'3{i}'] = node('LoadImage', image=names[ref])
        g[f'4{i}'] = node('VAEEncode', pixels=[f'3{i}', 0], vae=['3', 0])
        latents.append([f'4{i}', 0])
    for i, latent in enumerate(latents):
        g[f'5{i}'] = node('ReferenceLatent', conditioning=pos, latent=latent)
        g[f'6{i}'] = node('ReferenceLatent', conditioning=neg, latent=latent)
        pos, neg = [f'5{i}', 0], [f'6{i}', 0]
    g.update({
        '20': node('CFGGuider', model=['1', 0], positive=pos, negative=neg, cfg=5.0),
        '21': node('KSamplerSelect', sampler_name='euler'),
        '22': node('Flux2Scheduler', steps=20, width=W, height=H),
        '23': node('SetLatentNoiseMask', samples=['9', 0], mask=['6', 0]),
        '24': node('RandomNoise', noise_seed=seed),
        '25': node('SamplerCustomAdvanced', noise=['24', 0], guider=['20', 0], sampler=['21', 0],
                   sigmas=['22', 0], latent_image=['23', 0]),
        '26': node('VAEDecode', samples=['25', 0], vae=['3', 0]),
        '27': node('ImageCompositeMasked', destination=['4', 0], source=['26', 0], x=0, y=0,
                   resize_source=False, mask=['6', 0]),
        '28': node('SaveImage', images=['27', 0], filename_prefix=prefix),
    })
    return g


def up2(path, out):
    Image.open(path).resize((W, H), Image.NEAREST).save(out)
    return out


def submit_one(key, slot, seed, prompt, files, refs, base_ref=True):
    JOBS.mkdir(parents=True, exist_ok=True)
    job_path = JOBS / f'{key}.job.json'
    if job_path.exists():
        print(json.dumps({'job': key, 'existing': True}), flush=True)
        return
    names, hashes = {}, {}
    for role, path in files.items():
        names[role], hashes[role] = r.upload(path)
    g = graph(prompt, seed, names, refs, f'Footer/avatar-2026-11-11-v2/{key}', base_ref)
    (JOBS / f'{key}.api.json').write_text(json.dumps(g, ensure_ascii=False, indent=2))
    result = r.request('/prompt', payload={'prompt': g, 'client_id': 'footer-avatar-v2-' + key})
    if not result.get('prompt_id') or result.get('node_errors'):
        raise RuntimeError(json.dumps(result, ensure_ascii=False))
    job = {'job': key, 'slot': slot, 'seed': seed, 'prompt': prompt, 'prompt_id': result['prompt_id'],
           'inputs': names, 'sha256': hashes, 'width': W, 'height': H, 'steps': 20, 'cfg': 5.0,
           'model': 'flux-2-klein-base-4b-fp8.safetensors', 'submitted_at_unix': time.time()}
    job_path.write_text(json.dumps(job, ensure_ascii=False, indent=2))
    print(json.dumps({'job': key, 'prompt_id': result['prompt_id']}), flush=True)


def submit_mannequin():
    base = up2(r.PREP / 'manequim-flat.png', PREP / 'manequim-flat-2x.png')
    mask = up2(PREP / 'mascara-roupa-interior.png', PREP / '2x-mascara-roupa-interior.png')
    for seed in MANNEQUIN_SEEDS:
        submit_one(f'manequim-{seed}', 'manequim', seed, MANNEQUIN_PROMPT, {'base': base, 'mask': mask}, [])


def pick(seed):
    """Save the chosen mannequin (original alpha, new pixels inside the edit mask) and the v2 masks."""
    orig = Image.open(SRC / 'manequim-base.png').convert('RGBA')
    edit = np.asarray(Image.open(PREP / 'mascara-roupa-interior.png')) > 127
    res = np.asarray(Image.open(JOBS / f'manequim-{seed}.png').convert('RGB').resize((384, 1024), Image.BOX))
    px = np.asarray(orig).copy()
    differs = np.abs(res.astype(int) - r.BG).max(axis=2) > 12
    px[edit, :3] = res[edit]
    px[edit, 3] = np.where(differs[edit], 255, 0)
    out = Image.fromarray(px, 'RGBA')
    out.save(V2 / 'manequim-cuecas-brancas.png', optimize=True)
    r.flat(V2 / 'manequim-cuecas-brancas.png').save(PREP / 'manequim-v2-flat.png')

    cam = np.asarray(Image.open(SRC / 'mascara-camisola.png').convert('L')) > 127
    cal = np.asarray(Image.open(SRC / 'mascara-calcoes.png').convert('L')) > 127
    # White briefs pixels (bright, low saturation) in the new mannequin: the shorts must cover them all.
    rgb = px[..., :3].astype(int)
    white = edit & (rgb.min(axis=2) > 170) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 40)
    near = np.asarray(Image.fromarray((cal * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(15))) > 127
    white &= near  # the briefs only, not the chest highlights
    white = np.asarray(Image.fromarray((white * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7))) > 127
    cal2 = cal | white
    # Jersey reaches past the top edge of the shorts mask, filling its stepped hem, over the torso width.
    rows = np.where(cal.any(axis=1))[0]
    top = rows[0]
    cols = np.where(cam[top - 6])[0]
    cam2 = cam.copy()
    cam2[top:top + 36, cols[0]:cols[-1] + 1] = True
    for name, m in [('mascara-camisola-v2.png', cam2), ('mascara-calcoes-v2.png', cal2)]:
        Image.fromarray((m * 255).astype(np.uint8)).save(V2 / name)
    Image.open(SRC / 'mascara-meias-chuteiras.png').convert('L').save(V2 / 'mascara-meias-chuteiras-v2.png')
    print(json.dumps({'mannequin_seed': seed, 'shorts_top': int(top), 'jersey_cols': [int(cols[0]), int(cols[-1])],
                      'white_px_outside_shorts_mask': int((white & ~cal).sum())}))


def submit_pieces():
    base = up2(PREP / 'manequim-v2-flat.png', PREP / 'manequim-v2-flat-2x.png')
    for slot, seeds in PIECE_SEEDS.items():
        spec = r.SLOTS[slot]
        mask = up2(V2 / f'mascara-{slot}-v2.png', PREP / f'2x-mascara-{slot}-v2.png')
        files = {'base': base, 'mask': mask, 'player': r.PREP / 'jogador-flat-2x.png', 'icon': r.PREP / spec['icon']}
        prompt = f"{r.STYLE}, {spec['prompt']}{EXTRA[slot]}"
        for seed in seeds:
            submit_one(f'{slot}-{seed}', slot, seed, prompt, files, ['player', 'icon'])


def collect():
    r.JOBS = JOBS
    for job_path in sorted(JOBS.glob('*.job.json')):
        key = job_path.name[:-len('.job.json')]
        if not (JOBS / f'{key}.result.json').exists():
            print(json.dumps(r.collect(key) or {'job': key, 'status': 'pending'}), flush=True)


if __name__ == '__main__':
    action = sys.argv[1]
    if action == 'submit':
        submit_mannequin() if sys.argv[2] == 'manequim' else submit_pieces()
    elif action == 'pick':
        pick(int(sys.argv[2]))
    else:
        collect()
