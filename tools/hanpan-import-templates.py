"""Regenerates packages/hanpan-core/src/templates-data.ts from 글집's samples.

usage: python tools/hanpan-import-templates.py <docua samples folder>
The samples are Markdown files plus their metadata in __init__.py (SAMPLES).
"""
import json, pathlib, re, sys

src = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r'C:/project/docua/apps/backend/app/samples')
init = (src / '__init__.py').read_text(encoding='utf8')
out = []
for m in re.finditer(r'SampleMeta\((.*?)\n    \)', init, re.S):
    body = m.group(1)
    g = lambda k: (re.search(k + r'="([^"]*)"', body) or [None, ''])[1]
    tags = re.search(r'tags=\[(.*?)\]', body, re.S)
    meta = {'id': g('id'), 'title': g('title'), 'category': g('category'), 'description': g('description'),
            'icon': g('icon'), 'tags': re.findall(r'"([^"]+)"', tags.group(1)) if tags else []}
    path = src / f"{meta['id']}.md"
    if path.exists():
        meta['markdown'] = path.read_text(encoding='utf8').replace('DocuAX', '○○○○').replace('\r\n', '\n')
        out.append(meta)
target = pathlib.Path(__file__).resolve().parent.parent / 'packages/hanpan-core/src/templates-data.ts'
head = target.read_text(encoding='utf8').split('export const DOC_TEMPLATES')[0]
target.write_text(head + 'export const DOC_TEMPLATES: readonly DocTemplate[] = ' + json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
print(f'{len(out)} templates')
