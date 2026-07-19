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
        "Buenas {name}, como va? Soy Augusto, de Montevideo.\n\nEstoy trabajando en Turno.uy, una agenda online hecha para barberias uruguayas. Vi {context} y pense que podia servirles para que los clientes reserven solos, reciban recordatorio por WhatsApp y ustedes pierdan menos turnos.\n\nSi te pinta, te armo una demo gratis con el nombre de la barberia, servicios and horarios para que veas como quedaria. Te la paso por aca sin compromiso.",
        "Hola {name}! Soy Augusto.\n\nEstoy ayudando a barberias de Uruguay a ordenar los turnos sin dejar de usar WhatsApp. La idea es simple: el cliente reserva solo, el sistema recuerda el turno y vos ves agenda, barberos e ingresos en un panel.\n\nVi {context}. Si queres, te preparo una demo personalizada de {name} y te muestro el link de reservas como si ya estuviera funcionando.",
        "Buenas {name}. Te escribo porque estoy armando Turno.uy para barberias que reciben muchos mensajes por WhatsApp e Instagram.\n\nVi {context}. En vez de mandarte una app generica, puedo dejarte una demo con tus servicios y horarios para que veas si realmente te ahorra tiempo.\n\nTe interesa que te la arme?",
    ],
    "directo": [
        "Buenas {name}. Soy Augusto, creador de Turno.uy.\n\nVi {context}. Si hoy coordinan turnos por WhatsApp, cada mensaje sin responder y cada olvido puede terminar en un hueco de agenda.\n\nTe puedo armar una demo gratis con el nombre de la barberia, servicios y horarios. Si recuperan un turno perdido al mes, el sistema ya se paga.",
        "Hola {name}, soy Augusto.\n\nTurno.uy es una agenda online para barberias uruguayas: reservas 24/7, recordatorios por WhatsApp, agenda por barbero y dashboard de ingresos.\n\nVi {context}. Te armo una demo personalizada y te muestro como quedaria el link de reservas de la barberia?",
        "Buenas {name}. Estoy contactando barberias de 2 a 6 barberos que quieren depender menos de WhatsApp para agendar.\n\nVi {context}. Te puedo preparar una demo con sus horarios y servicios para que la evalues en 2 minutos. Sin tarjeta y sin compromiso.",
    ],
    "curioso": [
        "Buenas {name}! Pregunta rapida: cuantos turnos se les pierden al mes por mensajes que quedan colgados o clientes que se olvidan?\n\nSoy Augusto y estoy armando Turno.uy para barberias uruguayas. Vi {context} y creo que una demo personalizada les puede servir para verlo aterrizado a su negocio.\n\nTe la preparo con nombre, servicios y horarios?",
        "Hola {name}, como va? Si un cliente entra desde Instagram o Google fuera de horario, hoy puede reservar solo o tiene que esperar que alguien responda?\n\nEstoy creando Turno.uy para resolver justo eso en barberias de Uruguay. Vi {context}. Si queres, te armo un link demo de reservas para {name}.",
        "Buenas {name}. Estoy probando algo con barberias: les armo gratis una demo de agenda online y despues me dicen si les ahorraria mensajes.\n\nVi {context}. La demo incluye reservas, recordatorios por WhatsApp y panel para ver turnos e ingresos.\n\nTe interesa ver como quedaria la tuya?",
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
        message += "\n\nPinta buen fit porque parece una barberia activa. Por eso te propongo arrancar directo con la demo personalizada."

    return message


def get_follow_up_template() -> str:
    return random.choice(FOLLOW_UPS).format(demo_page=DEMO_PAGE)
