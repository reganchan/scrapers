# Shuqi and Pinellia novel scrapers

These are 2 tempermonkey scripts I vibe coded to cache chapters, export them to a JSON export, and then a simple webapp to read them offline


## Usage

After installing the script onto tempermonkey, anytime you browse to t.shuqi.com, the panel should show up

<img width="1456" height="720" alt="shuqi" src="https://github.com/user-attachments/assets/bc9c3fb0-2f91-4f24-a621-79f44cb12721" />

* Start scraping - will cache one chapter at a time until it reaches the end
* Export JSON - download JSON file, generated from the cache
* Import JSON - replace browser cache with imported file
* Fix This Chapter - When a chapter is open, refresh the cache of only that chapter. Useful for scraping the latest chapter without "Start scraping" or to fix a wrongly cached chapter

