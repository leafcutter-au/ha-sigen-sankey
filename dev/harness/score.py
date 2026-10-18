"""Score a harness render of the `ref` scenario against the Sigenergy app screenshot.

All measurements are ink-based (pixels), normalised to "reference pixels": the
reference box column is 242px wide, so a render is scaled by 242 / its bar width.
Box heights are compared as a fraction of the column height.

Usage: python3 score.py <render_dir>
"""
import json
import os
import sys
from PIL import Image

# The Sigenergy app screenshot (1024x1235) is kept out of the repo; put it at reference/sigenergy-app.png
REF_IMG = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reference', 'sigenergy-app.png')
# Reference box rects (x0, x1, y0, y1), measured from colour runs
REF_BOXES = [
    [('SOLAR', (15, 256, 52, 490)), ('BATTERY', (15, 256, 504, 712)), ('GRID', (15, 256, 726, 1202))],
    [('BATTERY', (758, 1000, 52, 270)), ('LOAD', (758, 1000, 284, 1032)), ('GRID', (758, 1000, 1046, 1202))],
]
REF_COL = (52, 1202)
REF_COL_H = REF_COL[1] - REF_COL[0]


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def analyse(im, rect):
    """Return badge rect and ink text groups, relative to the box, in image px."""
    x0, x1, y0, y1 = rect
    w, h = x1 - x0, y1 - y0
    px = im.load()
    # fill colour: sample the right-hand edge area, mid height
    fill = px[x0 + int(w * 0.92), y0 + int(h * 0.5)]
    fl = lum(fill)
    # badge: pixels clearly lighter than the fill, within the top part of the box
    top_lim = min(h, int(w * 0.6))
    rows, cols = [], []
    for y in range(y0 + 2, y0 + top_lim):
        n = sum(1 for x in range(x0 + 2, x1 - 2) if lum(px[x, y]) > fl + 18)
        if n > w * 0.3:
            rows.append(y - y0)
    if rows:
        ya, yb = rows[0], rows[-1]
        for x in range(x0 + 1, x1 - 1):
            n = sum(1 for y in range(y0 + ya, y0 + yb + 1) if lum(px[x, y]) > fl + 18)
            if n > (yb - ya) * 0.5:
                cols.append(x - x0)
    badge = (cols[0], cols[-1], rows[0], rows[-1]) if rows and cols else None

    # dark ink rows (text), skipping the rounded corner pixels
    def dark(p):
        return lum(p) < 75

    ink = []
    for y in range(y0 + 4, y1 - 4):
        xs = [x for x in range(x0 + 4, x1 - 4) if dark(px[x, y])]
        if xs:
            ink.append((y - y0, min(xs) - x0, max(xs) - x0))
    groups = []
    for y, a, b in ink:
        if groups and y - groups[-1]['y1'] <= 2:
            g = groups[-1]
            g['y1'] = y
            g['x0'] = min(g['x0'], a)
            g['x1'] = max(g['x1'], b)
        else:
            groups.append({'y0': y, 'y1': y, 'x0': a, 'x1': b})
    groups = [g for g in groups if g['y1'] - g['y0'] >= 6]
    return {'h': h, 'w': w, 'badge': badge, 'text': groups}


def measure_ref():
    im = Image.open(REF_IMG).convert('RGB')
    col_h = REF_COL[1] - REF_COL[0]
    out = []
    for col in REF_BOXES:
        col_out = []
        for name, r in col:
            m = analyse(im, r)
            m['col_h'] = col_h
            col_out.append((name, m, (r[3] - r[2]) / col_h))
        out.append(col_out)
    return out


def measure_render(d):
    geo = [g for g in json.load(open(f'{d}/geometry.json')) if g['scenario'] == 'ref'][0]
    im = Image.open(f'{d}/ref.png').convert('RGB')
    scale = im.size[0] / geo['host']['w']
    out = []
    for sec in geo['sections']:
        col = []
        tops = [b['bar']['y'] for b in sec]
        bottoms = [b['bar']['y'] + b['bar']['h'] for b in sec]
        col_h = max(bottoms) - min(tops)
        for b in sec:
            br = b['bar']
            r = (
                round((br['x'] - geo['host']['x']) * scale),
                round((br['x'] + br['w'] - geo['host']['x']) * scale),
                round((br['y'] - geo['host']['y']) * scale),
                round((br['y'] + br['h'] - geo['host']['y']) * scale),
            )
            name = (b['text'] or '').split(' ')[0]
            m = analyse(im, r)
            m['col_h'] = col_h * scale
            col.append((name, m, br['h'] / col_h))
        out.append(col)
    return out


def norm(m):
    """Scale an analysis to reference px: x by box width, y and text size by column height."""
    kx = 242 / m['w']
    ky = REF_COL_H / m['col_h']
    badge = (m['badge'][0] * kx, m['badge'][1] * kx, m['badge'][2] * ky, m['badge'][3] * ky) if m['badge'] else None
    text = [{'y0': g['y0'] * ky, 'y1': g['y1'] * ky, 'x0': g['x0'] * kx, 'x1': g['x0'] * kx + (g['x1'] - g['x0']) * ky}
            for g in m['text']]
    return {'h': m['h'] * ky, 'badge': badge, 'text': text}


def compare(ref, ren):
    rows = []
    total, n = 0.0, 0
    for ci, (rcol, ncol) in enumerate(zip(ref, ren)):
        for (rname, rm, rf), (nname, nm, nf) in zip(rcol, ncol):
            r, m = norm(rm), norm(nm)
            errs = {'box_h%': abs(rf - nf) * 100}
            if r['badge'] and m['badge']:
                for i, k in enumerate(['bx0', 'bx1', 'by0', 'by1']):
                    errs[k] = abs(r['badge'][i] - m['badge'][i])
            else:
                errs['badge_missing'] = 50
            # text groups: badge text, value, unit, pct (match by order)
            rt, mt = r['text'], m['text']
            if len(rt) != len(mt):
                errs['text_groups'] = 40 * abs(len(rt) - len(mt))
            for i, (a, b) in enumerate(zip(rt, mt)):
                if i == len(rt) - 1 and len(rt) == 4 and len(mt) == 4:
                    # percentage: anchored to the box bottom
                    errs[f't{i}_bottom'] = abs((r['h'] - a['y1']) - (m['h'] - b['y1']))
                else:
                    errs[f't{i}_top'] = abs(a['y0'] - b['y0'])
                errs[f't{i}_size'] = abs((a['y1'] - a['y0']) - (b['y1'] - b['y0']))
                errs[f't{i}_x0'] = abs(a['x0'] - b['x0'])
                errs[f't{i}_w'] = abs((a['x1'] - a['x0']) - (b['x1'] - b['x0']))
            box_err = sum(errs.values()) / len(errs)
            total += box_err
            n += 1
            rows.append((f'{ci}:{rname}', nname, box_err, errs))
    return total / n, rows


if __name__ == '__main__':
    ref = measure_ref()
    if len(sys.argv) < 2:
        for col in ref:
            for name, m, f in col:
                print(name, f'{f:.3f}', m['badge'], [(g['y0'], g['y1'], g['x0'], g['x1']) for g in m['text']])
        sys.exit()
    ren = measure_render(sys.argv[1])
    score, rows = compare(ref, ren)
    for key, name, e, errs in rows:
        worst = sorted(errs.items(), key=lambda kv: -kv[1])[:4]
        print(f'{key:12s} {name:8s} err {e:6.1f}   worst: ' + ', '.join(f'{k}={v:.0f}' for k, v in worst))
    print(f'SCORE (mean abs error, ref px; lower is better): {score:.1f}')
