import asyncio
import logging
import re
import os
import httpx
from playwright.async_api import async_playwright
from typing import List, Dict, Any
import urllib.parse

logging.basicConfig(level=logging.INFO, format="%(asctime)s [scraper] %(message)s")
logger = logging.getLogger(__name__)

DEBUG_DIR = os.environ.get("SCRAPE_DEBUG_DIR", "/tmp/scrape_debug")
os.makedirs(DEBUG_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Palabras clave válidas para identificar barberías reales
# ---------------------------------------------------------------------------
BARBER_KEYWORDS = [
    "barber", "barbería", "barberia", "peluquer", "corte", "fades",
    "navaja", "fade", "grooming", "gentleman", "men", "hombre"
]

# Dominios de redes sociales — no cuentan como sitio web real
SOCIAL_DOMAINS = [
    "instagram.com", "facebook.com", "fb.com", "tiktok.com",
    "twitter.com", "x.com", "wa.me", "linktr.ee"
]


def clean_text_field(text: str) -> str:
    """Elimina íconos Unicode de Material Symbols / Google Fonts que aparecen al inicio."""
    if not text:
        return text
    # Eliminar caracteres del Private Use Area de Unicode (íconos de Google Maps)
    cleaned = re.sub(r'[\uE000-\uF8FF\uFE0F\uFEFF]+', '', text)
    return cleaned.strip()

# Textos posibles del botón de "aceptar" en distintos idiomas/variantes
CONSENT_BUTTON_TEXTS = [
    "Aceptar todo", "Acepto", "Aceptar", "I agree", "Accept all",
    "Rechazar todo", "Reject all",  # si no aparece "aceptar", al menos cerramos el modal
]


def is_valid_lead(lead: Dict[str, Any]) -> bool:
    name = (lead.get("name") or "").strip()
    if not name or len(name) < 3:
        return False
    has_phone = bool(lead.get("phone"))
    has_address = bool(lead.get("address"))
    if not has_phone and not has_address:
        return False
    return True


def score_lead(lead: Dict[str, Any]) -> int:
    score = 0
    if not lead.get("has_website"):
        score += 35
    if lead.get("phone"):
        score += 25
    rating = lead.get("rating")
    if rating is not None:
        score += 15 if rating >= 4.0 else 10
    else:
        score += 5
    if lead.get("address"):
        score += 10
    name_lower = (lead.get("name") or "").lower()
    if any(kw in name_lower for kw in BARBER_KEYWORDS):
        score += 5
    return min(score, 100)


async def _accept_consent_if_present(page) -> bool:
    """
    Intenta cerrar el diálogo de consentimiento de Google (cookies/privacidad).
    Puede aparecer como iframe separado (consent.google.com) o como modal
    dentro de la misma página. Devuelve True si encontró y clickeó algo.
    """
    # Caso 1: iframe de consent.google.com
    for frame in page.frames:
        if "consent.google.com" in frame.url:
            for text in CONSENT_BUTTON_TEXTS:
                try:
                    btn = frame.get_by_role("button", name=re.compile(text, re.IGNORECASE))
                    if await btn.count() > 0:
                        await btn.first.click(timeout=3000)
                        logger.info(f"Consent aceptado vía iframe con texto '{text}'")
                        await asyncio.sleep(1.5)
                        return True
                except Exception:
                    continue

    # Caso 2: modal/botón directamente en la página principal
    for text in CONSENT_BUTTON_TEXTS:
        try:
            btn = page.get_by_role("button", name=re.compile(text, re.IGNORECASE))
            if await btn.count() > 0:
                await btn.first.click(timeout=3000)
                logger.info(f"Consent aceptado en página principal con texto '{text}'")
                await asyncio.sleep(1.5)
                return True
        except Exception:
            continue

    return False


async def scrape_barberias(query: str) -> List[Dict[str, Any]]:
    """Scrape Google Maps para barberías, con manejo de consent y debug."""
    results = []
    safe_query = re.sub(r"[^a-zA-Z0-9]+", "_", query)[:40]

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--disable-blink-features=AutomationControlled"],
            )
            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                ),
                locale="es-UY",
                viewport={"width": 1366, "height": 900},
                extra_http_headers={"Accept-Language": "es-UY,es;q=0.9,en;q=0.8"},
            )
            page = await context.new_page()

            encoded = urllib.parse.quote(query)
            url = f"https://www.google.com/maps/search/{encoded}?hl=es"
            logger.info(f"Cargando: {url}")
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)

            # Intentar cerrar el consent dialog (puede tardar un toque en aparecer)
            await asyncio.sleep(1.5)
            await _accept_consent_if_present(page)

            # Esperar a que aparezcan listings, con un reintento
            listings = []
            for attempt in range(2):
                try:
                    await page.wait_for_selector('[role="article"]', timeout=10000)
                except Exception:
                    logger.warning(f"[{query}] No aparecieron listings en intento {attempt + 1}")

                await asyncio.sleep(2)
                for _ in range(5):
                    await page.keyboard.press("End")
                    await asyncio.sleep(1.5)

                listings = await page.query_selector_all('[role="article"]')
                if listings:
                    break
                # Puede que el consent haya aparecido tarde; probamos de nuevo
                await _accept_consent_if_present(page)
                await asyncio.sleep(1.5)

            logger.info(f"[{query}] {len(listings)} listings encontrados")

            if not listings:
                # Guardamos evidencia para poder ver qué pantalla nos devolvió Google
                screenshot_path = os.path.join(DEBUG_DIR, f"{safe_query}.png")
                try:
                    await page.screenshot(path=screenshot_path, full_page=True)
                    logger.warning(f"[{query}] Sin resultados. Screenshot guardado en {screenshot_path}")
                except Exception:
                    pass

            for listing in listings[:15]:
                try:
                    lead = await extract_lead_from_listing(listing, page)
                    if lead and lead.get("name"):
                        if is_valid_lead(lead):
                            lead["score"] = score_lead(lead)
                            results.append(lead)
                        else:
                            logger.info(f"Lead descartado por baja calidad: {lead.get('name')}")
                except Exception as e:
                    logger.warning(f"Error extrayendo listing: {e}")
                    continue

            await browser.close()
    except Exception as e:
        logger.error(f"Error scraping '{query}': {e}")

    logger.info(f"[{query}] Total leads válidos: {len(results)}")
    return results


