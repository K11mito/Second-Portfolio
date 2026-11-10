// The site's pages, for search engines: the mountain and its two destinations.
const base = 'https://aryendra.com'

export default function sitemap() {
  return [
    { url: base, changeFrequency: 'monthly', priority: 1 },
    { url: `${base}/projects`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/experience`, changeFrequency: 'monthly', priority: 0.7 },
  ]
}
