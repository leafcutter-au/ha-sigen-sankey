"""Check every rendered label fits its box: no element outside the bar, no elements overlapping.

Usage: python3 check.py <render_dir>
"""
import json
import sys
from PIL import Image

PARTS = ['entity-type', 'state', 'unit', 'percentage']
TOL = 0.5  # css px


def inside(p, bar):
    return (p['x'] >= bar['x'] - TOL and p['y'] >= bar['y'] - TOL
            and p['x'] + p['w'] <= bar['x'] + bar['w'] + TOL and p['y'] + p['h'] <= bar['y'] + bar['h'] + TOL)


def overlap_y(a, b):
    return min(a['y'] + a['h'], b['y'] + b['h']) - max(a['y'], b['y'])


def flow_gaps(img, g, si, box):
    """Fraction of the box's height with no flow touching it, sampled just outside its flow side."""
    k = img.size[0] / g['host']['w']
    bar = box['bar']
    # left section: flows leave from the right edge; right section: flows arrive at the left edge
    x = bar['x'] + bar['w'] + 3 if si == 0 else bar['x'] - 3
    x = round((x - g['host']['x']) * k)
    y0 = round((bar['y'] - g['host']['y'] + 2) * k)
    y1 = round((bar['y'] + bar['h'] - g['host']['y'] - 2) * k)
    px = img.load()
    empty = sum(1 for y in range(y0, y1) if sum(px[x, y][:3]) < 3 * 40)  # card background is #1c1c1c
    return empty / max(1, y1 - y0)


problems = 0
for g in json.load(open(f'{sys.argv[1]}/geometry.json')):
    img = Image.open(f"{sys.argv[1]}/{g['scenario']}.png").convert('RGB')
    for si, sec in enumerate(g['sections']):
        for box in sec:
            gap = flow_gaps(img, g, si, box)
            if gap > 0.02:
                problems += 1
                print(f"{g['scenario']:10s} {box['text']:28s} h={box['bar']['h']:.0f}: {gap * 100:.0f}% of its height has no flow")
            parts = {k: v for k, v in box['parts'].items() if k in PARTS}
            issues = [f'{k} outside' for k, v in parts.items() if not inside(v, box['bar'])]
            names = list(parts)
            for i, a in enumerate(names):
                for b in names[i + 1:]:
                    if {a, b} == {'state', 'unit'} and box['tier'] == 'inline':
                        continue  # same line by design
                    o = overlap_y(parts[a], parts[b])
                    if o > TOL:
                        issues.append(f'{a}/{b} overlap {o:.1f}px')
            # gap between unit line and percentage, in css px
            if 'unit' in parts and 'percentage' in parts:
                gap = parts['percentage']['y'] - (parts['unit']['y'] + parts['unit']['h'])
                if gap < 3:
                    issues.append(f'unit-pct gap {gap:.1f}px')
            if issues:
                problems += 1
                print(f"{g['scenario']:10s} {box['text']:28s} h={box['bar']['h']:.0f} {box['tier']}: {'; '.join(issues)}")
print(f'{problems} boxes with problems')
