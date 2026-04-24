const statusEl = document.getElementById("status");
const selectBtn = document.getElementById("selectBtn");
const copyBtn = document.getElementById("copyBtn");
const testBtn = document.getElementById("testBtn");

function setStatus(message, tone = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${tone}`.trim();
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    throw new Error("No active tab found.");
  }
  return tab;
}

function isRestrictedUrl(url = "") {
  return /^(chrome|edge|brave|about):/i.test(url) || url.includes("chrome.google.com/webstore");
}

function sendMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message));
        return;
      }
      resolve(response || {});
    });
  });
}

async function writeWebflowClipboard(payload) {
  const jsonPayload = typeof payload === "string" ? payload : JSON.stringify(payload);

  const copyUsingExecCommand = () =>
    new Promise((resolve, reject) => {
      const onCopy = (event) => {
        try {
          event.clipboardData?.setData("application/json", jsonPayload);
          event.clipboardData?.setData("text/plain", jsonPayload);
          event.preventDefault();
        } catch (error) {
          reject(error);
        }
      };

      document.addEventListener("copy", onCopy, { once: true });
      const ok = document.execCommand("copy");
      if (!ok) {
        reject(new Error("execCommand copy returned false."));
        return;
      }
      resolve();
    });

  try {
    await copyUsingExecCommand();
    return;
  } catch (_error) {
    // Continue to API-based fallbacks.
  }

  if (navigator.clipboard?.write && window.ClipboardItem) {
    try {
      const item = new ClipboardItem({
        "application/json": new Blob([jsonPayload], { type: "application/json" }),
        "text/plain": new Blob([jsonPayload], { type: "text/plain" })
      });
      await navigator.clipboard.write([item]);
      return;
    } catch (_error) {
      // Continue to plain text fallback.
    }
  }

  await navigator.clipboard.writeText(jsonPayload);
}

function buildMinimalTestPayload() {
  const blockId = crypto.randomUUID();
  const classId = crypto.randomUUID();
  const textId = crypto.randomUUID();
  return {
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: blockId,
          tag: "div",
          classes: [classId],
          children: [textId],
          type: "Block",
          data: {
            tag: "div",
            text: false
          }
        },
        {
          _id: textId,
          text: true,
          v: "Pasted from Element to Webflow"
        }
      ],
      styles: [
        {
          _id: classId,
          fake: false,
          type: "class",
          name: "wfec-test-block",
          namespace: "",
          comb: "",
          styleLess: "display: block; padding-top: 12px; padding-right: 12px; padding-bottom: 12px; padding-left: 12px; background-color: rgb(241, 245, 249); color: rgb(15, 23, 42);",
          variants: {},
          children: [],
          selector: null
        }
      ],
      assets: [],
      ix1: [],
      ix2: {
        interactions: [],
        events: [],
        actionLists: []
      }
    },
    meta: {
      unlinkedSymbolCount: 0,
      droppedLinks: 0,
      dynBindRemovedCount: 0,
      dynListBindRemovedCount: 0,
      paginationRemovedCount: 0
    }
  };
}

selectBtn.addEventListener("click", async () => {
  try {
    const tab = await getActiveTab();
    if (isRestrictedUrl(tab.url)) {
      setStatus("Cannot access this page. Try a regular website tab.", "warn");
      return;
    }
    await sendMessage(tab.id, { type: "START_SELECTION_MODE" });
    setStatus("Selection mode is active. Click the page to pick an element.", "ok");
  } catch (error) {
    setStatus("Refresh page and try again. Content script may not be ready.", "warn");
  }
});

copyBtn.addEventListener("click", async () => {
  try {
    const tab = await getActiveTab();
    if (isRestrictedUrl(tab.url)) {
      setStatus("Cannot access this page. Try a regular website tab.", "warn");
      return;
    }
    const result = await sendMessage(tab.id, { type: "COPY_FOR_WEBFLOW" });
    if (!result || !result.ok || !result.payload) {
      setStatus(result?.error || "Select an element first, then copy again.", "warn");
      return;
    }
    await writeWebflowClipboard(result.payload);
    const size = new Blob([result.payload]).size;
    setStatus(`Copied Webflow JSON (${size} bytes). Paste with Cmd/Ctrl + V.`, "ok");
  } catch (error) {
    setStatus(`Copy failed: ${error.message}`, "warn");
  }
});

testBtn.addEventListener("click", async () => {
  try {
    const payload = buildMinimalTestPayload();
    const text = JSON.stringify(payload);
    await writeWebflowClipboard(text);
    setStatus("Copied minimal test payload. Try pasting this in Webflow now.", "ok");
  } catch (error) {
    setStatus(`Test copy failed: ${error.message}`, "warn");
  }
});

async function refreshSelectionState() {
  try {
    const tab = await getActiveTab();
    if (isRestrictedUrl(tab.url)) {
      setStatus("This page is restricted. Open a normal webpage to use the picker.", "warn");
      return;
    }
    const res = await sendMessage(tab.id, { type: "GET_SELECTION_STATE" });
    if (res?.hasSelection) {
      setStatus(`Element selected: ${res.label}`, "ok");
    } else {
      setStatus("Select an element first, then copy it to clipboard.", "");
    }
  } catch (_error) {
    setStatus("Refresh page and try again. For local files, enable: Extensions > Element to Webflow > Allow access to file URLs.", "warn");
  }
}

refreshSelectionState();
