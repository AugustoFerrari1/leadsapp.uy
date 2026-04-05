"""
message_generator.py
--------------------
Generador de mensajes LOCAL — sin Claude API.
Usa templates hardcodeados con acento rioplatense (uruguayo).
Cuando quieras reactivar la IA, reemplazá generate_message()
por la versión comentada al final del archivo.
"""

import random
from typing import Dict, Any

TEMPLATES_SIN_WEB: Dict[str, list] = {
    "amigable": [
        "Buenas {name}, ¿cómo va? Soy Augusto Ferrari, estoy armando una app para barberías uruguayas. Vi que no tienen web y quería mostrarte algo que armé justo para eso. Podés verlo sin registrarte ni nada desde acá: {demo_page} y {demo_dash}",

        "Hola {name}! Soy Augusto. Estoy arrancando con una app para barberías y vi la tuya en Google Maps. Armé una app que ofrece una landing y un dashboard con reservas, finanzas y todo eso. Si querés curiosear sin crear cuenta: {demo_page} y {demo_dash}",

        "Buenas {name}! Me llamo Augusto y soy de Montevideo. Estoy construyendo una herramienta para barberías de acá. Vi que no tienen web y te quería mostrar la app. Sin registrarte ni nada podes probarla: {demo_page} y {demo_dash}",

        "Ey {name}, ¿todo bien? Soy Augusto, estoy arrancando con un SaaS para barberías uruguayas. Vi la tuya en Maps y quería mostrarte el producto. Entrá y miralo tranquilo, no pedimos nada: {demo_page} y {demo_dash}",

        "Hola {name}! Soy Augusto. Estoy empezando con una app para barberías y la tuya me apareció en Google Maps. Tiene landing para clientes, reservas, dashboard con finanzas y liquidaciones. Todo lo podes ver y usar sin registrarte: {demo_page} y {demo_dash}",
    ],

    "directo": [
        "Buenas {name}. Soy Augusto, armé una app para barberías uruguayas. Landing, reservas online, dashboard con finanzas y liquidaciones. Sin web hoy estás perdiendo clientes que buscan en Google. Miralo sin registrarte: {demo_page} y {demo_dash}",

        "Buenas {name}. Me llamo Augusto. Tengo una app para barberías ofrece una landing, sistema de reservas y dashboard que te calcula todo solo (finanzas, estadisticas, etc). Podés probarla sin registrarte: {demo_page} y {demo_dash}",

        "Hola {name}, soy Augusto. Armé una herramienta para barberías: web propia, turnos online y un panel que te lleva las cuentas. Todo para ver ahora mismo sin crear cuenta: {demo_page} y {demo_dash}",

        "Buenas {name}. Augusto, estoy construyendo una app para barberías de Montevideo. Ofrece una Landing, sistema de reservas y dashboard con finanzas. Probala sin registrarte: {demo_page} y {demo_dash}",
    ],

    "curioso": [
        "Buenas {name}! Soy Augusto, estoy arrancando con una app para barberías. La pregunta que me hice cuando la armé: ¿cuántos clientes buscan barbería en Google y se van porque no encuentran nada? Armé algo para eso, miralo sin registrarte: {demo_page} y {demo_dash}",

        "Ey {name}, ¿cómo va? Me llamo Augusto. Estoy empezando con un SaaS para barberías uruguayas. La idea es simple: que el cliente entre a tu web, saque turno solo, y vos veas todo desde un dashboard. Sin cuenta: {demo_page} y {demo_dash}",

        "Hola {name}! Soy Augusto. Vi tu barbería en Maps sin web y me pregunté cuántos clientes te buscan online y no te encuentran. Armé algo para eso. Podés curiosear acá: {demo_page} y {demo_dash}",

        "Buenas {name}. Me llamo Augusto y estoy arrancando con una app para barberías. Landing para presentarse, turnos online y un dashboard que te hace los cálculos solo. Miralo tranquilo sin registrarte: {demo_page} y {demo_dash}",

        "Ey {name}! Augusto. Construí una herramienta para barberías de acá — web, reservas y un panel con todo: finanzas, costo fijo, liquidaciones si tenés empleados. Sin crear cuenta: {demo_page} y {demo_dash}",
    ],
},

