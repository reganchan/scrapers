// ==UserScript==
// @name         Shuqi.com Chapter Scraper (Multi-Catalog)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Scrape and store chapters from reader.com (supports multiple catalogs)
// @match        https://t.shuqi.com/catalog/*
// @match        https://t.shuqi.com/reader/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// ==/UserScript==

(async function() {
  'use strict';

  /*********************
   * Utility Functions *
   *********************/
  const iframeSelector = '#app .sand-content iframe';

  function waitForElement(selector, doc = document, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const el = doc.querySelector(selector);
      if (el) return resolve(el);
      const obs = new MutationObserver(() => {
        const node = doc.querySelector(selector);
        if (node) {
          obs.disconnect();
          resolve(node);
        }
      });
      obs.observe(doc, { childList: true, subtree: true });
      setTimeout(() => {
        obs.disconnect();
        reject(`Timeout waiting for selector: ${selector}`);
      }, timeout);
    });
  }

  /**************************
   * Catalog ID + Migration *
   **************************/
  function getCatalogId() {
    const m = location.href.match(/(?:catalog|reader)\/(\d+)/);
    return m ? m[1] : 'unknown';
  }

  function getCatalogData() {
    const catalogs = GM_getValue('catalogs', {});
    const id = getCatalogId();
    if (!catalogs[id]) catalogs[id] = { chapters: [], currentIndex: 0 };
    return { catalogs, id };
  }

  function saveCatalogData(id, data) {
    const catalogs = GM_getValue('catalogs', {});
    catalogs[id] = data;
    GM_setValue('catalogs', catalogs);
  }

  /*********************
   * Control Panel UI  *
   *********************/
  function addControlButtons() {
    const panel = document.createElement('div');
    panel.style = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 99999;
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 8px 10px;
      border-radius: 8px;
      font-size: 14px;
    `;

    const startBtn = document.createElement('button');
    startBtn.textContent = '▶ Start Scraping';
    startBtn.style = 'margin:2px;padding:5px;';
    startBtn.onclick = scrapeChapters;

    const exportBtn = document.createElement('button');
    exportBtn.textContent = '💾 Export JSON';
    exportBtn.style = 'margin:2px;padding:5px;';
    exportBtn.onclick = exportChapters;

    const resetBtn = document.createElement('button');
    resetBtn.textContent = '🔁 Reset Progress';
    resetBtn.style = 'margin:2px;padding:5px;';
    resetBtn.onclick = () => {
      const { catalogs, id } = getCatalogData();
      catalogs[id] = { chapters: [], currentIndex: 0 };
      GM_setValue('catalogs', catalogs);
      alert(`Progress reset for catalog ${id}.`);
    };

    const fixBtn = document.createElement('button');
    fixBtn.textContent = '🩹 Fix This Chapter';
    fixBtn.style = 'margin:2px;padding:5px;';
    fixBtn.onclick = fixCurrentChapter;

    const importBtn = document.createElement('button');
    importBtn.textContent = '📤 Import JSON';
    importBtn.style = 'margin:2px;padding:5px;';
    importBtn.onclick = importChapters;

    panel.append(startBtn, exportBtn, importBtn, resetBtn, fixBtn);
    document.body.appendChild(panel);
  }

  /*************************
   * Chapter Scraping Core *
   *************************/
  async function scrapeChapters() {
    const { catalogs, id } = getCatalogData();
    let { chapters, currentIndex } = catalogs[id];

    const items = Array.from(document.querySelectorAll('#app .view .catalog .list li'));
    console.log(`Found ${items.length} items in catalog ${id}.`);

    for (let i = currentIndex; i < items.length; i++) {
      const item = items[i];
      item.scrollIntoView();
      await new Promise(r => setTimeout(r, 300));

      console.log(`Clicking chapter ${i}: ${item.innerText}`);
      item.click();
      await new Promise(r => setTimeout(r, 2000));

      // Verify correct chapter
      /*
      const params = new URLSearchParams(location.search);
      const forceIndex = Number(params.get('forceChapterIndex'));
      if (forceIndex !== i) {
        console.warn(`⚠ Mismatch! Expected index ${i}, got ${forceIndex}. Skipping.`);
        history.back();
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      const iframe = await waitForElement(iframeSelector);
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      await waitForElement('h1.sq-title', iframeDoc);

      const title = iframeDoc.querySelector('h1.sq-title')?.innerText.trim();
      const paras = Array.from(iframeDoc.querySelectorAll('p.sand-p')).map(p => p.innerText.trim());
      const lastUpdated = new Date().toLocaleString();

      const idx = chapters.findIndex(c => c.index === i);
      if (idx >= 0) {
        const firstUpdated = chapters[idx].firstUpdated;
        chapters[idx] = { index: i, title, paras, firstUpdated, lastUpdated };
        console.log(`🔁 Replaced chapter index ${forceIndex} (${title})`);
      } else {
        const firstUpdated = lastUpdated;
        chapters.push({ index: i, title, paras, firstUpdated, lastUpdated });
        console.log(`➕ Added missing chapter index ${forceIndex} (${title})`);
      }

      saveCatalogData(id, { chapters, currentIndex: i + 1 });
      */
      await fixCurrentChapter();

      history.back();
      await new Promise(r => setTimeout(r, 2000));
    }

    alert(`✅ Scraping complete for catalog ${id}.`);
  }

  /*************************
   * Fix Current Chapter   *
   *************************/
  async function fixCurrentChapter() {
    try {
      if (!location.pathname.includes('/reader/')) {
        alert('❗ Not on a reader page.');
        return;
      }

      const params = new URLSearchParams(location.search);
      const forceIndex = Number(params.get('forceChapterIndex'));
      if (isNaN(forceIndex)) {
        alert('❗ Could not detect forceChapterIndex.');
        return;
      }

      const iframe = await waitForElement(iframeSelector);
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      await waitForElement('h1.sq-title', iframeDoc);

      const title = iframeDoc.querySelector('h1.sq-title')?.innerText.trim();
      const paras = Array.from(iframeDoc.querySelectorAll('p.sand-p')).map(p => p.innerText.trim());

      const { catalogs, id } = getCatalogData();
      let { chapters, currentIndex } = catalogs[id];
      const lastUpdated = new Date().toLocaleString();

      const idx = chapters.findIndex(c => c.index === forceIndex);
      if (idx >= 0) {
        const firstUpdated = chapters[idx].firstUpdated;
        chapters[idx] = { index: forceIndex, title, paras, firstUpdated, lastUpdated };
        console.log(`🔁 Replaced chapter index ${forceIndex} (${title})`);
      } else {
        const firstUpdated = lastUpdated
        chapters.push({ index: forceIndex, title, paras, firstUpdated, lastUpdated });
        console.log(`➕ Added missing chapter index ${forceIndex} (${title})`);
      }
      saveCatalogData(id, { chapters, currentIndex });

      alert(`✅ Fixed chapter ${forceIndex}: ${title}`);
    } catch (err) {
      console.error('Error fixing chapter:', err);
      alert('❌ Failed to fix chapter, check console.');
    }
  }

  /*************************
   * Export JSON           *
   *************************/
  function exportChapters() {
    const { catalogs, id } = getCatalogData();
    const { chapters } = catalogs[id];
    if (!chapters?.length) {
      alert('No chapters scraped yet for this catalog.');
      return;
    }

    const blob = new Blob([JSON.stringify(chapters, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `chapters-${id}.json`;
    link.click();
  }

  //--------------------------------------------------
  // 🔹 Import function
  //--------------------------------------------------
  async function importChapters() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';

    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const chapters = JSON.parse(text);
        const match = file.name.match(/chapters-(\d+)\.json/);
        const catalogId = match ? match[1] : prompt('Enter catalog ID manually:');

        if (!catalogId) {
          alert('Catalog ID required.');
          return;
        }

        const currentIndex = chapters ? chapters[chapters.length - 1].index : 0;
        saveCatalogData(catalogId, { chapters, currentIndex });
        GM_setValue('chaptersByCatalog', null);

        alert(`✅ Imported ${chapters.length} chapters for catalog ${catalogId}`);
      } catch (err) {
        alert(`❌ Import failed: ${err.message}`);
        console.error(err);
      }
    });

    document.body.appendChild(input);
    input.click();
    input.remove();
  }


  /*************************
   * Initialize            *
   *************************/
  addControlButtons();
})();
