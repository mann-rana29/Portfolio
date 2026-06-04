const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const fm = require('front-matter');

const blogPostsDir = path.join(__dirname, 'blog-posts');
const galleryHtmlPath = path.join(__dirname, 'gallery.html');

// Read gallery.html to use as our layout template
const galleryHtml = fs.readFileSync(galleryHtmlPath, 'utf8');

// Function to generate a page by replacing the hero and gallery sections
function generatePage(contentHtml, title, description, urlPath, image, showHero = true) {
  const fullUrl = `https://m4nn.vercel.app${urlPath}`;
  const imgUrl = image || 'https://res.cloudinary.com/mannr075/image/upload/v1779400279/logo_f2njz5.png';
  const displayTitle = title === 'Blog' ? 'my <em>Blog</em>.' : title;

  // We want to replace from <!-- ━━━ GALLERY HERO ━━━ --> down to right before <!-- ━━━ FOOTER ━━━ -->
  let topPart = galleryHtml.split(/<!--.*?GALLERY HERO.*?-->/i)[0];
  const bottomPartArray = galleryHtml.split(/<!--.*?FOOTER.*?-->/i);
  let bottomPart = '<!-- ━━━ FOOTER ━━━ -->' + bottomPartArray[bottomPartArray.length - 1];

  // Inject SEO tags
  topPart = topPart.replace(/<title>.*?<\/title>/, `<title>${title} | Mann's Portfolio</title>`);
  topPart = topPart.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${description}">`);
  topPart = topPart.replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${title}">`);
  topPart = topPart.replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${description}">`);
  topPart = topPart.replace(/<meta property="og:url" content=".*?">/, `<meta property="og:url" content="${fullUrl}">`);
  topPart = topPart.replace(/<meta property="og:image" content=".*?">/, `<meta property="og:image" content="${imgUrl}">`);
  topPart = topPart.replace(/<meta property="twitter:title" content=".*?">/, `<meta property="twitter:title" content="${title}">`);
  topPart = topPart.replace(/<meta property="twitter:description" content=".*?">/, `<meta property="twitter:description" content="${description}">`);
  topPart = topPart.replace(/<meta property="twitter:image" content=".*?">/, `<meta property="twitter:image" content="${imgUrl}">`);
  topPart = topPart.replace(/<link rel="canonical" href=".*?" \/>/, `<link rel="canonical" href="${fullUrl}" />`);

  // Fix Navbar active states: Shift from Gallery to Blog
  topPart = topPart.replace(/<a href="gallery\.html" style="color: var\(--text\);">Gallery<\/a>/, '<a href="gallery.html">Gallery</a>');
  topPart = topPart.replace(/<a href="blog\.html">Blog<\/a>/, '<a href="blog.html" style="color: var(--text);">Blog</a>');

  // Inject Fira Code font for code blocks and dates
  topPart = topPart.replace('</head>', `
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
  </head>`);

  // Also remove gallery-specific JS from the bottom
  bottomPart = bottomPart.replace(/\/\* ━━━ LIGHTBOX LOGIC ━━━ \*\/[\s\S]*?(?=<\/script>)/, '');
  bottomPart = bottomPart.replace(/\/\* ━━━ PHOTO STACK INTERACTION ━━━ \*\/[\s\S]*?(?=\/\* ━━━ ACTIVE NAV HIGHLIGHT ━━━ \*\/)/, '');
  bottomPart = bottomPart.replace(/\/\/ Re-initialize lightbox[\s\S]*?(?=<\/script>)/, '');

  // Inject flexbox to push footer to bottom
  topPart = topPart.replace('</head>', `
    <style>
      .border-wrapper { display: flex; flex-direction: column; min-height: 100vh; }
      .main-content { flex: 1; display: flex; flex-direction: column; }
    </style>
  </head>`);

  const heroSection = showHero ? `
    <!-- ━━━ BLOG HERO ━━━ -->
    <section class="hero" style="padding-bottom: 24px; border-bottom: none;">
      <div class="hero-inner">
        <div class="hero-content" style="text-align: center; width: 100%; display: flex; flex-direction: column; align-items: center;">
          <h1 class="reveal reveal-delay-1">
            ${displayTitle}
          </h1>
        </div>
      </div>
    </section>` : '';

  return `${topPart}
    <main class="main-content">
      ${heroSection}
      ${contentHtml}
    </main>
    ${bottomPart}`;
}

// 1. Read all markdown files
const files = fs.readdirSync(blogPostsDir).filter(f => f.endsWith('.md'));
const posts = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(blogPostsDir, file), 'utf8');
  const parsed = fm(content);
  const html = marked.parse(parsed.body);
  const slug = file.replace('.md', '');
  
  posts.push({
    slug,
    title: parsed.attributes.title,
    date: parsed.attributes.date,
    description: parsed.attributes.description,
    image: parsed.attributes.image,
    html
  });
}

// Sort posts by date descending
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