TEMPLATES_CON_WEB: Dict[str, list] = {
    "amigable": [
        "Buenas {name}, ¿cómo van? Soy Augusto, estoy arrancando con una app para barberías. Vi que ya tienen web. Lo que armé suma arriba de eso: reservas integradas y un dashboard con finanzas y liquidaciones. Miralo sin registrarte: {demo_page} y {demo_dash}, si te interesa lo integramos gratis",

        "Hola {name}! Me llamo Augusto. Estoy empezando con un SaaS para barberías uruguayas. Vi la web que tienen. Lo que tengo agrega turnos online y un panel que te lleva las cuentas solo. Sin cuenta ni nada: {demo_page} y {demo_dash}, si te interesa lo integramos gratis",

        "Buenas {name}! Soy Augusto. Vi que tienen una web, ya están un paso adelante. Armé un dashboard para barberías con reservas, finanzas y liquidaciones. Si querés probarla sin registrarte: {demo_page} y {demo_dash}, si te interesa lo integramos gratis",
    ],

    "directo": [
        "Buenas {name}. Augusto, armé una app para barberías. Tienen web, el siguiente paso es reservas online y un dashboard con finanzas y liquidaciones. Sin registrarte: {demo_page} y {demo_dash}",

        "Hola {name}. Soy Augusto. Vi la web. Si le agregan turnos online y un panel que les lleve las cuentas, la barbería trabaja más sola. Miralo sin cuenta: {demo_page} y {demo_dash}",

        "Buenas {name}. Me llamo Augusto, estoy construyendo un SaaS para barberías. Web tienen, queda sumar reservas automáticas y dashboard. Sin crear cuenta: {demo_page} y {demo_dash}",

        "Hola {name}. Augusto. Tienen web, buenísimo. Armé algo que agrega reservas, finanzas y liquidaciones arriba de eso. Entrá y fijate: {demo_page} y {demo_dash}",

        "Buenas {name}. Soy Augusto. Web lista. Lo que falta es que trabaje sola: turnos, finanzas, todo desde un panel. Sin registrarte: {demo_page} y {demo_dash}",
    ],

    "curioso": [],
},

# ---------------------------------------------------------------------------
# Función principal (reemplaza a la versión que usaba Claude)
# ---------------------------------------------------------------------------

async def generate_message(lead: Dict[str, Any], tone: str = "amigable") -> str:
    """
    Devuelve un mensaje de WhatsApp listo para enviar manualmente.
    Selecciona un template local según si el lead tiene web o no, y el tono.
    
    ⏸  Claude API en pausa — sin costos, sin latencia.
    """
    has_web = lead.get("has_website", False)
    name = lead.get("name", "che")

    # Agarrar el pool correcto
    pool = TEMPLATES_CON_WEB if has_web else TEMPLATES_SIN_WEB
    tone_pool = pool.get(tone, pool["amigable"])

    # Elegir aleatoriamente para que no sean todos iguales
    template = random.choice(tone_pool)

    # Nombre limpio para insertar (sin "Barbería" redundante si ya está en el nombre)
    clean_name = name.strip()

    return template.format(name=clean_name)


# ---------------------------------------------------------------------------
# VERSIÓN CON IA — descomentar cuando quieras reactivar Claude
# ---------------------------------------------------------------------------
#
# import anthropic
# import os
#
# _client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
#
# TONE_PROMPTS = {
#     "amigable": "amigable y cercano, como un conocido que le habla a otro",
#     "directo":  "directo y al punto, sin rodeos pero sin ser frío",
#     "curioso":  "haciendo una pregunta que despierte curiosidad, sin revelar todo de entrada",
# }
#
# async def generate_message(lead, tone="amigable"):
#     has_web = lead.get("has_website", False)
#     name = lead.get("name", "la barbería")
#     web_context = (
#         "La barbería YA tiene sitio web, el ángulo es algo mejor o más específico."
#         if has_web else
#         "La barbería NO tiene sitio web, lead muy frío, gestiona todo a mano o por WPP."
#     )
#     tone_desc = TONE_PROMPTS.get(tone, TONE_PROMPTS["amigable"])
#     prompt = f"""Sos un emprendedor uruguayo que creó un SaaS para barberías.
# Escribí un mensaje WPP para "{name}". Contexto: {web_context}.
# Tono: {tone_desc}. Rioplatense natural. Máx 5 oraciones. Sin precios. Sin spam.
# Solo el mensaje, sin comillas."""
#     msg = _client.messages.create(
#         model="claude-opus-4-5", max_tokens=300,
#         messages=[{"role": "user", "content": prompt}]
#     )
#     return msg.content[0].text.strip()
