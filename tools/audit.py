#!/usr/bin/env python3
"""Static pre-flight audit across all five variations. Reports only real problems."""
import re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VARIANTS = sorted(p.name for p in ROOT.glob('0*-*') if p.is_dir())

REQUIRED_CONTENT = {
    'zouk explainer': r'(?i)lambada|partner dance|connection',
    'classes':        r'(?i)beginner',
    'schedule':       r'(?i)thursday',
    'prices':         r'(?i)trial|price',
    'teachers':       r'(?i)miriam',
    'faq':            r'(?i)do i need a partner|need a partner',
    'location':       r'(?i)tanzstudio rebecca',
    'maps link':      r'google\.com/maps',
    'instagram':      r'instagram\.com/pavan_zouk',
    'munich scene':   r'zoukmunich\.com',
}

META = {
    'title':          r'<title>[^<]{10,}</title>',
    'description':    r'<meta\s+name="description"\s+content="[^"]{40,}"',
    'og:title':       r'property="og:title"',
    'og:description': r'property="og:description"',
    'og:image':       r'content="https://ojallington\.github\.io/vedant-zouk/assets/poster\.jpg"',
    'viewport':       r'<meta\s+name="viewport"',
    'lang':           r'<html[^>]+lang=',
}

def audit(name):
    d = ROOT / name
    html = (d / 'index.html').read_text()
    css = (d / 'styles.css').read_text()
    issues, notes = [], []

    for label, pat in META.items():
        if not re.search(pat, html):
            issues.append(f'missing meta: {label}')

    for label, pat in REQUIRED_CONTENT.items():
        if not re.search(pat, html):
            issues.append(f'missing content: {label}')

    # every image needs alt text
    for tag in re.findall(r'<img\b[^>]*>', html):
        if not re.search(r'\balt=', tag):
            issues.append(f'img without alt: {tag[:70]}')

    # exactly one h1, and no skipped heading levels
    levels = [int(m) for m in re.findall(r'<h([1-6])\b', html)]
    if levels.count(1) != 1:
        issues.append(f'expected exactly one h1, found {levels.count(1)}')
    prev = 0
    for lv in levels:
        if prev and lv > prev + 1:
            issues.append(f'heading level jumps h{prev} -> h{lv}')
            break
        prev = lv

    # paths must stay relative for a project-page subpath
    for m in re.findall(r'\b(?:src|href)="(/[^/][^"]*)"', html):
        issues.append(f'root-relative path: {m}')

    # accessibility / polish
    if 'prefers-reduced-motion' not in css:
        issues.append('no prefers-reduced-motion block')
    if not re.search(r':focus-visible|:focus\b', css):
        issues.append('no visible focus styles')
    if 'skip' not in html.lower()[:4000] and '#main' not in html:
        notes.append('no skip-to-content link')

    # known placeholders that must be dealt with before launch
    if re.search(r'(?i)>\s*(impressum|datenschutz)\s*<', html):
        if re.search(r'href="#"[^>]*>\s*(?i:impressum|datenschutz)', html):
            notes.append('Impressum/Datenschutz still href="#" (expected pre-launch)')
    else:
        issues.append('no Impressum/Datenschutz links (required in Germany)')
    if 'hello@example.com' in html:
        notes.append('placeholder email still in markup')

    return issues, notes

fail = 0
for v in VARIANTS:
    issues, notes = audit(v)
    fail += len(issues)
    status = 'FAIL' if issues else 'ok'
    print(f'\n{v}  [{status}]')
    for i in issues: print(f'   ✗ {i}')
    for n in notes: print(f'   · {n}')
print(f'\n{"-"*50}\n{fail} issue(s) across {len(VARIANTS)} variations')
sys.exit(1 if fail else 0)
