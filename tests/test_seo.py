"""Static SEO contracts. Run: python -m unittest discover -s tests -v."""
import json
from html.parser import HTMLParser
from pathlib import Path
import unittest
from urllib.parse import urljoin, urlsplit
from urllib.robotparser import RobotFileParser
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://random.everytinytool.com"


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.tags = []
        self.text = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))

    def handle_data(self, data):
        self.text.append(data)

    def attrs(self, tag, **match):
        return [a for t, a in self.tags if t == tag
                and all(a.get(k) == v for k, v in match.items())]


class SEOTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = {p: Page(p.read_text()) for p in ROOT.rglob('index.html')
                     if not any(part.startswith('.') for part in p.relative_to(ROOT).parts)}

    def test_sitemap_matches_all_public_pages(self):
        urls = [e.text for e in ET.parse(ROOT / 'sitemap.xml').iter(
            '{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
        expected = {ORIGIN + '/' + str(p.parent.relative_to(ROOT)).strip('.')
                    + ('/' if p.parent != ROOT else '') for p in self.pages}
        self.assertEqual(len(urls), len(set(urls)))
        self.assertEqual(set(urls), expected)

    def test_metadata_and_canonicals(self):
        descriptions = []
        titles = []
        for path, page in self.pages.items():
            with self.subTest(path=path.relative_to(ROOT)):
                self.assertEqual(len(page.attrs('title')), 1)
                self.assertEqual(len(page.attrs('h1')), 1)
                description = page.attrs('meta', name='description')
                self.assertEqual(len(description), 1)
                self.assertTrue(description[0].get('content', '').strip())
                descriptions.append(description[0]['content'])
                # Parse title text separately to compare decoded titles.
                import re
                titles.append(re.search(r'<title>(.*?)</title>', path.read_text()).group(1))
                canonical = page.attrs('link', rel='canonical')
                self.assertEqual(len(canonical), 1)
                suffix = path.parent.relative_to(ROOT).as_posix()
                self.assertEqual(canonical[0]['href'], ORIGIN + '/' +
                                 (suffix + '/' if suffix != '.' else ''))
                self.assertFalse(page.attrs('meta', name='robots'))
                self.assertFalse(page.attrs('meta', name='googlebot'))
                self.assertFalse(page.attrs('meta', **{'http-equiv': 'refresh'}))
        self.assertEqual(len(titles), len(set(titles)))
        self.assertEqual(len(descriptions), len(set(descriptions)))

    def test_robots_allows_every_canonical(self):
        source = (ROOT / 'robots.txt').read_text()
        robots = RobotFileParser()
        robots.parse(source.splitlines())
        self.assertIn(ORIGIN + '/sitemap.xml', robots.site_maps())
        for page in self.pages.values():
            url = page.attrs('link', rel='canonical')[0]['href']
            self.assertTrue(robots.can_fetch('Googlebot', url), url)

    def test_local_links_and_assets_exist(self):
        for path, page in self.pages.items():
            base = page.attrs('link', rel='canonical')[0]['href']
            for tag, attrs in page.tags:
                ref = attrs.get('src') if tag == 'script' else attrs.get('href')
                if not ref:
                    continue
                url = urlsplit(urljoin(base, ref))
                if url.netloc != urlsplit(ORIGIN).netloc:
                    continue
                target = ROOT / url.path.lstrip('/')
                if target.is_dir():
                    target /= 'index.html'
                self.assertTrue(target.is_file(), (path, ref))

    def test_home_links_to_every_tool_without_javascript(self):
        home = self.pages[ROOT / 'index.html']
        urls = {urljoin(ORIGIN + '/', a['href']) for a in home.attrs('a') if 'href' in a}
        for path, page in self.pages.items():
            if path.parent != ROOT:
                self.assertIn(page.attrs('link', rel='canonical')[0]['href'], urls)

    def test_faq_json_is_valid_and_visible_question_count_matches(self):
        import re
        home = (ROOT / 'index.html').read_text()
        schema = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>',
                                     home, re.S).group(1))
        self.assertEqual(schema['@type'], 'FAQPage')
        self.assertEqual(len(schema['mainEntity']), len(self.pages[ROOT / 'index.html'].attrs('details')))
        for question in schema['mainEntity']:
            self.assertTrue(question['name'])
            self.assertTrue(question['acceptedAnswer']['text'])

    def test_error_page_recovers_from_nested_missing_urls(self):
        page = Page((ROOT / '404.html').read_text())
        for missing in ['/missing/', '/random-word-generator/missing/', '/a/b/c.html']:
            base = ORIGIN + missing
            for a in page.attrs('a'):
                self.assertEqual(urljoin(base, a['href']), ORIGIN + '/')
            for link in page.attrs('link', rel='stylesheet'):
                self.assertEqual(urljoin(base, link['href']), ORIGIN + '/assets/styles.css')

    def test_only_error_document_is_noindex(self):
        page = Page((ROOT / '404.html').read_text())
        robots = page.attrs('meta', name='robots')
        self.assertEqual(len(robots), 1)
        self.assertEqual(robots[0]['content'], 'noindex, follow')
        self.assertFalse(page.attrs('link', rel='canonical'))


if __name__ == '__main__':
    unittest.main()
