#!/usr/bin/env python3
"""Flatten one variation into a single self-contained HTML body for Artifact publishing.

Inlines styles.css, concatenates the ES modules into one classic-scope <script type="module">,
and embeds images as data URIs. Strips the doctype/html/head/body wrapper (Artifact supplies it).
"""
import base64, mimetypes, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def data_uri(rel_from_variant: str, variant: Path) -> str:
    p = (variant / rel_from_variant).resolve()
    mime = mimetypes.guess_type(p.name)[0] or 'application/octet-stream'
    return f"data:{mime};base64,{base64.b64encode(p.read_bytes()).decode()}"

def strip_module_syntax(src: str) -> str:
    # All three modules end up in one scope, so imports/exports become redundant.
    src = re.sub(r'^\s*import\s+[^;]+?;\s*$', '', src, flags=re.M | re.S)
    src = re.sub(r'^\s*export\s*\{[^}]*\}\s*;\s*$', '', src, flags=re.M | re.S)
    src = re.sub(r'^(\s*)export\s+(?=(const|let|var|function|async|class)\b)', r'\1', src, flags=re.M)
    return src

def build(variant_name: str) -> str:
    variant = ROOT / variant_name
    html = (variant / 'index.html').read_text()

    # 1. inline the stylesheet
    css = (variant / 'styles.css').read_text()
    html = re.sub(r'<link[^>]+href="(?:\./)?styles\.css"[^>]*>',
                  lambda m: f'<style>\n{css}\n</style>', html)

    # 2. inline the module graph, in dependency order
    parts = [strip_module_syntax((ROOT / 'shared' / 'site-config.js').read_text()),
             strip_module_syntax((ROOT / 'shared' / 'booking-core.js').read_text()),
             strip_module_syntax((variant / 'app.js').read_text())]
    js = '\n\n'.join(parts)
    html = re.sub(r'<script[^>]+src="(?:\./)?app\.js"[^>]*></script>',
                  lambda m: f'<script type="module">\n{js}\n</script>', html)

    # 3. embed every local asset that is still referenced by path
    def repl(m):
        attr, url = m.group(1), m.group(2)
        if url.startswith(('http', 'data:', '#', 'mailto:')):
            return m.group(0)
        try:
            return f'{attr}="{data_uri(url, variant)}"'
        except (FileNotFoundError, OSError):
            return m.group(0)
    html = re.sub(r'\b(src|href)="([^"]+\.(?:jpg|jpeg|png|svg|webp))"', repl, html)

    # 4. shed the wrapper Artifact provides; keep <title> and everything in between
    html = re.sub(r'(?is)^.*?<head[^>]*>', '', html)
    html = re.sub(r'(?is)</head>\s*<body[^>]*>', '\n', html)
    html = re.sub(r'(?is)</body>\s*</html>\s*$', '', html)
    # these are meaningless inside the wrapper's head
    html = re.sub(r'(?im)^\s*<meta charset[^>]*>\s*$', '', html)
    html = re.sub(r'(?im)^\s*<meta name="viewport"[^>]*>\s*$', '', html)
    return html.strip()

if __name__ == '__main__':
    name = sys.argv[1]
    out = Path(sys.argv[2])
    out.write_text(build(name))
    print(f'{name} -> {out}  ({out.stat().st_size/1024:.0f} KB)')
