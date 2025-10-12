#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');
const marked = require('marked');

// Configure marked for syntax highlighting
marked.setOptions({
  highlight: function(code, lang) {
    return code;
  }
});

// Custom renderer to handle target="_blank" attributes
const renderer = new marked.Renderer();

// Store the old link renderer
const oldLinkRenderer = renderer.link.bind(renderer);

// Override the link renderer
renderer.link = function(href, title, text) {
  const isExternal = (href.startsWith('http://') || href.startsWith('https://')) && !href.includes('antlerbrowser.com');
  
  // Check if this is an external link
  if (isExternal) {
    // Return link with target="_blank"
    return `<a href="${href}"${title ? ` title="${title}"` : ''} target="_blank" rel="noopener noreferrer">${text}</a>`;
  }
  // For all other links, use the default renderer
  return oldLinkRenderer(href, title, text);
};

marked.use({ renderer });

// Process markdown content to fix any malformed links
function preprocessMarkdown(content) {
  // Fix cases where the {:target="_blank"} might be outside the link
  return content.replace(/\[(.*?)\]\((.*?)\)(\{:target="_blank"\})/g, '[$1]($2{:target="_blank"})');
}

// Helper function to convert text to URL-friendly slug
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[-\s]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper function to format date
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Process a markdown file and extract its metadata and content
async function processMarkdownFile(filePath) {
  const fileContent = await fs.readFile(filePath, 'utf8');
  const { data, content } = matter(fileContent);
  
  // Get title from frontmatter
  const title = data.title;
  
  // Get date from frontmatter or file stats
  const stats = await fs.stat(filePath);
  const date = data.date ? new Date(data.date) : stats.mtime;
  const dateStr = date.toISOString().split('T')[0];
  
  // Remove the first h1 title since we'll use the frontmatter title
  const contentWithoutTitle = content.replace(/^#\s+.*$/m, '').trim();
  
  // Preprocess the markdown to fix any malformed links
  const preprocessedContent = preprocessMarkdown(contentWithoutTitle);
  
  // Convert markdown to HTML
  const htmlContent = marked.parse(preprocessedContent);
  
  // Generate author section HTML if author is provided
  const authorSection = data.author ? `
        <footer class="author-info">
          <img src="${data.author_image || ''}" alt="${data.author}" />
          <div class="author-details">
            <p class="author-name"><a href="${data.author_url || ''}" target="_blank">${data.author}</a></p>
            <p class="post-date">Written on ${formatDate(date)}</p>
          </div>
        </footer>` : '';
  
  return {
    title,
    date: dateStr,
    formatted_date: formatDate(date),
    content: htmlContent,
    slug: slugify(title),
    description: data.description || '',
    author: data.author || '',
    author_image: data.author_image || '',
    author_url: data.author_url || '',
    author_section: authorSection
  };
}

// Generate blog pages from markdown files
async function generateBlogPages() {
  try {
    // Read template from root directory instead of src
    const template = await fs.readFile(path.join(__dirname, '..', 'blog-template.html'), 'utf8');
    
    // Create blog directory if it doesn't exist
    await fs.mkdir(path.join(__dirname, '..', 'blogs-generated')).catch(() => {});
    
    // Get all markdown files
    const files = await fs.readdir(path.join(__dirname, '..', 'blogs-drafts'));
    const mdFiles = files.filter(file => file.endsWith('.md'));
    
    // Process each markdown file
    const blogPosts = [];
    for (const file of mdFiles) {
      const filePath = path.join(__dirname, '..', 'blogs-drafts', file);
      const postData = await processMarkdownFile(filePath);
      blogPosts.push(postData);
      
      // Generate the blog post HTML
      let postHtml = template;
      Object.entries(postData).forEach(([key, value]) => {
        postHtml = postHtml.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });
      
      // Write the blog post file to blogs-generated directory
      const outputPath = path.join(__dirname, '..', 'blogs-generated', `${postData.slug}.html`);
      await fs.writeFile(outputPath, postHtml);
    }
    
    // Sort blog posts by date (newest first)
    blogPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Move all generated files to root directory
    const generatedFiles = await fs.readdir(path.join(__dirname, '..', 'blogs-generated'));
    for (const file of generatedFiles) {
      const sourcePath = path.join(__dirname, '..', 'blogs-generated', file);
      const destPath = path.join(__dirname, '..', file);
      await fs.rename(sourcePath, destPath);
    }
    
    // Remove the blogs-generated directory
    await fs.rmdir(path.join(__dirname, '..', 'blogs-generated'));
    
    console.log(`Generated ${blogPosts.length} blog posts and moved them to root directory`);
  } catch (error) {
    console.error('Error generating blog pages:', error);
  }
}

// Run the generator
generateBlogPages(); 