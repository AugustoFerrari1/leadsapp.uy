import asyncio
import re
import httpx
from playwright.async_api import async_playwright
from typing import List, Dict, Any
import urllib.parse


# ---------------------------------------------------------------------------
# Palabras clave válidas para identificar barberías reales
# ---------------------------------------------------------------------------
BARBER_KEYWORDS = [
    "barber", "barbería", "barberia", "peluquer", "corte", "fades",
    "navaja", "fade", "grooming", "gentleman", "men", "hombre"
]


def is_valid_lead(lead: Dict[str, Any]) -> bool:
    """
    Filtra leads de baja calidad antes de guardarlos.
    Descarta leads que claramente no sirven.
    """
    name = (lead.get("name") or "").strip()

    # Sin nombre → descartado
    if not name or len(name) < 3:
        return False

    # Sin teléfono Y sin dirección al mismo tiempo → lead vacío, no sirve
    has_phone = bool(lead.get("phone"))
    has_address = bool(lead.get("address"))
    if not has_phone and not has_address:
        return False

    return True


def score_lead(lead: Dict[str, Any]) -> int:
    """
    Calcula un puntaje de oportunidad de 0 a 100.
    Mayor puntaje = lead más acertado para contactar.

    Criterios:
      - Sin web             → +35  (máxima oportunidad, necesita lo que ofrecemos)
      - Con teléfono        → +25  (podemos contactar)
      - Rating ≥ 4.0        → +15  (buen negocio, puede pagar)
      - Rating < 4.0        → +10  (puede mejorar con tech)
      - Sin rating          → +5   (negocio nuevo o sin presencia digital)
      - Con dirección       → +10  (dato real, no fantasma)
      - Nombre real         → +5   (parece barbería legítima, no genérica)
    """
    score = 0

    # Sin web → mejor oportunidad (nuestro producto es una web)
    if not lead.get("has_website"):
        score += 35

    # Tiene teléfono → podemos contactar por WhatsApp
    if lead.get("phone"):
        score += 25

    # Rating
    rating = lead.get("rating")
    if rating is not None:
        if rating >= 4.0:
            score += 15  # Buen negocio, más chances de que pague
        else:
            score += 10  # Puede mejorar con mejores herramientas
    else:
        score += 5   # Sin rating = poca presencia digital

    # Dirección conocida
    if lead.get("address"):
        score += 10

    # Nombre parece barbería real (contiene keyword relevante)
    name_lower = (lead.get("name") or "").lower()
    if any(kw in name_lower for kw in BARBER_KEYWORDS):
        score += 5

    return min(score, 100)


async def scrape_barberias(query: str) -> List[Dict[str, Any]]:
    """Scrape Google Maps para barberías — mecanismo sin cambios"""
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
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            
            # Esperar a que la lista o el mapa se rendericen un mínimo
            try:
                await page.wait_for_selector('[role="article"]', timeout=10000)
            except Exception:
                pass
            
            await asyncio.sleep(3)

            # Scroll para cargar más resultados
            for _ in range(5):
                await page.keyboard.press("End")
                await asyncio.sleep(1.5)

            # Obtener todas las cards
            listings = await page.query_selector_all('[role="article"]')

            for listing in listings[:15]:  # max 15 por zona
                try:
                    lead = await extract_lead_from_listing(listing, page)
                    if lead and lead.get("name"):
                        # Filtro de calidad: descartar leads vacíos
                        if is_valid_lead(lead):
                            # Calcular score de oportunidad
                            lead["score"] = score_lead(lead)
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
            addr_items = await page.query_selector_all('[data-tooltip="Copiar dirección"]')
            if addr_items:
                lead["address"] = (await addr_items[0].inner_text()).strip()

        # Phone
        phone_el = await page.query_selector('[data-tooltip="Copiar número de teléfono"]')
        if phone_el:
            lead["phone"] = (await phone_el.inner_text()).strip()
        else:
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
