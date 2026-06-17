
# Optina Application
Dashboard komprehensif untuk memantau dan menganalisis data operasional reduksi, dengan fokus pada deteksi dini anomali (Current Efficiency Early Detection)
## 🚀 Fitur Utama

*   **Dashboard Real-time**: Visualisasi metrik utama operasional (KPI) secara real-time.
*   **Early Detection**: Sistem peringatan dini untuk mendeteksi potensi masalah pada pot reduksi.
*   **Pot Detail Monitoring**: Halaman detail untuk analisis mendalam performa per pot.
*   **Data Visualization**: Grafik interaktif menggunakan Recharts untuk tren dan analisis historis.

## 🛠 Tech Stack

### Frontend
*   **Framework**: [React](https://react.dev/) v19
*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **Styling**: Vanilla CSS (Modular & Responsive)
*   **State Management & Data Fetching**: React Hooks, Axios
*   **Visualization**: [Recharts](https://recharts.org/)
*   **Icons**: Lucide React

### Backend
*   **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
*   **Database**: PostgreSQL
*   **ORM/Driver**: AsyncPG (Asynchronous PostgreSQL driver)
*   **Authentication**: JWT (JSON Web Tokens) with Passlib & Python-Jose
*   **Validation**: Pydantic

## 📋 Prasyarat

Sebelum memulai, pastikan Anda telah menginstal:
*   [Node.js](https://nodejs.org/) (v18 atau lebih baru)
*   [Python](https://www.python.org/) (v3.10 atau lebih baru)
*   [PostgreSQL](https://www.postgresql.org/)
*   [Docker](https://www.docker.com/) (Optional, untuk deployment containerized)


# Dokumentasi CI/CD Project
---

# 🔍 Code Quality

## Backend Linting

Tool:

- Ruff

Run linting:

```bash
cd backend

ruff check .
```

Auto fix:

```bash
ruff check . --fix
```

---

## Frontend Linting

Tools:

- ESLint
- eslint-plugin-react-hooks
- eslint-plugin-react-refresh

Run linting:

```bash
cd frontend

npm run lint
```

# 🧪 Testing

## Backend Testing

Framework:

- Pytest
- Pytest Asyncio
- Pytest Coverage

### Unit Testing

Files tested:

```text
tests/unit/test_auth_core.py
tests/unit/test_preprocessing.py
tests/unit/test_recommendation_engine.py
tests/unit/test_schemas.py
```

Run test:

```bash
pytest
```

Coverage:

```bash
pytest --cov=app
```

---

### API Testing

Files tested:

```text
tests/api/test_auth_api.py
tests/api/test_notifications_api.py
```

Purpose:

- Authentication endpoint testing
- Notification endpoint testing
- API integration testing

---

## Frontend Testing

Framework:

- Vitest
- React Testing Library
- Jest DOM

### Component Testing

```text
src/components/__tests__/common.test.jsx
src/components/__tests__/dashboard.test.jsx
src/components/common/__tests__/ProtectedRoute.test.jsx
```

### Context Testing

```text
src/context/__tests__/UserContext.test.jsx
```

### Page Testing

```text
src/pages/__tests__/pages.test.jsx
```

### Service Testing

```text
src/services/__tests__/api.test.js
src/services/__tests__/services.test.js
```

Run tests:

```bash
npm run test
```

Generate coverage:

```bash
npm run coverage
```

---

# 📊 Test Coverage

| Metric | Coverage |
|----------|----------|
| Statements | 83.21% |
| Branches | 83.45% |
| Functions | 67.79% |
| Lines | 83.21% |

Minimum coverage threshold:

```text
60%
```
## ⚙️ Instalasi & Menjalankan Aplikasi

### 1. Clone Repository

```bash
git clone https://github.com/your-repo/PSO-Kelompok2
cd PSO-Kelompok2
```

### 2. Backend Setup

Masuk ke direktori backend, buat virtual environment, dan install dependencies.

```bash
cd backend
# Buat virtual environment
python -m venv venv

# Aktifkan virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**Konfigurasi Database:**
Pastikan PostgreSQL berjalan dan buat database baru. Sesuaikan konfigurasi koneksi di file `.env` (buat file `.env` berdasarkan contoh jika ada, atau set variabel environment secara manual).

**Jalankan Server:**

```bash
uvicorn app.main:app --reload
```
Backend akan berjalan di `http://localhost:8000`.

### 3. Frontend Setup

Buka terminal baru, masuk ke direktori frontend.

```bash
cd frontend

# Install dependencies
npm install
```

**Konfigurasi Environment:**
Pastikan frontend mengetahui URL backend. Cek file `.env` atau konfigurasi API client.

**Jalankan Development Server:**

```bash
npm run dev
```
Frontend akan berjalan di `http://localhost:5173` (atau port lain yang ditampilkan di terminal).

## 🐳 Menjalankan dengan Docker

Proyek ini menyertakan `docker-compose.yml` untuk kemudahan deployment.

```bash
# Dari root directory
docker-compose up --build
```
**RUN Application :** https://project-optimasi-operasional-reduks-eta.vercel.app/login

**Catatan:** Pastikan untuk selalu melakukan sinkronisasi antara model database backend dan schema database lokal Anda.
