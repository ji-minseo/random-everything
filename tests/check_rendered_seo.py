"""Local browser checks (not proof of production HTTP behavior).

Install: pip install playwright && playwright install chromium
Run: python tests/check_rendered_seo.py
Optionally set BROWSER_EXECUTABLE to a system Chromium executable.
External requests are blocked so ads/network availability cannot affect results.
"""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import threading
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass  # Navigation may cancel an in-flight asset request.

    def send_error(self, code, message=None, explain=None):
        if code != 404:
            return super().send_error(code, message, explain)
        body = (ROOT / '404.html').read_bytes()
        self.send_response(404)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


SNAPSHOT = """() => ({
  title: document.title,
  description: document.querySelector('meta[name="description"]').content,
  canonical: document.querySelector('link[rel="canonical"]').href,
  h1: [...document.querySelectorAll('h1')].map(e => e.textContent),
  info: [...document.querySelectorAll('.info-card')].map(e => e.innerText),
  schema: [...document.querySelectorAll('script[type="application/ld+json"]')].map(e => JSON.parse(e.textContent)),
  links: [...new Set([...document.querySelectorAll('a[href]')].map(e => e.href))].sort()
})"""


def main():
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{server.server_port}'
    results = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=os.environ.get('BROWSER_EXECUTABLE'))
            context = browser.new_context()
            context.route('**/*', lambda route: route.continue_() if
                          urlsplit(route.request.url).netloc == urlsplit(origin).netloc else route.abort())
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            for path in sorted(ROOT.rglob('index.html')):
                if any(part.startswith('.') for part in path.relative_to(ROOT).parts):
                    continue
                suffix = path.parent.relative_to(ROOT).as_posix()
                url = origin + '/' + (suffix + '/' if suffix != '.' else '')
                response = context.request.get(url)
                assert response.status == 200, url
                # Disable JS to capture the browser's initial HTML interpretation.
                initial_context = browser.new_context(java_script_enabled=False)
                initial_context.route('**/*', lambda route: route.continue_() if
                                      urlsplit(route.request.url).netloc == urlsplit(origin).netloc else route.abort())
                initial = initial_context.new_page()
                initial.goto(url)
                before = initial.evaluate(SNAPSHOT)
                initial_context.close()
                errors.clear()
                page.goto(url)
                after = page.evaluate(SNAPSHOT)
                assert not errors, (url, errors)
                for key in ('title', 'description', 'canonical', 'h1', 'info', 'schema'):
                    assert before[key] == after[key], (url, key)
                assert set(before['links']) <= set(after['links']), url
                assert page.locator('h1').is_visible(), url
                assert page.locator('.tool-tabs').first.is_visible(), url
                results.append({'path': '/' + (suffix + '/' if suffix != '.' else ''),
                                'status': response.status, 'seo_unchanged': True,
                                'initial_links': len(before['links']), 'rendered_links': len(after['links'])})
            for path in ('/missing/', '/random-word-generator/missing/', '/a/b/c.html'):
                response = page.goto(origin + path)
                assert response.status == 404
                assert page.locator('meta[name="robots"]').get_attribute('content') == 'noindex, follow'
                assert page.locator('a.btn').evaluate('(a) => a.href') == origin + '/'
                assert page.locator('link[rel="stylesheet"]').evaluate('(a) => a.sheet !== null')
                page.locator('a.btn').click()
                assert page.url == origin + '/'
            assert context.request.get(origin + '/404.html').status == 200
            # Exercise the entry points most likely to reveal initialization errors.
            page.goto(origin + '/random-choice-generator/')
            page.locator('#items').fill('Alpha\nBeta')
            page.locator('#pick').click()
            assert page.locator('#choiceResult').inner_text() in ('Alpha', 'Beta')
            page.goto(origin + '/random-team-generator/')
            page.locator('#names').fill('A\nB\nC\nD')
            page.locator('#makeTeams').click()
            assert page.locator('.team-member').count() == 4
            assert not errors, errors
            browser.close()
        print(json.dumps({'pages': results, 'nested_404_cases': 3,
                          'tool_smoke_cases': 2, 'result': 'PASS'}, indent=2))
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
