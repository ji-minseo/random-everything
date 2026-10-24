# Random Everything

A fast, no-login collection of tiny browser-based random tools.

## MVP
- Random Color Generator
- Random Choice Generator
- Wheel Decider
- Random Team Generator
- Pictionary Word Generator

Everything runs client-side: no account, no backend, no database.

## Local preview
Open `index.html` with a local web server (for example VS Code Live Server or `python -m http.server`).

## SEO regression checks

Run static checks with `python -m unittest discover -s tests -v` (Python 3.12, no dependencies).
For local browser checks, install `playwright` with pip, run `playwright install chromium`,
then run `python tests/check_rendered_seo.py`. Set `BROWSER_EXECUTABLE` to use a system Chromium.
The browser checks block external requests and serve a local 404 document; they do not verify
production headers, redirects, DNS, CDN rules, or Google's indexing decisions.
Both checks run on pull requests in the Static SEO checks workflow, without deploying the site.

## Product principles
- Instant result
- Mobile-first
- No signup
- No server-side processing
- SEO-friendly standalone pages
- Shared lightweight UI and code
