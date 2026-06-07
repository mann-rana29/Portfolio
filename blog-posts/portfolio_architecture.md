---
title: "Building a Blazing Fast, Serverless Portfolio"
date: "2026-06-07"
description: "A deep dive into the architecture behind this portfolio. From a custom Static Site Generator to Vercel Serverless Functions and Supabase."
image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80"
---

Welcome to my portfolio! If you're reading this, you might be curious about how this site was built. As an engineer, I wanted my personal site to be a reflection of my philosophy: **keep it fast, keep it simple, and avoid over-engineering.**

Instead of reaching for heavy frameworks like Next.js or React, I decided to build this entirely from scratch using Vanilla Web Technologies, glued together with modern Serverless architecture.

Here is a deep dive into how it works.

## 1. The Frontend: Vanilla HTML, CSS, and JS

The frontend is completely framework-less. It relies on a meticulously crafted `index.html` file, styled with heavily optimized CSS variables for theming. 

By avoiding huge JavaScript bundles, the site loads almost instantaneously. I utilized native browser features like CSS Grid, Flexbox, and CSS Transitions to create a premium feel without the overhead.

![Minimal UI](https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80)

## 2. A Custom Static Site Generator (SSG)

If there's no framework, how does the blog work?

I built a custom Static Site Generator in Node.js (`build.js`). It reads Markdown files from a `blog-posts` directory, parses the Frontmatter for metadata (like the title, date, and description), and converts the Markdown into raw HTML using `marked`.

It then injects this HTML into a pre-defined template, adding SEO meta-tags and syntax-highlighting styles, before spitting out the final `.html` files into a `posts` folder. It even automatically generates a `sitemap.xml`!

```javascript
// A snippet of the build process
const content = fs.readFileSync(path.join(blogPostsDir, file), 'utf8');
const parsed = fm(content);
const html = marked.parse(parsed.body);
```

## 3. Serverless Backend with Vercel

A portfolio isn't completely alive without interaction. I wanted people to be able to leave a trace—a like or a comment.

Instead of spinning up a traditional Express.js server, I used **Vercel Serverless Functions**. Inside an `api/` directory, I wrote lightweight Node.js functions (`likes.js` and `comments.js`). When someone interacts with the site, Vercel spins up these functions on the edge, processes the request, and spins them down.

## 4. Supabase PostgreSQL

Where is the data stored? **Supabase**.

Supabase provides an open-source Firebase alternative powered by PostgreSQL. My serverless functions securely communicate with the Supabase database using the `@supabase/supabase-js` client.

```sql
-- The simple schema powering the interactions
CREATE TABLE public.likes (
    page_id TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0 NOT NULL
);
```

## 5. Optimistic UI

To make the site feel magical, the "Like" button uses Optimistic UI updates. 

When you click the heart, the JavaScript immediately updates the UI (turning the heart red and bumping the counter) *before* the server even replies. It sends the request to the backend in the background. If the request fails, it silently reverts the UI. This creates a zero-latency experience.

## Conclusion

Building this portfolio was a great exercise in going back to basics. It proves that you don't always need a massive Javascript framework to build something that is beautiful, interactive, and incredibly fast.

Leave a like below if you enjoyed the read!
