# Inkwell — Blogging Platform

A lightweight, browser-based blogging platform for writing, editing, organising, and publishing posts. Built with **HTML, CSS, and vanilla JavaScript**, with no frameworks or build tools required.

## Features

- **Create and edit posts** — write new articles and update existing ones.
- **Drafts and publishing** — save unfinished work as drafts or publish it when ready.
- **Search and filters** — find posts by title, content, or tags; filter by publication status.
- **Tags** — organise posts with up to six tags per post.
- **Markdown-style writing** — format content with headings, bold, italic, links, lists, quotes, and code blocks.
- **Live preview** — preview formatted content before saving.
- **Reading-time estimate** — see an approximate reading time for each post.
- **Backup and restore** — export posts as a JSON file and import a backup later.
- **Responsive and accessible UI** — keyboard-friendly navigation, visible focus styles, and support for the system light/dark theme.

## Tech Stack

- HTML5
- CSS3
- JavaScript (ES6+)
- Browser `localStorage` for post persistence

## Getting Started

No installation or build step is needed.

1. Clone the repository:
   ```bash
   git clone https://github.com/faisalshaik78/blogging-platform.git
   ```
2. Open the project folder.
3. Open `index.html` in your web browser.

You can also use a local development server, such as the VS Code Live Server extension.

## Project Structure

```text
blogging-platform/
├── index.html   # App structure and page metadata
├── style.css    # Layout, styling, and responsive theme
├── script.js    # Routing, editor, post management, and backup logic
└── README.md    # Project documentation
```

## How It Works

- Posts are stored in the current browser using `localStorage`; they are not uploaded to a server.
- The app uses hash-based navigation for the post list, editor, and individual post pages.
- The editor supports a small Markdown-style syntax and includes a preview tab.
- Use **Export backup** to download your posts as JSON. Use **Import backup** to restore or merge posts from a valid backup file.

## Important Notes

- Posts are stored locally in the browser and are specific to that browser profile and device.
- Clearing browser site data can remove saved posts. Export a backup regularly if you want to keep your content.
- This is a front-end project. It does not currently include user accounts, a remote database, or server-side publishing.

## Future Improvements

- Add user authentication and a backend API.
- Store posts in a database so they can be accessed across devices.
- Add image uploads and richer Markdown support.
- Add pagination and post sorting options.

## Author

**Shaik Faisal**

- GitHub: [@faisalshaik78](https://github.com/faisalshaik78)

---

If you find this project useful, feel free to explore the code, try it locally, or suggest an improvement.
