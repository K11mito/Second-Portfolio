export default function robots() {
  return {
    // (the summit's takedown page and the register's API are not for search)
    rules: { userAgent: '*', allow: '/', disallow: ['/summit/admin', '/api/'] },
    sitemap: 'https://aryendra.com/sitemap.xml',
  }
}
