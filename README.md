# Element to Webflow

A Chrome extension that lets you copy any element from any website and paste it directly into Webflow Designer with styles preserved.

## Features

- Visual Element Picker: Click any element on any page to select it
- Full Subtree Capture: Copies the element and all its children
- Computed Style Extraction: Captures the actual rendered styles, not just class definitions
- Webflow-Compatible Output: Generates JSON in Webflow's native clipboard format
- Keyboard Navigation: Use arrow keys to navigate to parent/child elements

## Installation

### From Source (Developer Mode)

1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable Developer mode (toggle in top-right corner).
4. Click **Load unpacked**.
5. Select the `webflow-element-copier` folder.
6. The extension icon should appear in your toolbar.
7. If you want to copy from local `file://` pages, open the extension details page and enable **Allow access to file URLs**.

## Usage

### Step 1: Select an Element

1. Navigate to any website with elements you want to copy.
2. Click the extension icon in your toolbar.
3. Click **Select Element**.

The page enters selection mode:

- Hover over elements to highlight them
- Click to select an element
- Use `↑` arrow to select parent element
- Use `↓` arrow to select child element
- Press `Esc` to cancel

### Step 2: Copy for Webflow

1. After selecting, click the extension icon again.
2. Click **Copy for Webflow**.
3. The element is copied to your clipboard in Webflow format.

### Step 3: Paste in Webflow

1. Open Webflow Designer.
2. Click anywhere on the canvas.
3. Press `Ctrl+V` (Windows) or `Cmd+V` (Mac).
4. The element appears with styles preserved.

## How It Works

### Style Extraction

The extension uses `window.getComputedStyle()` to capture actual rendered styles:

- Cascaded styles from multiple CSS rules are combined
- Inherited styles are captured
- Media query state is reflected
- Browser-computed values are used

### Webflow JSON Format

Output uses Webflow's `@webflow/XscpData` shape:

```json
{
  "type": "@webflow/XscpData",
  "payload": {
    "nodes": [],
    "styles": [],
    "assets": [],
    "ix1": [],
    "ix2": {}
  }
}
```

## Limitations

### Known Limitations

- Images: image sources reference original URLs, and may need re-upload in Webflow.
- Custom Fonts: unsupported fonts in Webflow can fall back to available fonts.
- JavaScript Interactions: hover effects, runtime animations, and JS behavior are not captured.
- Pseudo-elements: `::before` and `::after` are not captured.
- CSS Variables: CSS custom properties are resolved to computed values.
- Complex Layouts: advanced CSS grid/flex setups may need minor manual adjustment.

### What Works Well

- Basic layout (flexbox, positioning)
- Typography (fonts, sizes, colors, spacing)
- Backgrounds (colors, gradients, images)
- Borders and border-radius
- Box shadows
- Opacity and visibility
- Basic transforms

## Troubleshooting

### "Cannot access this page"

- The extension cannot run on `chrome://` pages, the Chrome Web Store, and restricted browser pages.
- Try a regular website tab.

### "Refresh page and try again"

- Content script may not have loaded yet.
- Refresh the page and retry.

### Styles don't look right in Webflow

- Some CSS properties do not map 1:1 to Webflow controls.
- Complex interactions/animations must be recreated in Webflow Interactions.

### Copy doesn't work

- Ensure an element is selected first.
- Refresh the page and retry.
- Check DevTools console for extension errors.

## Development

### Project Structure

```text
webflow-element-copier/
├── manifest.json
├── popup.html
├── popup.js
├── content.js
├── content.css
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

### Key Files

- `content.js`: picker, style extractor, Webflow JSON generator
- `popup.js`: popup UI actions and clipboard copy bridge

### Building

No build step required. Load the extension folder directly in Chrome Developer Mode.

## License

MIT

## Credits

- Webflow clipboard format research from the Webflow community
- Finsweet CopyJSONButton implementation references
- Luca Mlakar component library tutorial inspiration
