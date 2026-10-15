# -*- coding: utf-8 -*-
"""testlib.py — harnais des tests (Python -> serveur local -> Node / Chromium headless -> JSON).

Utilisation (depuis un test_<id>.py du même dossier) :
    from testlib import run_browser, run_node, REPO_ROOT, GAME_DIR
Prérequis : Node >= 18 et Playwright installé globalement (npm i -g playwright ; npx playwright install chromium).
Aucun accès réseau externe : toute requête hors du serveur local est bloquée.
"""
import functools, json, os, subprocess, tempfile, threading, urllib.parse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

GAME_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(GAME_DIR)          # racine de Maths_Hub (servie comme sur GitHub Pages)
NPM = 'npm.cmd' if os.name == 'nt' else 'npm'


class _QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


class _QuietServer(ThreadingHTTPServer):
    daemon_threads = True

    def handle_error(self, request, client_address):
        pass  # coupures volontaires du navigateur (médias interrompus)


def serve_repo():
    """Sert REPO_ROOT sur un port libre. Retourne (serveur, url_de_base)."""
    srv = _QuietServer(('127.0.0.1', 0), functools.partial(_QuietHandler, directory=REPO_ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, 'http://127.0.0.1:%d' % srv.server_address[1]


def url_for(base, rel_path, query=''):
    """rel_path relatif à la racine du dépôt ; espaces et accents encodés (ex. 'La compagnie créole/chant.html')."""
    return base + '/' + urllib.parse.quote(rel_path) + (('?' + query) if query else '')


def _node_env():
    env = dict(os.environ)
    root = subprocess.run([NPM, 'root', '-g'], capture_output=True, text=True).stdout.strip()
    env['NODE_PATH'] = root + ((os.pathsep + env['NODE_PATH']) if env.get('NODE_PATH') else '')
    if 'PLAYWRIGHT_BROWSERS_PATH' not in env and os.path.isdir('/opt/pw-browsers'):
        env['PLAYWRIGHT_BROWSERS_PATH'] = '/opt/pw-browsers'
    return env


_NODE_TEMPLATE = r"""
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required',
    '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const context = await browser.newContext(__CONTEXT__);
  const page = await context.newPage();
  const errors = [], notFound = [], requests = [];
  page.on('pageerror', e => errors.push(String((e && e.message) || e)));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|ERR_ABORTED|net::/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('response', r => { if (r.status() >= 400) notFound.push(r.status() + ' ' + decodeURIComponent(r.url())); });
  page.on('request', r => requests.push(r.method() + ' ' + r.url()));
  await page.route('**/*', route => route.request().url().startsWith(__BASE__) ? route.continue() : route.abort());
  await page.goto(__URL__, { waitUntil: 'load' });
  let result = null;
  try { result = await (async (page, context) => { __BODY__ })(page, context); }
  catch (e) { errors.push('test: ' + ((e && e.message) || e)); }
  console.log('__RESULT__' + JSON.stringify({ result, errors, notFound, requests }));
  await browser.close();
})();
"""


def run_browser(rel_path, body_js, query='', viewport=(1366, 768), mobile=False, context_opts=None, timeout=180):
    """Ouvre rel_path dans Chromium headless puis exécute body_js, corps d'une fonction async (page, context)
    côté Node (utiliser page.evaluate(...) pour agir dans la page). Retourne
    {'result': ..., 'errors': [...], 'notFound': [...], 'requests': [...]}."""
    srv, base = serve_repo()
    try:
        ctx = {'viewport': {'width': viewport[0], 'height': viewport[1]}, 'hasTouch': mobile, 'isMobile': mobile}
        ctx.update(context_opts or {})
        script = (_NODE_TEMPLATE.replace('__CONTEXT__', json.dumps(ctx)).replace('__BASE__', json.dumps(base))
                  .replace('__URL__', json.dumps(url_for(base, rel_path, query))).replace('__BODY__', body_js))
        with tempfile.TemporaryDirectory() as td:
            path = os.path.join(td, 't.cjs')
            with open(path, 'w', encoding='utf-8') as f:
                f.write(script)
            out = subprocess.run(['node', path], capture_output=True, text=True, env=_node_env(), timeout=timeout)
        line = next((l for l in out.stdout.splitlines() if l.startswith('__RESULT__')), None)
        assert line, 'Pas de résultat Node (Playwright installé ?)\n' + out.stdout[-1500:] + out.stderr[-1500:]
        return json.loads(line[len('__RESULT__'):])
    finally:
        srv.shutdown()


def run_node(js_files, expr_js, timeout=60):
    """Charge des fichiers JS SANS DOM au chargement dans un contexte vm Node, évalue expr_js
    (expression, éventuellement une Promise) et retourne sa valeur JSON."""
    loader = r"""
const fs = require('fs'), vm = require('vm');
const ctx = { console, setTimeout, clearTimeout }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of __FILES__) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
Promise.resolve(vm.runInContext(__EXPR__, ctx)).then(v => console.log('__RESULT__' + JSON.stringify(v)));
""".replace('__FILES__', json.dumps([os.path.join(GAME_DIR, f) for f in js_files])).replace('__EXPR__', json.dumps(expr_js))
    out = subprocess.run(['node', '-e', loader], capture_output=True, text=True, timeout=timeout)
    line = next((l for l in out.stdout.splitlines() if l.startswith('__RESULT__')), None)
    assert line, 'Erreur Node :\n' + out.stderr[-1500:]
    return json.loads(line[len('__RESULT__'):])
