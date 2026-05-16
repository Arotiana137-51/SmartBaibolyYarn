"""
Scrape + clean FIFOHAZANA hymns from tononkira.serasera.org in a single pass.

Why merged: the previous split (scrapFifohazana.py + clean_fifohazana.py)
produced mojibake titles, leaked pagination noise, and lost the source
catalog numbering. Doing both phases in one place lets us:

  * force UTF-8 decoding (the site is UTF-8 but did not declare it, and
    requests.apparent_encoding was guessing wrong → "ô" → "" etc.);
  * treat **list-page order as catalog number** (positions 1..65 on the
    listing pages map 1:1 to the hymnbook number — confirmed by the
    last entry "65. Zava-tsoa re ny aty");
  * dedup repeated href listings ("NA MAFY AZA NY ALONDRANO" appears
    twice on page 2, "Saotra sy dera" twice on page 3, etc.);
  * strip leading "N. " from titles (mostly typos or self-references;
    e.g. the very first listing is mislabeled "65. Ny Amaramao..." —
    the user confirmed to ignore that prefix).

Run:
    python scripts/utils/scrapFifohazana.py
"""

from __future__ import annotations

import json
import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://tononkira.serasera.org"
LIST_TEMPLATE = "https://tononkira.serasera.org/mpihira/fifohazana/hira?page={page}"

FIRST_PAGE = 1
LAST_PAGE = 4

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; FIFOHAZANA-scraper/2.0; "
        "+https://example.com)"
    )
}

# Titles that appear in the page chrome (pagination, admin links) and must
# never be treated as songs.
SKIP_TITLES = {
    "1", "2", "3", "4",
    "Manaraka", "Farany", "Voalohany", "Mialoha",
    "Hampiditra hiran'i FIFOHAZANA",
}

SCRIPT_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = SCRIPT_DIR.parent / "source-data" / "hymns"
OUTPUT_FILE = OUTPUT_DIR / "04_fifohazana.json"

# --- Lyric parsing ----------------------------------------------------------
VERSE_START_RE = re.compile(r"^(\d+)[\.\s]\s*(.*)$")
VERSE_ONLY_NUM_RE = re.compile(r"^(\d+)$")
CHORUS_HOOK_RE = re.compile(r"^Tsara\s+re", re.IGNORECASE)

# Things the page header/footer leaks into get_text() that we never want
# inside a verse.
NOISE_PATTERNS = [
    re.compile(r"Tononkira Malagasy Serasera", re.IGNORECASE),
    re.compile(r"Tonga soa eto amin'ny takelaky", re.IGNORECASE),
    re.compile(r"tononkira\.serasera\.org", re.IGNORECASE),
    re.compile(r"Hisoratra anarana", re.IGNORECASE),
    re.compile(r"Hiditra", re.IGNORECASE),
    re.compile(r"Mbola tsy mpikambana", re.IGNORECASE),
    re.compile(r"Hampiasa Google", re.IGNORECASE),
    re.compile(r"Fandraisana", re.IGNORECASE),
    re.compile(r"Hira rehetra", re.IGNORECASE),
    re.compile(r"Mpihira rehetra", re.IGNORECASE),
    re.compile(r"Tondrompeo", re.IGNORECASE),
    re.compile(r"Ahitsio", re.IGNORECASE),
    re.compile(r"\(Nalaina tao amin'ny tononkira\.serasera\.org\)", re.IGNORECASE),
    re.compile(r"page\s+load\s+[\d.]+", re.IGNORECASE),
    re.compile(r"^\d{4}\s*-\s*page", re.IGNORECASE),
    re.compile(r"-{3,}"),
]

# Drops a leading "<digits>. " or "<digits>." from a title (catalog number
# the source prepends — we recompute it from list order). Applied after
# encoding fixes so we see real digits, not mojibake.
LEADING_NUMBER_RE = re.compile(r"^\s*\d+\s*\.\s*")

