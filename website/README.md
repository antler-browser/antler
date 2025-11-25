# Antler Website

This is the website for Antler, available at antlerbrowser.com. It is a static website that is built with a custom page generation system that converts markdown files to HTML. It shows how to download the Antler app and learn more about Antler and how the open specification for IRL browsers works.

## To view the website locally
1. Go to the `src` directory.
2. Run `npm run generate`.
3. Open `index.html` or any other HTML file in your browser.

## To add a new blog post
1. Create a new markdown file in the `blogs-drafts` directory.
2. Run `npm run generate`.
3. Open the new HTML file in your browser.

## Contributing
See [blog-drafts](./blogs-drafts) for the markdown files that get generated into HTML files. You can edit the markdown files to add a new one and then run `npm run generate` to see the changes.