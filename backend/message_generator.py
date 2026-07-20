"""
Local WhatsApp message generator for Turno.uy outreach.

The best lead offer is a personalized demo: name, services and hours loaded
before asking the owner to create an account.
"""

import random
from typing import Dict, Any

DEMO_PAGE = "https://turno.uy/barberia-demo"
FEATURES_PAGE = "https://turno.uy/#funcionalidades"

TEMPLATES = {
    "amigable": [
        "Buenas, como va? Soy Augusto, de Montevideo.\n\nEstoy trabajando en Turno.uy, una agenda online hecha para barberias uruguayas. Vi {context} y pense que podia servirles para que los clientes reserven solos, reciban recordatorio por WhatsApp y ustedes pierdan menos turnos.\n\nSi te pinta, te armo una demo gratis con el nombre de la barberia, servicios and horarios para que veas como quedaria. Te la paso por aca sin compromiso.",
    ],
}

FOLLOW_UPS = [
    "Te dejo el ejemplo general por si queres mirarlo antes: {demo_page}\n\nLa gracia no es solo tener una web: es que el cliente reserve solo, le llegue recordatorio y vos tengas menos idas y vueltas por WhatsApp.",
    "Dato simple: si recuperan un solo turno perdido por mes, la herramienta ya empieza a justificarse. Por eso la demo la armo con datos reales de la barberia, no con una pantalla generica.",
    "Tambien sirve si ya tienen web: Turno.uy puede sumar reservas, recordatorios y dashboard sin cambiar toda la presencia digital.",
]


def _context_for(lead: Dict[str, Any]) -> str:
    if lead.get("has_website"):
        return "que ya tienen presencia online"
    if lead.get("phone"):
        return "su ficha en Google Maps y que no aparece una web de reservas"
    return "su ficha en Google Maps"


async def generate_message(lead: Dict[str, Any], tone: str = "amigable") -> str:
    name = (lead.get("name") or "la barberia").strip()
    template_pool = TEMPLATES.get(tone) or TEMPLATES["amigable"]
    message = random.choice(template_pool).format(
        name=name,
        context=_context_for(lead),
        demo_page=DEMO_PAGE,
        features_page=FEATURES_PAGE,
    )

    # Compatible con el campo "score" o "quality_score"
    score = lead.get("score", lead.get("quality_score", 0))
    if score >= 75:
        message += "\n\nAca podes ver todo lo que tiene: https://turno.uy/#funcionalidades"

    return message


def get_follow_up_template() -> str:
    return random.choice(FOLLOW_UPS).format(demo_page=DEMO_PAGE)