# Known content typos on serasera. Aggressive cleanup explicitly requested
# by the user. Applied case-sensitively to titles AND verse bodies; keep
# this dictionary small and obvious so we don't accidentally rewrite real
# Malagasy words.
TYPO_FIXES = [
    # Lowercase-L mistaken for capital-I in OCR'd entries. Only at word
    # boundaries before "z" — Malagasy doesn't start words with "lz".
    (re.compile(r"\blz"), "Iz"),
    # First hymn's title: "Amaramao" is a clear scan error for "Anaranao"
    # (the actual word, repeated throughout the lyrics body).
    (re.compile(r"\bAmaramao\b"), "Anaranao"),
    # "m'a" inside a title/verse is the source's scan error for "mba"
    # (e.g. "no m'a ifikirako" → "no mba ifikirako"). Match only when
    # surrounded by spaces to avoid touching genuine apostrophe contractions
    # like "nomen'ny".
    (re.compile(r"(?<= )m'a(?= )"), "mba"),
    # Drop any U+FFFD (replacement) chars; if any survive, they signal a
    # byte we couldn't decode, and an empty string is better than ��.
    (re.compile("�"), ""),
]


# --- HTTP -------------------------------------------------------------------
def get_soup(url: str) -> BeautifulSoup:
    """Fetch with explicit UTF-8 decoding (the site is UTF-8 but does not
    declare it, so requests' fallback chardet sniffing produces mojibake
    on accented characters like 'ô' and 'à')."""
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    resp.encoding = "utf-8"
    return BeautifulSoup(resp.text, "html.parser")


def normalize_song_url(href: str) -> str:
    url = href if href.startswith("http") else BASE_URL + href
    return url.split("[")[0].rstrip("/")


def is_song_link(href: str, title: str) -> bool:
    if not title or title in SKIP_TITLES:
        return False
    if title.strip().isdigit():
        return False
    if "/hira/ampidiro" in href or "hira?page=" in href:
        return False
    return "hira/fifohazana/" in href


# --- Text cleanup -----------------------------------------------------------
def apply_typo_fixes(text: str) -> str:
    out = text
    for pattern, repl in TYPO_FIXES:
        out = pattern.sub(repl, out)
    return out


def strip_noise(text: str) -> str:
    out = text
    for pattern in NOISE_PATTERNS:
        out = pattern.sub("", out)
    out = re.sub(r"[ \t]+", " ", out)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip()


