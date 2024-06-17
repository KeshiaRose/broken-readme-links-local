const fs = require("fs");
const path = require("path");
const recursive = require("recursive-readdir");
const frontMatter = require("front-matter");

const baseUrl = "https://dev.fingerprint.com"; // Base URL of the documentation, no trailing slash
const docFilesFolder = "./exported/v3"; // Local folder with markdown files exported from ReadMe you want to check
const outputFile = "broken_links_report.json"; // File name to write the broken links report to

// Main function: Get all the broken links in your dcumentation
async function getBrokenLinks() {
  const files = await readMarkdownFiles(docFilesFolder);
  let allPageHeadings = {};
  let allLinks = {};

  // Extract headings and links from each file
  for (const file of files) {
    const content = await readFileContent(file);
    const fileName = path.basename(file, path.extname(file));
    const { attributes, body } = content;

    const headings = extractHeadings(body);
    allPageHeadings[fileName] = headings;

    // Skip links in hidden files (Keep this?) and external link pages
    if (attributes.hidden || (attributes.type && attributes.type == "link"))
      continue;
    const links = extractLinks(fileName, body);
    allLinks[fileName] = links;
  }
  appendAnchorNumbers(allPageHeadings);

  // fs.writeFileSync("pages.json", JSON.stringify(allPageHeadings, null, 2));

  // Check if links are valid
  const brokenLinks = {};
  let brokenLinksCount = 0;
  for (const page in allLinks) {
    for (const link of allLinks[page]) {
      const validation = validateLink(link, allPageHeadings);
      if (validation.missingPage || validation.missingAnchor) {
        if (!brokenLinks[page]) {
          brokenLinks[page] = [];
        }
        let problem = validation.missingPage
          ? "Missing page"
          : "Missing anchor";
        brokenLinks[page].push({ problem, ...link });
        brokenLinksCount++;
      }
    }
  }

  // If there are broken links, write them to a file
  fs.writeFile(outputFile, JSON.stringify(brokenLinks, null, 2), (err) => {
    if (err) {
      console.error(
        `${brokenLinksCount} broken links found but error writing broken links report:`,
        err
      );
    } else {
      console.log(
        `${brokenLinksCount > 0 ? brokenLinksCount : "No"} broken links found!`
      );
      console.log(`${outputFile} updated with broken links report.`);
    }
  });
}

// Get all markdown files in a directory
async function readMarkdownFiles(directory) {
  return new Promise((resolve, reject) => {
    recursive(directory, ["!*.md"], (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  });
}

// Read content of a file
async function readFileContent(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        reject(err);
      } else {
        const content = frontMatter(data);
        resolve(content);
      }
    });
  });
}

// Extract headings from markdown content
function extractHeadings(content) {
  const headingRegex = /^(#+)\s+(.*)$/gm;
  let match;
  const headings = [];
  while ((match = headingRegex.exec(content)) !== null) {
    const text = match[2];
    const anchor = text
      .toLowerCase()
      .replace(/\s/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    headings.push({
      level: match[1].length,
      text,
      anchor,
    });
  }
  return headings;
}

// Append numbers to anchor if there are multiple headings with the same anchor
function appendAnchorNumbers(pages) {
  for (const page in pages) {
    const anchorCount = {};
    pages[page].forEach((heading, index) => {
      const anchor = heading.anchor;
      if (anchorCount[anchor]) {
        pages[page][index].anchor = `${anchor}-${anchorCount[anchor]}`;
        anchorCount[anchor]++;
      } else {
        anchorCount[anchor] = 1;
      }
    });
  }
}

// Extract links from markdown content
function extractLinks(page, content) {
  const escapedBaseUrl = baseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const urlLinkRegex = new RegExp(
    `\\[([^\\]]+)\\]\\(${escapedBaseUrl}/\\w+/([\\w-]+)#([\\w-]+)\\)`,
    "g"
  );
  const readmeLinkRegex = /\[([^\]]+)\]\(doc:([\w-]+)#([\w-]+)\)/g;
  const anchorLinkRegex = /\[([^\]]+)\]\(#([\w-]+)\)/g;
  let match;
  const links = [];

  // Extract full URL links
  while ((match = urlLinkRegex.exec(content)) !== null) {
    links.push({
      linkType: "Full url",
      linkText: match[1],
      pageLinkedTo: match[2],
      anchorLinkedTo: match[3],
    });
  }

  // Extract ReadMe-style links
  while ((match = readmeLinkRegex.exec(content)) !== null) {
    links.push({
      linkType: "ReadMe link",
      linkText: match[1],
      pageLinkedTo: match[2],
      anchorLinkedTo: match[3],
    });
  }

  // Extract anchor links
  while ((match = anchorLinkRegex.exec(content)) !== null) {
    links.push({
      linkType: "Anchor link",
      linkText: match[1],
      pageLinkedTo: page,
      anchorLinkedTo: match[2],
    });
  }

  return links;
}

// Check if a link is valid
function validateLink(link, pages) {
  let verdict = { missingPage: false, missingAnchor: false };

  // Whole page is missing
  if (!pages[link.pageLinkedTo]) {
    verdict.missingPage = true;
    verdict.missingAnchor = true;
    return verdict;
  }

  // Page exists but anchor is missing
  const pageHeadings = pages[link.pageLinkedTo];
  const anchorFound = pageHeadings.some(
    (heading) => heading.anchor === link.anchorLinkedTo
  );
  if (!anchorFound) {
    verdict.missingAnchor = true;
  }

  return verdict;
}

getBrokenLinks();
