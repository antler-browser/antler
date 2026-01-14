# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the website for Antler, a demo app for the Local First Auth Spec (antlerbrowser.com). The site is built as a static website with a custom page generation system that converts markdown files to HTML.

## Architecture

### Blog Generation System
- **Source**: Markdown files in `blogs-drafts/` directory
- **Generator**: Node.js script at `src/generate-blog.js` using gray-matter and marked
- **Template**: `blog-template.html` with placeholder variables
- **Output**: HTML files generated in root directory

The blog generator:
1. Reads markdown files from `blogs-drafts/`
2. Extracts frontmatter metadata (title, date, author, etc.)
3. Converts markdown to HTML with custom link handling for external links
4. Applies the blog template and outputs to root directory

### Site Structure
- **Main page**: `index.html` - Homepage with profile and social links
- **Styling**: `style.css` (main), `blog-style.css` (blog-specific)
- **Blog posts**: Generated HTML files in root (e.g., `should-i-rebuild-my-app-on-blueskys-at-protocol.html`)
- **Assets**: `public/` directory contains favicons and manifest

## Common Commands

### Generate Blog Posts
```bash
cd src
npm run generate
```
This converts all markdown files in `blogs-drafts/` to HTML blog posts in the root directory.

### Add a New Blog Post
1. Create a markdown file in `blogs-drafts/` with frontmatter:
   ```markdown
   ---
   title: "Your Blog Title"
   date: "2024-01-01"
   description: "Brief description"
   author: "Daniel Mathews"
   author_image: "URL to author image"
   author_url: "https://bsky.app/profile/dmathewwws.com"
   ---
   
   Your blog content here...
   ```
2. Run the blog generator from the `src` directory

### Install Dependencies
```bash
cd src
npm install
```

## Key Technical Details

- External links in blog posts automatically get `target="_blank"` and `rel="noopener noreferrer"`
- Blog URLs are generated from slugified titles
- The generator removes duplicate H1 titles (uses frontmatter title instead)
- Favicons and web manifest are configured for all platforms