async def extract_lead_from_listing(listing, page) -> Dict[str, Any]:
    lead = {}
    try:
        await listing.click()
        await asyncio.sleep(2)

        # Name — probamos varias variantes de selector
        name_el = (
            await page.query_selector('h1[class*="DUwDvf"]')
            or await page.query_selector('[data-attrid="title"] span')
            or await page.query_selector('h1.fontHeadlineLarge')
        )
        if name_el:
            lead["name"] = (await name_el.inner_text()).strip()

        # Address
        addr_el = await page.query_selector('[data-item-id="address"]')
        if addr_el:
            lead["address"] = clean_text_field(await addr_el.inner_text())
        else:
            addr_items = await page.query_selector_all('button[data-tooltip="Copiar dirección"]')
            if not addr_items:
                addr_items = await page.query_selector_all('[data-tooltip="Copiar dirección"]')
            if addr_items:
                lead["address"] = clean_text_field(await addr_items[0].inner_text())

        # Phone
        phone_el = (
            await page.query_selector('button[data-tooltip="Copiar número de teléfono"]')
            or await page.query_selector('[data-tooltip="Copiar número de teléfono"]')
        )
        if phone_el:
            lead["phone"] = (await phone_el.inner_text()).strip()
        else:
            phone_items = await page.query_selector_all('[data-item-id*="phone"]')
            for item in phone_items:
                text = await item.inner_text()
                if re.search(r'[\d\+\-\s]{6,}', text):
                    lead["phone"] = text.strip()
                    break

        if lead.get("phone"):
            lead["phone"] = clean_phone(lead["phone"])

        # Website
        web_el = await page.query_selector('[data-item-id*="authority"]')
        if web_el:
            raw_website = clean_text_field(await web_el.inner_text())
            # Verificar si es una red social (no cuenta como web real)
            is_social = any(domain in raw_website.lower() for domain in SOCIAL_DOMAINS)
            lead["website"] = raw_website if not is_social else None
            lead["has_website"] = not is_social
        else:
            lead["has_website"] = False
            lead["website"] = None

        # Rating — intentar múltiples selectores y también aria-label
        rating_el = (
            await page.query_selector('.MW4etd')
            or await page.query_selector('span.ceNzKf')
            or await page.query_selector('[aria-label*="estrella"]')
            or await page.query_selector('[aria-label*="stars"]')
        )
        if rating_el:
            # Primero intentar leer el aria-label que tiene el número directamente
            aria = await rating_el.get_attribute('aria-label') or ""
            rating_match = re.search(r'([\d][.,][\d])', aria)
            if rating_match:
                try:
                    lead["rating"] = float(rating_match.group(1).replace(",", "."))
                except Exception:
                    lead["rating"] = None
            else:
                rating_text = (await rating_el.inner_text()).strip()
                try:
                    lead["rating"] = float(rating_text.replace(",", "."))
                except Exception:
                    lead["rating"] = None
        else:
            lead["rating"] = None

        lead["source"] = "Google Maps"

    except Exception as e:
        logger.warning(f"Error extracting lead detail: {e}")

    return lead


def clean_phone(phone: str) -> str:
    if not phone:
        return phone
    cleaned = re.sub(r'[^\d\+]', '', phone)
    if cleaned.startswith('09') or cleaned.startswith('02') or cleaned.startswith('04'):
        cleaned = '+598' + cleaned[1:]
    elif not cleaned.startswith('+'):
        cleaned = '+598' + cleaned
    return cleaned
