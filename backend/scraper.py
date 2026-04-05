import asyncio
import re
import httpx
from playwright.async_api import async_playwright
from typing import List, Dict, Any
import urllib.parse


async def scrape_barberias(query: str) -> List[Dict[str, Any]]:
    """Scrape Google Maps for barberias"""
    results = []
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            )
            page = await context.new_page()

            encoded = urllib.parse.quote(query)
            url = f"https://www.google.com/maps/search/{encoded}"
            await page.goto(url, wait_until="networkidle", timeout=30000)
            await asyncio.sleep(3)

            # Scroll to load more results
            for _ in range(5):
                await page.keyboard.press("End")
                await asyncio.sleep(1.5)

            # Get all place cards
            listings = await page.query_selector_all('[role="article"]')

            for listing in listings[:15]:  # max 15 per zona
                try:
                    lead = await extract_lead_from_listing(listing, page)
                    if lead and lead.get("name"):
                        results.append(lead)
                except Exception:
                    continue

            await browser.close()
    except Exception as e:
        print(f"Error scraping {query}: {e}")

    return results


async def extract_lead_from_listing(listing, page) -> Dict[str, Any]:
    """Extract lead data from a Google Maps listing"""
    lead = {}

    try:
        # Click the listing to get details
        await listing.click()
        await asyncio.sleep(2)

        # Name
        name_el = await page.query_selector('h1[class*="DUwDvf"]')
        if not name_el:
            name_el = await page.query_selector('[data-attrid="title"] span')
        if name_el:
            lead["name"] = (await name_el.inner_text()).strip()

        # Address
        addr_el = await page.query_selector('[data-item-id="address"]')
        if addr_el:
            lead["address"] = (await addr_el.inner_text()).strip()
        else:
            # fallback
            addr_items = await page.query_selector_all('[data-tooltip="Copiar dirección"]')
            if addr_items:
                lead["address"] = (await addr_items[0].inner_text()).strip()

        # Phone
        phone_el = await page.query_selector('[data-tooltip="Copiar número de teléfono"]')
        if phone_el:
            lead["phone"] = (await phone_el.inner_text()).strip()
        else:
            # Try alternative
            phone_items = await page.query_selector_all('[data-item-id*="phone"]')
            for item in phone_items:
                text = await item.inner_text()
                if re.search(r'[\d\+\-\s]{6,}', text):
                    lead["phone"] = text.strip()
                    break

        # Website
        web_el = await page.query_selector('[data-item-id*="authority"]')
        if web_el:
            lead["website"] = (await web_el.inner_text()).strip()
            lead["has_website"] = True
        else:
            lead["has_website"] = False
            lead["website"] = None

        # Rating
        rating_el = await page.query_selector('[aria-label*="estrella"]')
        if not rating_el:
            rating_el = await page.query_selector('.MW4etd')
        if rating_el:
            rating_text = await rating_el.inner_text()
            try:
                lead["rating"] = float(rating_text.replace(",", "."))
            except Exception:
                lead["rating"] = None
        else:
            lead["rating"] = None

        lead["source"] = "Google Maps"

    except Exception as e:
        print(f"Error extracting lead: {e}")

    return lead


def clean_phone(phone: str) -> str:
    """Clean and normalize Uruguayan phone numbers"""
    if not phone:
        return phone
    cleaned = re.sub(r'[^\d\+]', '', phone)
    # Add Uruguay country code if missing
    if cleaned.startswith('09') or cleaned.startswith('02') or cleaned.startswith('04'):
        cleaned = '+598' + cleaned[1:]
    elif not cleaned.startswith('+'):
        cleaned = '+598' + cleaned
    return cleaned