// 2. Generate individual post pages
const postStyle = `
    <style>
      .markdown-body { padding: 56px 24px; max-width: 720px; margin: 0 auto; color: var(--text); line-height: 1.8; font-size: 1.05rem; }
      .markdown-body h1 { font-size: 2.5rem; margin-bottom: 32px; letter-spacing: -0.03em; font-weight: 600; line-height: 1.2; }
      .markdown-body h2 { font-size: 1.75rem; margin-top: 48px; margin-bottom: 16px; font-weight: 500; letter-spacing: -0.02em; }
      .markdown-body h3 { font-size: 1.35rem; margin-top: 32px; margin-bottom: 12px; font-weight: 500; }
      .markdown-body p { margin-bottom: 24px; color: var(--text-dim); }
      .markdown-body a { color: var(--text); text-decoration: underline; text-decoration-color: var(--border-mid); text-underline-offset: 4px; transition: all 0.2s; }
      .markdown-body a:hover { color: var(--accent-green); text-decoration-color: var(--accent-green); }
      .markdown-body ul, .markdown-body ol { margin-bottom: 24px; padding-left: 24px; color: var(--text-dim); }
      .markdown-body li { margin-bottom: 10px; }
      .markdown-body pre { background: #111111; padding: 20px; border-radius: 12px; overflow-x: auto; margin-bottom: 28px; border: 1px solid var(--border); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
      [data-theme="light"] .markdown-body pre { background: #f8f9fa; }
      .markdown-body code { font-family: 'Fira Code', monospace; font-size: 0.85em; }
      .markdown-body p code, .markdown-body li code { background: var(--surface2); padding: 3px 6px; border-radius: 6px; border: 1px solid var(--border-mid); color: var(--text); }
      .markdown-body blockquote { border-left: 3px solid var(--text); padding-left: 20px; color: var(--text); margin: 32px 0; font-style: italic; background: var(--surface); padding: 20px; border-radius: 0 12px 12px 0; }
    </style>
`;

// Array to collect sitemap URLs
const sitemapUrls = [
  'https://m4nn.vercel.app/',
  'https://m4nn.vercel.app/gallery.html',
  'https://m4nn.vercel.app/blog.html'
];

if (!fs.existsSync(path.join(__dirname, 'posts'))) {
  fs.mkdirSync(path.join(__dirname, 'posts'));
}

for (const post of posts) {
  const postContent = `
    ${postStyle}
    <article id="post-content" class="markdown-body reveal visible">
      <!-- ━━━ BACK NAV ━━━ -->
      <div style="margin-bottom: 40px;">
        <a href="../blog.html" class="btn-sm" style="display: inline-flex;">← Back to Blog</a>
      </div>
      <h1>${post.title}</h1>
      <div style="color: var(--accent-green); font-family: 'Fira Code', monospace; margin-top: -16px; margin-bottom: 40px; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">${post.date}</div>
      ${post.html}
    </article>
  `;
  
  // Fix paths since posts are in /posts/ directory
  let pageHtml = generatePage(postContent, post.title, post.description, '/posts/' + post.slug + '.html', post.image, false);
  pageHtml = pageHtml.replace(/href="index\.html"/g, 'href="../index.html"');
  pageHtml = pageHtml.replace(/href="gallery\.html"/g, 'href="../gallery.html"');
  pageHtml = pageHtml.replace(/href="blog\.html"/g, 'href="../blog.html"');
  pageHtml = pageHtml.replace(/src="https/g, 'src="https'); // absolute URLs are fine
  
  fs.writeFileSync(path.join(__dirname, 'posts', `${post.slug}.html`), pageHtml);
  sitemapUrls.push(`https://m4nn.vercel.app/posts/${post.slug}.html`);
}

// 3. Generate blog list page
const blogListStyle = `
    <style>
      .blog-list { padding: 40px 24px; max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 0; }
      .blog-row { display: grid; grid-template-columns: 140px 1fr; gap: 24px; padding: 24px 16px; border-bottom: 1px solid var(--border-mid); text-decoration: none; transition: all 0.2s ease; border-radius: 8px; align-items: start; }
      .blog-image { width: 140px; height: 90px; border-radius: 8px; overflow: hidden; background: var(--surface2); }
      .blog-image img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease; }
      .blog-row:hover { background: var(--surface2); border-bottom-color: transparent; }
      .blog-row:hover .blog-image img { transform: scale(1.05); }
      .blog-content { display: flex; flex-direction: column; gap: 6px; }
      .blog-title { font-size: 1.25rem; font-weight: 500; color: var(--text); letter-spacing: -0.01em; }
      .blog-desc { font-size: 0.95rem; line-height: 1.6; color: var(--text-dim); }
      .blog-date { font-size: 0.75rem; color: var(--text-muted); font-family: 'Fira Code', monospace; margin-top: 4px; }
      @media(max-width: 600px) {
        .blog-row { grid-template-columns: 100px 1fr; gap: 16px; padding: 20px 12px; }
        .blog-image { width: 100px; height: 70px; }
      }
    </style>
`;

let listHtml = blogListStyle + '<section id="blog-content" style="border-top: 1px solid var(--border);"><div class="blog-list">';

posts.forEach((post, i) => {
  const delays = ['', 'reveal-delay-1', 'reveal-delay-2', 'reveal-delay-3'];
  const delayClass = delays[i % 4];
  // Default placeholder image if none is provided in frontmatter
  const imgUrl = post.image || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=60';
  
  listHtml += `
    <a href="posts/${post.slug}.html" class="blog-row reveal ${delayClass} visible">
      <div class="blog-image">
        <img src="${imgUrl}" alt="${post.title}" loading="lazy">
      </div>
      <div class="blog-content">
        <div class="blog-title">${post.title}</div>
        <div class="blog-desc">${post.description}</div>
        <div class="blog-date">${post.date}</div>
      </div>
    </a>`;
});
listHtml += '</div></section>';

fs.writeFileSync(path.join(__dirname, 'blog.html'), generatePage(listHtml, 'Blog', 'Read the latest software engineering articles and logs by Mann Rana.', '/blog.html', null));

// 4. Generate sitemap.xml
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(url => `  <url>\n    <loc>${url}</loc>\n    <changefreq>weekly</changefreq>\n  </url>`).join('\n')}
</urlset>`;
fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemapXml);

console.log('Blog and Sitemap build complete!');
