# matb-web-test → orbarch-edu redirect

This repository exists only to keep old links alive. The Orbital Architecture
web assessment battery moved from `magkosm.github.io/matb-web-test` to
`magkosm.github.io/orbarch-edu`.

`index.html` and `404.html` forward **every** old URL — root, deep links
(`/monitoring`, `/reaction-default`, …), query strings (`?lng=sv`) and hashes —
to the matching path on the new site.

## Publish (one-time)

1. Create a **new** GitHub repository named exactly **`matb-web-test`** under the
   `magkosm` account. (The old one was renamed to `orbarch-edu`; reusing the old
   name here is what restores the old Pages URL.)
2. Push these files to it:

   ```bash
   cd matb-web-test-redirect
   git init
   git add -A
   git commit -m "Redirect matb-web-test Pages to orbarch-edu"
   git branch -M main
   git remote add origin https://github.com/magkosm/matb-web-test.git
   git push -u origin main
   ```

   Or with the GitHub CLI:

   ```bash
   gh repo create magkosm/matb-web-test --public --source=. --push
   ```

3. In the new repo: **Settings → Pages → Build and deployment → Source:**
   *Deploy from a branch* → **`main`** / **`/ (root)`** → Save.

After a minute, `https://magkosm.github.io/matb-web-test/...` will redirect to
`https://magkosm.github.io/orbarch-edu/...`.

## Test

- https://magkosm.github.io/matb-web-test/ → new home
- https://magkosm.github.io/matb-web-test/reaction-default?lng=sv → new reaction test (Swedish)
- https://magkosm.github.io/matb-web-test/monitoring → new monitoring task
