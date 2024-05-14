# Broken ReadMe Link Finder (Local)

A quick locally run script to find broken links in your ReadMe documentation.

## How to use

1. Clone this repo locally.
1. [Export your ReadMe docs](https://docs.readme.com/main/docs/project-settings#export-markdown-data) into markdown files and unzip.
1. Update the `find_broken_links.js` file to point to your base url, and the folder where you extracted the markdown files.
1. Install the project dependencies with `npm install`.
1. Run the script with `npm start`.
1. View the output file to see broken links (if any) listed by the page the link was found on.
