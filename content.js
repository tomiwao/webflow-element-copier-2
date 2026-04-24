(function initWebflowElementCopier() {
  if (window.__wfecInitialized) return;
  window.__wfecInitialized = true;

  const INTERNAL_ATTR = "data-wfec-internal";
  const DEFAULT_FONT_STACK = "system-ui, -apple-system, Segoe UI, sans-serif";
  const IMPORTANT_STYLE_PROPS = [
    "display",
    "position",
    "top",
    "right",
    "bottom",
    "left",
    "z-index",
    "flex",
    "flex-direction",
    "flex-wrap",
    "justify-content",
    "align-items",
    "align-content",
    "gap",
    "grid-template-columns",
    "grid-template-rows",
    "grid-column",
    "grid-row",
    "width",
    "height",
    "min-width",
    "min-height",
    "max-width",
    "max-height",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "border-top-style",
    "border-top-width",
    "border-top-color",
    "border-right-style",
    "border-right-width",
    "border-right-color",
    "border-bottom-style",
    "border-bottom-width",
    "border-bottom-color",
    "border-left-style",
    "border-left-width",
    "border-left-color",
    "border-top-left-radius",
    "border-top-right-radius",
    "border-bottom-left-radius",
    "border-bottom-right-radius",
    "background-color",
    "box-shadow",
    "opacity",
    "overflow",
    "overflow-x",
    "overflow-y",
    "color",
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "line-height",
    "letter-spacing",
    "text-align",
    "text-transform",
    "text-decoration",
    "white-space",
    "word-break",
    "visibility"
  ];

  const state = {
    selectionMode: false,
    hoveredElement: null,
    selectedElement: null,
    highlightBox: null,
    selectedBox: null,
    labelEl: null
  };

  function createOverlayElements() {
    if (!state.highlightBox) {
      const hl = document.createElement("div");
      hl.className = "__wfec-highlight";
      hl.setAttribute(INTERNAL_ATTR, "1");
      hl.style.display = "none";
      document.documentElement.appendChild(hl);
      state.highlightBox = hl;
    }
    if (!state.selectedBox) {
      const sel = document.createElement("div");
      sel.className = "__wfec-selected";
      sel.setAttribute(INTERNAL_ATTR, "1");
      sel.style.display = "none";
      document.documentElement.appendChild(sel);
      state.selectedBox = sel;
    }
    if (!state.labelEl) {
      const label = document.createElement("div");
      label.className = "__wfec-label";
      label.setAttribute(INTERNAL_ATTR, "1");
      label.style.display = "none";
      document.documentElement.appendChild(label);
      state.labelEl = label;
    }
  }

  function isInternalElement(target) {
    return target?.closest?.(`[${INTERNAL_ATTR}]`);
  }

  function isValidSelectionTarget(target) {
    if (!target || !(target instanceof HTMLElement)) return false;
    if (isInternalElement(target)) return false;
    if (target === document.documentElement || target === document.body) return false;
    return true;
  }

  function getElementLabel(el) {
    if (!el) return "";
    const id = el.id ? `#${el.id}` : "";
    const className = el.className && typeof el.className === "string"
      ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}`
      : "";
    return `${el.tagName.toLowerCase()}${id}${className}`;
  }

  function positionOverlay(overlay, rect) {
    overlay.style.left = `${rect.left + window.scrollX}px`;
    overlay.style.top = `${rect.top + window.scrollY}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.display = "block";
  }

  function updateLabel(el, rect) {
    if (!state.labelEl || !el || !rect) return;
    state.labelEl.textContent = getElementLabel(el);
    state.labelEl.style.display = "block";
    const labelTop = Math.max(0, rect.top + window.scrollY - 28);
    state.labelEl.style.left = `${rect.left + window.scrollX}px`;
    state.labelEl.style.top = `${labelTop}px`;
  }

  function hideHoverUI() {
    if (state.highlightBox) state.highlightBox.style.display = "none";
    if (state.labelEl) state.labelEl.style.display = "none";
  }

  function showSelectedUI(el) {
    if (!el || !state.selectedBox) return;
    const rect = el.getBoundingClientRect();
    positionOverlay(state.selectedBox, rect);
  }

  function clearSelectedUI() {
    if (state.selectedBox) state.selectedBox.style.display = "none";
  }

  function trackHover(target) {
    if (!state.selectionMode) return;
    if (!isValidSelectionTarget(target)) return;
    state.hoveredElement = target;
    const rect = target.getBoundingClientRect();
    positionOverlay(state.highlightBox, rect);
    updateLabel(target, rect);
  }

  function selectElement(el) {
    if (!isValidSelectionTarget(el)) return;
    state.selectedElement = el;
    showSelectedUI(el);
  }

  function onMouseMove(event) {
    if (!state.selectionMode) return;
    trackHover(event.target);
  }

  function onClick(event) {
    if (!state.selectionMode) return;
    if (!isValidSelectionTarget(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    selectElement(event.target);
    stopSelectionMode();
  }

  function onKeyDown(event) {
    if (!state.selectionMode) return;
    if (event.key === "Escape") {
      event.preventDefault();
      stopSelectionMode();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const base = state.hoveredElement || state.selectedElement;
      const parent = base?.parentElement;
      if (isValidSelectionTarget(parent)) {
        trackHover(parent);
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const base = state.hoveredElement || state.selectedElement;
      const child = base?.firstElementChild;
      if (isValidSelectionTarget(child)) {
        trackHover(child);
      }
    }
  }

  function onScrollOrResize() {
    if (state.selectionMode && state.hoveredElement) {
      const rect = state.hoveredElement.getBoundingClientRect();
      positionOverlay(state.highlightBox, rect);
      updateLabel(state.hoveredElement, rect);
    }
    if (state.selectedElement) {
      showSelectedUI(state.selectedElement);
    }
  }

  function startSelectionMode() {
    createOverlayElements();
    state.selectionMode = true;
    document.body.classList.add("__wfec-body-cursor");
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize, true);
  }

  function stopSelectionMode() {
    state.selectionMode = false;
    document.body.classList.remove("__wfec-body-cursor");
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("scroll", onScrollOrResize, true);
    window.removeEventListener("resize", onScrollOrResize, true);
    state.hoveredElement = null;
    hideHoverUI();
    if (state.selectedElement) {
      showSelectedUI(state.selectedElement);
    } else {
      clearSelectedUI();
    }
  }

  function cleanStringValue(value) {
    if (!value || value === "normal" || value === "none" || value === "auto" || value === "rgba(0, 0, 0, 0)") {
      return "";
    }
    return value.trim();
  }

  function normalizeFontFamily(fontFamily) {
    if (!fontFamily) return DEFAULT_FONT_STACK;
    const cleaned = fontFamily.replace(/["']/g, "");
    return cleaned || DEFAULT_FONT_STACK;
  }

  function extractComputedStyles(el) {
    const computed = window.getComputedStyle(el);
    const styles = {};
    IMPORTANT_STYLE_PROPS.forEach((prop) => {
      const raw = computed.getPropertyValue(prop);
      const value = prop === "font-family" ? normalizeFontFamily(raw) : cleanStringValue(raw);
      if (value) styles[prop] = value;
    });
    return styles;
  }

  function mapAttributes(el) {
    const attr = { id: el.id || "" };

    if (el instanceof HTMLAnchorElement) {
      if (el.href) attr.href = el.href;
      if (el.target) attr.target = el.target;
      if (el.rel) attr.rel = el.rel;
    }

    if (el instanceof HTMLImageElement) {
      if (el.currentSrc) attr.src = el.currentSrc;
      if (el.alt) attr.alt = el.alt;
      if (el.width) attr.width = el.width;
      if (el.height) attr.height = el.height;
    }

    if (el instanceof HTMLInputElement) {
      attr.type = el.type || "text";
      if (el.name) attr.name = el.name;
      if (el.placeholder) attr.placeholder = el.placeholder;
      if (el.value) attr.value = el.value;
    }

    if (el instanceof HTMLTextAreaElement) {
      if (el.name) attr.name = el.name;
      if (el.placeholder) attr.placeholder = el.placeholder;
      if (el.value) attr.value = el.value;
    }

    return { attr };
  }

  function generateUUID() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
    return template.replace(/[xy]/g, (char) => {
      const rand = Math.floor(Math.random() * 16);
      const value = char === "x" ? rand : (rand & 0x3) | 0x8;
      return value.toString(16);
    });
  }

  function normalizeWhitespaceText(text) {
    return text.replace(/\s+/g, " ").trim();
  }

  function inferWebflowNodeType(tag) {
    const t = tag.toLowerCase();
    if (/^h[1-6]$/.test(t)) return "Heading";
    if (t === "p") return "Paragraph";
    if (t === "img") return "Image";
    return "Block";
  }

  function styleMapToStyleLess(styleMap) {
    return Object.entries(styleMap)
      .map(([prop, value]) => `${prop}: ${value};`)
      .join(" ");
  }

  function convertDomToWebflowModel(root) {
    const nodes = [];
    const styles = [];
    const assets = [];

    function walk(el) {
      if (!(el instanceof HTMLElement)) return null;

      const nodeId = generateUUID();
      const styleId = generateUUID();
      const styleName = `wfec-${el.tagName.toLowerCase()}-${styles.length + 1}`;
      const computedStyleMap = extractComputedStyles(el);
      const mapped = mapAttributes(el);
      const childIds = [];
      const textNodeIds = [];

      for (const child of el.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          const text = normalizeWhitespaceText(child.textContent || "");
          if (!text) continue;
          const textId = generateUUID();
          nodes.push({
            _id: textId,
            text: true,
            v: text
          });
          textNodeIds.push(textId);
          continue;
        }
        if (child.nodeType === Node.ELEMENT_NODE) {
          const childNode = walk(child);
          if (childNode) childIds.push(childNode._id);
        }
      }

      const node = {
        _id: nodeId,
        type: inferWebflowNodeType(el.tagName),
        tag: el.tagName.toLowerCase(),
        classes: [styleId],
        children: [...textNodeIds, ...childIds],
        data: (() => {
          const data = {
            tag: el.tagName.toLowerCase(),
            text: textNodeIds.length > 0 && childIds.length === 0
          };
          const attrKeys = Object.keys(mapped.attr).filter((key) => mapped.attr[key] !== "");
          if (attrKeys.length > 0) data.attr = mapped.attr;
          return data;
        })()
      };

      const styleEntry = {
        _id: styleId,
        fake: false,
        type: "class",
        name: styleName,
        namespace: "",
        comb: "",
        styleLess: styleMapToStyleLess(computedStyleMap),
        variants: {},
        children: [],
        origin: null,
        selector: null
      };

      nodes.push(node);
      styles.push(styleEntry);
      return node;
    }

    const rootNode = walk(root);

    return {
      type: "@webflow/XscpData",
      payload: {
        nodes,
        styles,
        assets,
        ix1: [],
        ix2: {
          interactions: [],
          events: [],
          actionLists: []
        }
      },
      meta: {
        droppedLinks: 0,
        dynBindRemovedCount: 0,
        dynListBindRemovedCount: 0,
        paginationRemovedCount: 0,
        universalBindingsRemovedCount: 0,
        unlinkedSymbolCount: rootNode ? 0 : 1
      }
    };
  }

  function copyForWebflow() {
    if (!state.selectedElement || !document.contains(state.selectedElement)) {
      state.selectedElement = null;
      clearSelectedUI();
      return {
        ok: false,
        error: "No selected element found. Use Select Element first."
      };
    }
    try {
      const json = convertDomToWebflowModel(state.selectedElement);
      return {
        ok: true,
        payload: JSON.stringify(json)
      };
    } catch (error) {
      return {
        ok: false,
        error: `Failed to generate Webflow payload: ${error.message}`
      };
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message?.type) return;
    if (message.type === "START_SELECTION_MODE") {
      startSelectionMode();
      sendResponse({ ok: true });
      return true;
    }
    if (message.type === "COPY_FOR_WEBFLOW") {
      sendResponse(copyForWebflow());
      return true;
    }
    if (message.type === "GET_SELECTION_STATE") {
      sendResponse({
        ok: true,
        hasSelection: Boolean(state.selectedElement && document.contains(state.selectedElement)),
        label: state.selectedElement ? getElementLabel(state.selectedElement) : ""
      });
      return true;
    }
  });
})();
