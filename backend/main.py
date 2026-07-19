from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import asyncio
import json
from scraper import scrape_barberias
from database import (
    init_db, get_leads, save_lead,
    update_lead_status, update_lead_notes, get_stats
)
from message_generator import generate_message

app = FastAPI(title="BarberLead API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

scraping_status = {"running": False, "progress": 0, "total": 0, "message": ""}


@app.on_event("startup")
async def startup():
    await init_db()


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/stats")
async def stats():
    return await get_stats()


@app.get("/leads")
async def leads(
    has_web: Optional[bool] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "score",
):
    return await get_leads(has_web=has_web, status=status, search=search, sort_by=sort_by)


@app.post("/scrape/start")
async def start_scrape(background_tasks: BackgroundTasks):
    global scraping_status
    if scraping_status["running"]:
        raise HTTPException(status_code=400, detail="Ya hay un scraping en progreso")
    scraping_status = {"running": True, "progress": 0, "total": 0, "message": "Iniciando..."}
    background_tasks.add_task(run_scraping)
    return {"message": "Scraping iniciado"}


@app.get("/scrape/status")
async def scrape_status():
    return scraping_status


@app.get("/scrape/stream")
async def scrape_stream():
    async def event_generator():
        while scraping_status["running"] or scraping_status["message"]:
            data = json.dumps(scraping_status)
            yield f"data: {data}\n\n"
            if not scraping_status["running"]:
                break
            await asyncio.sleep(1)
    return StreamingResponse(event_generator(), media_type="text/event-stream")


class MessageRequest(BaseModel):
    lead_id: int
    tone: str = "amigable"


@app.post("/message/generate")
async def gen_message(req: MessageRequest):
    leads_list = await get_leads()
    lead = next((l for l in leads_list if l["id"] == req.lead_id), None)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    msg = await generate_message(lead, req.tone)
    return {"message": msg}


class StatusUpdate(BaseModel):
    status: str


@app.patch("/leads/{lead_id}/status")
async def update_status(lead_id: int, update: StatusUpdate):
    await update_lead_status(lead_id, update.status)
    return {"ok": True}


class NotesUpdate(BaseModel):
    notes: str


@app.patch("/leads/{lead_id}/notes")
async def update_notes(lead_id: int, update: NotesUpdate):
    await update_lead_notes(lead_id, update.notes)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Zonas de búsqueda — Montevideo (barrios) + Interior Uruguay
# ---------------------------------------------------------------------------
ZONAS = [
    # Montevideo — barrios principales
    "barberias Pocitos Montevideo Uruguay",
    "barberias Punta Carretas Montevideo Uruguay",
    "barberias Carrasco Montevideo Uruguay",
    "barberias Malvin Montevideo Uruguay",
    "barberias Centro Montevideo Uruguay",
    "barberias Ciudad Vieja Montevideo Uruguay",
    "barberias Buceo Montevideo Uruguay",
    "barberias Tres Cruces Montevideo Uruguay",
    "barberias Parque Batlle Montevideo Uruguay",
    "barberias Cordón Montevideo Uruguay",
    "barberias Palermo Montevideo Uruguay",
    "barberias Aguada Montevideo Uruguay",
    "barberias Prado Montevideo Uruguay",
    "barberias La Blanqueada Montevideo Uruguay",
    "barberias Reducto Montevideo Uruguay",
    # Montevideo — queries alternativas
    "peluquería hombre Pocitos Montevideo",
    "peluquería masculina Centro Montevideo",
    "salón barbería Carrasco Montevideo",
    # Interior Uruguay — ciudades principales
    "barberias Maldonado Uruguay",
    "barberias Punta del Este Uruguay",
    "barberias Paysandú Uruguay",
    "barberias Salto Uruguay",
    "barberias Rivera Uruguay",
    "barberias Canelones Uruguay",
    "barberias Las Piedras Uruguay",
]


async def run_scraping():
    global scraping_status
    try:
        scraping_status["total"] = len(ZONAS)
        scraping_status["message"] = "Buscando barberías en Google Maps..."

        all_leads = []
        for i, zona in enumerate(ZONAS):
            scraping_status["progress"] = i + 1
            scraping_status["message"] = f"Scrapeando: {zona}..."
            leads = await scrape_barberias(zona)
            all_leads.extend(leads)

        scraping_status["message"] = "Guardando leads en base de datos..."
        saved = 0
        for lead in all_leads:
            result = await save_lead(lead)
            if result:
                saved += 1

        scraping_status["running"] = False
        scraping_status["message"] = f"✅ Completado. {saved} leads procesados de {len(ZONAS)} zonas."
    except Exception as e:
        scraping_status["running"] = False
        scraping_status["message"] = f"❌ Error: {str(e)}"
