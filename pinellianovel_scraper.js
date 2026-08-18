// ==UserScript==
// @name         Chinese Novel Scraper & Downloader
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Scrapes novels page by page, caches locally, and exports to JSON.
// @author       YourName
// @match        https://*.pinellianovel.com/books/*
// @match        https://pinellia.bestzhufu.com/books/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // CONFIGURATION
    // ==========================================
    const CONFIG = {
        delayMin: 1500, // Minimum delay between pages (ms)
        delayMax: 3000, // Maximum delay between pages (ms) to mimic human behavior
        storageKeyPrefix: "novel_scrape_"
    };

    // ==========================================
    // URL & METADATA PARSING LIBRARIES
    // ==========================================
    function parseUrlInfo() {
        const url = window.location.href;
        // Matches .../books/BookID/ChapterID.html or .../books/BookID.html
        const match = url.match(/\/books\/([^\/]+)(?:\/([^\/\._]+))?/);

        return {
            bookId: match ? match[1] : null,
            isMainPage: match && !match[2]
        };
    }

    // ==========================================
    // STORAGE INTERFACE
    // ==========================================
    function getBookCache(bookId) {
        return GM_getValue(CONFIG.storageKeyPrefix + bookId, {});
    }

    function saveBookCache(bookId, data) {
        GM_setValue(CONFIG.storageKeyPrefix + bookId, data);
    }

    // ==========================================
    // CORE SCRAPING ACTIONS
    // ==========================================
    'use strict';

    function parsePageInfo() {
        const url = window.location.href;
        const bookId = url.match(/\/books\/([^\/]+)/)?.[1];
        const titleEl = document.querySelector(".reader-header__title");
        if (!titleEl || !bookId) return null;

        const rawTitleText = titleEl.textContent;
        const titleText = rawTitleText.includes('_') ?
              rawTitleText.substring(rawTitleText.indexOf('_') + 1).trim() :
        rawTitleText.trim();
        const chapMatch = titleText.match(/第\s*(\d+)\s*章/);
        const pageMatch = titleText.match(/\((\d+)\)\s*$/);

        // Clean title: Remove the (1) or (2) suffix for the metadata
        const fullTitle = titleText.replace(/\s*\(\d+\)\s*$/, "").trim();

        return {
            bookId,
            chapterNum: chapMatch ? chapMatch[1] : "0",
            pageNum: pageMatch ? pageMatch[1] : "1",
            fullTitle: fullTitle,
            timestamp: new Date().toLocaleString()
        };
    }

    function scrapeCurrentPage() {
        const info = parsePageInfo();
        if (!info) return false;

        const article = document.querySelector("#article.reader-content");
        if (!article) return false;

        // Direct Unicode Mapping Dictionary Provided by User
        const UNICODE_MAP = {
            "\uE900": "成", "\uE901": "陰", "\uE902": "唇", "\uE903": "淫", "\uE904": "洞",
            "\uE905": "根", "\uE906": "經", "\uE907": "交", "\uE908": "叫", "\uE909": "媒",
            "\uE90A": "媚", "\uE90B": "女", "\uE90C": "肉", "\uE90D": "乳", "\uE90E": "物",
            "\uE90F": "性", "\uE910": "穴", "\uE911": "血", "\uE912": "欲", "\uE913": "嘴",
            "\uE914": "虐", "\uE915": "童", "\uE916": "莖", "\uE917": "舔", "\uE918": "棍",
            "\uE919": "蜜", "\uE91A": "獸", "\uE91B": "液", "\uE91C": "肏", "\uE91D": "喉",
            "\uE91E": "鷄", "\uE91F": "巴", "\uE920": "奸", "\uE921": "尻", "\uE922": "慰",
            "\uE923": "熟", "\uE924": "殖", "\uE925": "潮", "\uE926": "感", "\uE927": "肛",
            "\uE928": "酥", "\uE929": "胸", "\uE92A": "插", "\uE92B": "驗", "\uE92C": "龜",
            "\uE92D": "蒂", "\uE92E": "射", "\uE92F": "精", "\uE930": "顏", "\uE931": "縮",
            "\uE932": "爆", "\uE933": "菊", "\uE934": "幼", "\uE935": "戀", "\uE936": "倫",
            "\uE937": "輪", "\uE938": "縫", "\uE939": "密", "\uE93A": "處", "\uE93B": "肥",
            "\uE93C": "操", "\uE93D": "臀", "\uE93E": "膜", "\uE93F": "跨", "\uE940": "蹂",
            "\uE941": "躪", "\uE942": "洛", "\uE943": "鴉", "\uE944": "妓", "\uE945": "樓",
            "\uE946": "鳯", "\uE947": "胴", "\uE948": "戳", "\uE949": "奶", "\uE94A": "逼",
            "\uE94C": "蒲", "\uE94D": "蕩", "\uE94E": "騷", "\uE94F": "偷", "\uE950": "露",
            "\uE951": "祼", "\uE952": "漏", "\uE953": "御", "\uE954": "嫩", "\uE955": "惑",
            "\uE956": "陰", "\uE957": "莖", "\uE958": "獸", "\uE959": "雞", "\uE95A": "龜",
            "\uE95B": "陽", "\uE95C": "顏", "\uE95D": "縮", "\uE95E": "戀", "\uE95F": "屍",
            "\uE960": "姦", "\uE961": "亂", "\uE962": "術", "\uE963": "輪", "\uE964": "遺",
            "\uE965": "縫", "\uE966": "處", "\uE967": "躪", "\uE968": "鴉", "\uE969": "鳯",
            "\uE96A": "侶", "\uE96B": "誘", "\uE96C": "蕩", "\uE96D": "騷", "\uE96E": "禦",
            "\uE96F": "屄", "\uE970": "屌", "\uE971": "脫", "\uE972": "扒", "\uE973": "光",
            "\uE974": "膚", "\uE975": "裙", "\uE976": "她", "\uE977": "撫", "\uE978": "美",
            "\uE979": "豐", "\uE97A": "腴", "\uE97B": "揉", "\uE97C": "撩", "\uE97D": "粉",
            "\uE97E": "腿", "\uE97F": "胯", "\uE980": "禁", "\uE981": "摸", "\uE982": "享",
            "\uE983": "受", "\uE984": "褲", "\uE985": "襠", "\uE986": "內", "\uE987": "具",
            "\uE988": "亢", "\uE989": "𡚒", "\uE98A": "伸", "\uE98B": "入", "\uE98C": "貼",
            "\uE98D": "緊", "\uE98E": "股", "\uE98F": "動", "\uE990": "情", "\uE991": "擠",
            "\uE992": "身", "\uE993": "壓", "\uE994": "羞", "\uE995": "澀", "\uE996": "嬌",
            "\uE997": "顫", "\uE998": "勃", "\uE999": "褻", "\uE99A": "瀆", "\uE99B": "衣",
            "\uE99C": "硬", "\uE99D": "癢", "\uE99E": "體", "\uE99F": "碰", "\uE9A0": "觸",
            "\uE9A1": "色", "\uE9A2": "痞", "\uE9A3": "器", "\uE9A4": "官", "\uE9A5": "渴",
            "\uE9A6": "望", "\uE9A7": "粗", "\uE9A8": "摩", "\uE9A9": "擦", "\uE9AA": "挺",
            "\uE9AB": "呻", "\uE9AC": "吟", "\uE9AD": "豊", "\uE9AE": "絲", "\uE9AF": "襪",
            "\uE9B0": "肌", "\uE9B1": "捏", "\uE9B2": "搓", "\uE9B3": "柔", "\uE9B4": "軟",
            "\uE9B5": "隱", "\uE9B6": "秘", "\uE9B7": "毛", "\uE9B8": "少", "\uE9B9": "溝",
            "\uE9BA": "汁", "\uE9BB": "愛", "\uE9BC": "透", "\uE9BD": "濕", "\uE9BE": "滑",
            "\uE9BF": "抽", "\uE9C0": "饑", "\uE9C1": "餓", "\uE9C2": "喘"
        };

        const paragraphs = [];

        article.querySelectorAll("p").forEach(p => {
            const clone = p.cloneNode(true);
            const iconNodes = clone.querySelectorAll('[class^="icon-"], [class*=" icon-"]');

            iconNodes.forEach(icon => {
                // Find the sequential number from the class name (e.g., "icon-18" -> 18)
                const match = icon.className.match(/icon-(\d+)/);
                if (match) {
                    const iconIndex = parseInt(match[1], 10); // 18

                    // Calculate the corresponding Unicode character key dynamically
                    // Base code point is \uE900 (0xE900)[cite: 1]
                    const unicodeKey = String.fromCharCode(0xE900 + (iconIndex - 1));

                    const realCharacter = UNICODE_MAP[unicodeKey];

                    if (realCharacter) {
                        // Replace the empty icon tag with the actual plaintext character
                        icon.parentNode.replaceChild(document.createTextNode(realCharacter), icon);
                    } else {
                        console.warn(`Scraper warning: No mapping found for character code point: \\u${(0xE900 + (iconIndex - 1)).toString(16).toUpperCase()}`);
                    }
                }
            });

            const text = clone.textContent.trim();
            if (text) paragraphs.push(text);
        });

        const cache = GM_getValue(CONFIG.storageKeyPrefix + info.bookId, {});

        if (!cache[info.chapterNum]) {
            cache[info.chapterNum] = {
                metadata: { title: info.fullTitle, lastUpdated: info.timestamp },
                pages: {}
            };
        }

        cache[info.chapterNum].pages[info.pageNum] = paragraphs;
        cache[info.chapterNum].metadata.lastUpdated = info.timestamp;

        GM_setValue(CONFIG.storageKeyPrefix + info.bookId, cache);
        console.log(`Saved (Anti-Obfuscation Solved): ${info.fullTitle} (Page ${info.pageNum})`);
        return true;
    }

    function exportToJson() {
        const { bookId } = parseUrlInfo();
        if (!bookId) return alert("No valid Book ID detected.");

        const cache = getBookCache(bookId);
        if (Object.keys(cache).length === 0) {
            return alert("No cached data found for this book to export.");
        }

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cache, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `novel_${bookId}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }

    // ==========================================
    // AUTOMATION LOOP STATE ENGINE
    // ==========================================
    const state = {
        get isRunning() {
            return sessionStorage.getItem("scraper_active") === "true";
        },
        set isRunning(val) {
            sessionStorage.setItem("scraper_active", val ? "true" : "false");
        }
    };

    function getRandomDelay() {
        return Math.floor(Math.random() * (CONFIG.delayMax - CONFIG.delayMin + 1)) + CONFIG.delayMin;
    }

    function startAutomation() {
        state.isRunning = true;
        updateUiState();
        executeAutoStep();
    }

    function stopAutomation() {
        state.isRunning = false;
        updateUiState();
        console.log("Scraper execution halted by user.");
    }

    function executeAutoStep() {
        if (!state.isRunning) return;

        const success = scrapeCurrentPage();
        if (!success) {
            alert("Scraping error encountered. Loop halted.");
            stopAutomation();
            return;
        }

        const nextBtn = document.getElementById("next_url");

        // Verify if next button exists or contains the disabled class flag
        if (!nextBtn || nextBtn.classList.contains("reader-nav-link--disabled") || nextBtn.textContent.includes("沒有了")) {
            alert("Reached the end of the novel! Scraping complete.");
            stopAutomation();
            return;
        }

        // Stagger navigation requests to circumvent bot-detection filters
        setTimeout(() => {
            if (state.isRunning) {
                nextBtn.click();
            }
        }, getRandomDelay());
    }

    // ==========================================
    // UI CONTROL PANEL GENERATION
    // ==========================================
    let uiElements = {};

    function injectControlPanel() {
        const { isMainPage } = parseUrlInfo();
        if (isMainPage) return; // Don't show panel on standard index landing walls

        const container = document.createElement("div");
        container.id = "scraper-panel";
        container.innerHTML = `
            <div class="panel-title">Scraper Controls</div>
            <button id="btn-scrape-page">Scrape Page</button>
            <button id="btn-scrape-all" class="btn-primary">Scrape All</button>
            <button id="btn-stop" disabled>Stop</button>
            <button id="btn-export">Export JSON</button>
        `;

        // Scoping CSS injections locally
        const style = document.createElement("style");
        style.textContent = `
            #scraper-panel {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #2c3e50;
                color: #ecf0f1;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                z-index: 99999;
                display: flex;
                flex-direction: column;
                gap: 8px;
                font-family: Arial, sans-serif;
                width: 160px;
            }
            #scraper-panel .panel-title {
                font-size: 13px;
                font-weight: bold;
                text-align: center;
                margin-bottom: 5px;
                border-bottom: 1px solid #34495e;
                padding-bottom: 5px;
            }
            #scraper-panel button {
                background: #34495e;
                color: #fff;
                border: none;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: background 0.2s;
            }
            #scraper-panel button:hover:not(:disabled) { background: #415b76; }
            #scraper-panel button:disabled { background: #7f8c8d; cursor: not-allowed; opacity: 0.6; }
            #scraper-panel .btn-primary { background: #27ae60; }
            #scraper-panel .btn-primary:hover:not(:disabled) { background: #2ecc71; }
            #scraper-panel #btn-stop { background: #c0392b; }
            #scraper-panel #btn-stop:hover:not(:disabled) { background: #e74c3c; }
        `;

        document.head.appendChild(style);
        document.body.appendChild(container);

        // Bind interactive elements
        uiElements = {
            scrapePage: document.getElementById("btn-scrape-page"),
            scrapeAll: document.getElementById("btn-scrape-all"),
            stop: document.getElementById("btn-stop"),
            export: document.getElementById("btn-export")
        };

        uiElements.scrapePage.addEventListener("click", () => {
            if(scrapeCurrentPage()) alert("Current page processed and added to cache!");
        });
        uiElements.scrapeAll.addEventListener("click", startAutomation);
        uiElements.stop.addEventListener("click", stopAutomation);
        uiElements.export.addEventListener("click", exportToJson);

        updateUiState();
    }

    function updateUiState() {
        if (!uiElements.scrapeAll) return;

        const running = state.isRunning;
        uiElements.scrapeAll.disabled = running;
        uiElements.scrapePage.disabled = running;
        uiElements.export.disabled = running;
        uiElements.stop.disabled = !running;
    }

    // ==========================================
    // INITIALIZATION RUNTIME ENTRYPOINT
    // ==========================================
    function init() {
        injectControlPanel();

        // If the runner state is active in sessionStorage when the page loads, execute next automation hook
        if (state.isRunning) {
            // Wait for DOM layout engines to finish rendering out text components safely
            window.addEventListener('load', () => {
                setTimeout(executeAutoStep, 500);
            });
        }
    }

    init();
})();
