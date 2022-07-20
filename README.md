# Mempool Unfurl Server

This is part #1 of a three-part open graph image preview proof-of-concept:
1) this standalone opengraph node server, using a cluster of puppeteer instances to capture screenshots.
2) a simplified `/preview/block` page added to the mempool frontend to produce the layout. (example at https://github.com/mononaut/mempool/tree/open-graph-previews)
3) nginx config to hijack crawler bot requests and serve the right set of open graph meta tags.

The process works something like:
- someone posts a link to a block page on twitter.
- twitterbot requests the page from `mempool.monospace.live/<page>`.
- nginx detects a bot request, and proxies to the open graph server instead.
- which returns a blank page with an `og:image` meta tag set to `https://preview.mempool.monospace.live/render/<page>`.
- twitterbot requests the `og:image` url.
- opengraph server loads `https://mempool.monospace.live/preview/<page>` in a puppeteer instance, takes a screenshot, and returns the image data on-the-fly.
- twitter caches the image and displays it as an embedded link preview.

![demo](https://user-images.githubusercontent.com/83316221/178790084-52c38512-0a8c-424b-be89-d451a4783b37.jpg)
