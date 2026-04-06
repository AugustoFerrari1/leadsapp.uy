# ✂ BarberLead

App para conseguir leads de barberías en Uruguay, con scraping automático de Google Maps y generador de mensajes de WhatsApp con IA.

---

## 🗂 Estructura del proyecto

```
barberlead/
├── backend/
│   ├── main.py              # API FastAPI
│   ├── scraper.py           # Scraping Google Maps con Playwright
│   ├── database.py          # Base de datos Neon (PostgreSQL)
│   ├── message_generator.py # Generador de mensajes con Claude AI
│   ├── requirements.txt
│   └── .env.example         # ← copiá esto como .env y completalo
└── frontend/
    ├── src/
    │   ├── App.js / App.css
    │   ├── index.js / index.css
    │   └── pages/
    │       ├── Dashboard.js / Dashboard.css
    │       └── Leads.js / Leads.css
    ├── public/index.html
    ├── package.json
    └── .env
```

---

## ⚙ Setup paso a paso

## Requisito de Python

Usá `Python 3.12`.

Este backend hoy no es compatible con `Python 3.14`: dependencias como `greenlet`, `asyncpg` y `pydantic-core` fallan al compilar con esa versión.

### 1. Crear base de datos en Neon (gratis)

1. Andá a https://neon.tech y creá una cuenta gratis
2. Creá un nuevo proyecto llamado `barberlead`
3. Copiá la **connection string** que tiene este formato:
   ```
   postgresql://usuario:password@ep-algo.us-east-2.aws.neon.tech/barberlead?sslmode=require
   ```

### 2. Conseguir API Key de Anthropic

1. Andá a https://console.anthropic.com
2. Creá una cuenta y generá una API key
3. Guardala, la vas a necesitar en el `.env`

### 3. Configurar el backend

```bash
cd backend

# Crear el archivo .env (copiá el ejemplo)
cp .env.example .env

# Editá .env y pegá tu DATABASE_URL y ANTHROPIC_API_KEY
nano .env   # o abrilo con cualquier editor

# Crear entorno virtual Python
python3.12 -m venv venv
source venv/bin/activate   # En Windows: venv\Scripts\activate

# Instalar dependencias
python -m pip install --upgrade pip
pip install -r requirements.txt

# Instalar navegador para Playwright (solo la primera vez)
playwright install chromium
```

### 4. Iniciar el backend

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

Si todo está bien, vas a ver:
```
✅ Base de datos inicializada
INFO: Uvicorn running on http://127.0.0.1:8000
```

### 5. Configurar e iniciar el frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar
npm start
```

Se abre en http://localhost:3000

---

## 🚀 Uso

1. **Dashboard** → Click en "Iniciar Scraping" → espera que termine (5-10 min)
2. **Leads** → Filtrá por "Sin web" para ver los mejores prospectos
3. Seleccioná un lead → elegí el tono → "Generar mensaje"
4. Editá el mensaje si querés → "Abrir en WhatsApp" → listo!

---

## 📊 Filtros disponibles

| Filtro | Qué hace |
|--------|----------|
| Sin web | Barberías sin presencia digital = mejor lead |
| Con web | Ya están digitalizados |
| Nuevo | Leads recién scrapeados |
| Contactado | Ya les mandaste mensaje |
| Interesado | Respondieron con interés |
| Descartado | No aplican |

---

## 🔧 Problemas comunes

**"Error de conexión" en el frontend**
→ Asegurate que el backend esté corriendo en el puerto 8000

**"Ya hay un scraping en progreso"**
→ Esperá que termine el actual o reiniciá el backend

**Playwright no encuentra el navegador**
→ Corré `playwright install chromium` de nuevo

**Error de base de datos**
→ Verificá que el `DATABASE_URL` en `.env` esté correcto y tenga `?sslmode=require`

---

## 🗺 Zonas que scrapea

Por defecto busca en 10 zonas de Montevideo:
- Centro, Pocitos, Punta Carretas, Malvín, Carrasco
- Buceo, Ciudad Vieja, Tres Cruces, Parque Batlle, y búsqueda general

Para agregar más zonas, editá el array `zonas` en `backend/main.py`.

---

## 💬 Tonos de mensajes disponibles

- **Amigable**: Como un conocido que habla con otro, estilo River Plate
- **Directo**: Al punto, sin rodeos
- **Curioso**: Hace una pregunta que despierta interés

---

## 📦 ¿Querés desplegarlo en la nube?

### Backend (Render.com - gratis)
1. Subí el repo a GitHub
2. Creá un nuevo Web Service en render.com
3. Build command: `pip install -r requirements.txt && playwright install chromium`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Agregá las variables de entorno (DATABASE_URL, ANTHROPIC_API_KEY)

### Frontend (Vercel - gratis)
1. Conectá el repo en vercel.com
2. Root directory: `frontend`
3. Agregá variable de entorno: `REACT_APP_API_URL=https://tu-backend.render.com`
