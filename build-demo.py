"""Build the offline preview from current local modules; no build dependencies."""
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parent.parent
IMPORT = re.compile(r"^\s*import\s*\{([^}]+)\}\s*from\s*['\"]([^'\"]+)['\"];?", re.M)
ENTRY = "__demo_entry.js"


def build():
    modules = {}
    requested = {}
    inputs = {}

    def read(name):
        raw = (ROOT / name).read_bytes()
        inputs[name] = hashlib.sha256(raw).hexdigest()
        return raw.decode()

    def resolve(parent, relative):
        if not relative.startswith('.'):
            raise ValueError(f"Demo imports must be local: {relative}")
        return (ROOT / parent).parent.joinpath(relative).resolve().relative_to(ROOT).as_posix()

    def visit(name, source=None):
        if name in modules:
            return
        source = read(name) if source is None else source
        modules[name] = source
        for match in IMPORT.finditer(source):
            target = resolve(name, match[2])
            for binding in match[1].split(','):
                binding = binding.strip()
                if binding:
                    requested.setdefault(target, set()).add(binding.split(' as ')[0].strip())
            visit(target)

    css = json.dumps(read('style.css'), ensure_ascii=False)
    entry = """import {createArcade} from './arcade.js';
const KEY='paw_arcade_demo_v1';
createArcade({cssText:CSS,
  load(){try{return JSON.parse(localStorage.getItem(KEY)||'{}');}catch{return {};}},
  save(value){localStorage.setItem(KEY,JSON.stringify(value));}
});
""".replace('cssText:CSS', 'cssText:' + css)
    visit(ENTRY, entry)
    parts = []
    for name, source in modules.items():
        def replace_import(match):
            fields = [s.strip().replace(' as ', ':') for s in match[1].split(',') if s.strip()]
            return 'const {' + ','.join(fields) + '}=require(' + json.dumps(resolve(name, match[2])) + ');'

        source = IMPORT.sub(replace_import, source)
        source = re.sub(r'(?m)^(\s*)export\s+(?=(?:async\s+)?(?:function|class|const|let|var)\b)', r'\1', source)
        source = re.sub(r'^\s*export\s*\{[^}]+\};?', '', source, flags=re.M)
        source = source.replace('import.meta.url', f'new URL({json.dumps("./" + name)},document.baseURI).href')
        if re.search(r'^\s*(?:import|export)\s', source, re.M):
            raise ValueError(f"Unsupported module syntax in {name}")
        exports = ','.join(sorted(requested.get(name, [])))
        parts.append(json.dumps(name) + ':function(require,exports){\n' + source + '\nObject.assign(exports,{' + exports + '});\n}')

    script = ('(()=>{\nconst modules={' + ',\n'.join(parts)
              + '};\nconst cache={};\nfunction require(id){if(cache[id])return cache[id];'
              + 'const out=cache[id]={};modules[id](require,out);return out;}\n'
              + '// PAW_DEMO_START\nrequire("' + ENTRY + '");\n})();')
    template = read('tools/demo-template.html')
    read('tools/build-demo.py')
    metadata = '<script type="application/json" id="paw-demo-build">' + json.dumps(inputs, sort_keys=True) + '</script>'
    html = template.replace('<!-- PAW_DEMO_BUILD -->', metadata + '\n<script>\n' + script.replace('</script', '<\\/script') + '\n</script>')
    (ROOT / 'demo.html').write_text(html)
    print(f'Built demo.html from {len(modules) - 1} current modules ({len(html.encode())} bytes).')


if __name__ == '__main__':
    build()