def clean_title(title: str) -> str:
    # Order matters: typo fixes first (might surface real letters that
    # then trigger leading-number stripping), then strip "N. ", then
    # tidy trailing punctuation that's visual noise but keep ? and !.
    cleaned = apply_typo_fixes(title.strip())
    cleaned = LEADING_NUMBER_RE.sub("", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = cleaned.rstrip(" ,;:")
    return cleaned.strip()


# --- List page scrape -------------------------------------------------------
def scrape_list_pages() -> list[dict]:
    """Collect unique FIFOHAZANA songs from all list pages.

    Dedup by canonical URL — the source lists several songs twice in a row
    (different titles, same href), which is a data-entry artifact, not two
    distinct hymns.

    The order returned IS the catalog order: position N == hymnbook #N.
    """
    seen_urls: set[str] = set()
    songs: list[dict] = []

    for page in range(FIRST_PAGE, LAST_PAGE + 1):
        print(f"Scraping list page {page} …")
        soup = get_soup(LIST_TEMPLATE.format(page=page))
        page_count = 0

        for anchor in soup.find_all("a", href=True):
            href = anchor["href"]
            title = anchor.get_text(strip=True)
            if not is_song_link(href, title):
                continue

            song_url = normalize_song_url(href)
            if song_url in seen_urls:
                continue

            seen_urls.add(song_url)
            songs.append({"raw_title": title, "url": song_url, "page": page})
            page_count += 1

        print(f"  Found {page_count} new songs on page {page}.")

    print(f"Total unique songs: {len(songs)}")
    return songs


# --- Song page scrape -------------------------------------------------------
def extract_song_lyrics_block(soup: BeautifulSoup) -> str:
    """Lyrics on tononkira sit between 'Ahitsio' and 'Rohy:'/'--------'.

    We also drop the recurring "(Nalaina tao amin'ny tononkira.serasera.org)"
    credit line that follows 'Ahitsio'.
    """
    full_text = soup.get_text("\n", strip=True)

    if "Ahitsio" in full_text:
        full_text = full_text.split("Ahitsio", 1)[1]
        full_text = re.sub(
            r"^\(Nalaina tao amin'ny tononkira\.serasera\.org\)\s*",
            "",
            full_text,
            flags=re.IGNORECASE,
        )

    for marker in ("--------", "Rohy:"):
        if marker in full_text:
            full_text = full_text.split(marker, 1)[0]

    lines = []
    for line in full_text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        # Drop lines that are entirely noise (page chrome leaking through).
        if any(p.search(stripped) for p in NOISE_PATTERNS):
            continue
        lines.append(stripped)

    return "\n".join(lines)


def parse_lyrics_into_verses(lyrics_text: str) -> list[dict]:
    """
    Parse FIFOHAZANA lyrics into verse objects.

    Verses start with a line like '1.' / '2.' (or a bare numeric line).
    A line starting with 'Tsara re' marks a chorus block, which is the
    typical FIFOHAZANA refrain hook.
    """
    lines = [line.strip() for line in lyrics_text.split("\n") if line.strip()]
    if not lines:
        return []

    verses: list[dict] = []
    current_lines: list[str] = []
    current_verse_num = 1
    in_chorus = False

    def flush_verse():
        nonlocal current_lines, current_verse_num, in_chorus
        if not current_lines:
            in_chorus = False
            return
        text = "\n".join(current_lines).strip()
        text = apply_typo_fixes(text)
        if not text:
            current_lines = []
            return
        if in_chorus:
            verses.append(
                {"andininy": 0, "tononkira": text, "fiverenany": True}
            )
            in_chorus = False
        else:
            verses.append(
                {
                    "andininy": current_verse_num,
                    "tononkira": text,
                    "fiverenany": False,
                }
            )
            current_verse_num += 1
        current_lines = []

    for line in lines:
        verse_match = VERSE_START_RE.match(line)
        if verse_match:
            flush_verse()
            current_verse_num = int(verse_match.group(1))
            remainder = verse_match.group(2).strip()
            if remainder:
                current_lines.append(remainder)
            continue

        only_num = VERSE_ONLY_NUM_RE.match(line)
        if only_num:
            flush_verse()
            current_verse_num = int(only_num.group(1))
            continue

        if CHORUS_HOOK_RE.match(line):
            flush_verse()
            in_chorus = True
            # Keep the full "Tsara re ..." line as-is; the previous version
            # stripped the "Tsara re" prefix, which mangled the refrain.
            current_lines.append(line)
            continue

        current_lines.append(line)

    flush_verse()

    if not verses and lines:
        verses.append(
            {
                "andininy": 1,
                "tononkira": apply_typo_fixes("\n".join(lines)),
                "fiverenany": False,
            }
        )

    return verses


def scrape_song_page(song: dict, catalog_number: int) -> dict | None:
    soup = get_soup(song["url"])
    lyrics_text = strip_noise(extract_song_lyrics_block(soup))
    verses = parse_lyrics_into_verses(lyrics_text)
    title = clean_title(song["raw_title"])

    # Reject anything that survived but is clearly not a real hymn (no
    # verses, or under 20 chars of total content).
    if not title or title in SKIP_TITLES:
        return None
    total_len = sum(len((v.get("tononkira") or "").strip()) for v in verses)
    if not verses or total_len < 20:
        return None

    return {
        "laharana": str(catalog_number),
        "sokajy": "fifo",
        "lohateny": title,
        "mpanoratra": [],
        "hira": verses,
    }


# --- Driver -----------------------------------------------------------------
def main():
    songs = scrape_list_pages()
    hymn_dict: dict[str, dict] = {}
    catalog_number = 0

    for i, song in enumerate(songs, start=1):
        print(f"[{i}/{len(songs)}] {song['raw_title']}")
        try:
            # Advance the catalog counter *before* the scrape so a failed
            # page doesn't shift every subsequent hymn's number.
            candidate_number = catalog_number + 1
            entry = scrape_song_page(song, candidate_number)
            if entry is None:
                print(f"  Skipped (no valid lyrics): {song['raw_title']!r}")
                continue
            catalog_number = candidate_number
            hymn_dict[f"fifo_{catalog_number}"] = entry
        except Exception as exc:
            print(f"  Error scraping {song['url']}: {exc}")
        time.sleep(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as handle:
        json.dump(hymn_dict, handle, ensure_ascii=False, indent=4)

    print(f"Done. Saved {len(hymn_dict)} songs to {OUTPUT_FILE}.")


if __name__ == "__main__":
    main()
