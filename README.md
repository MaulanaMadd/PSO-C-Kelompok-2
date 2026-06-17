
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
## Code Quality

### Linting

Proyek ini menerapkan proses linting untuk menjaga kualitas dan konsistensi kode.

#### Backend
- Ruff

#### Frontend
- ESLint
- eslint-plugin-react-hooks
- eslint-plugin-react-refresh

---

## Testing

### Backend Testing

Framework:
- Pytest
- Pytest Asyncio
- Pytest Coverage

Jenis pengujian:
- Unit Testing
- API Testing
- Recommendation Engine Testing

### Frontend Testing

Framework:
- Vitest
- React Testing Library
- Jest DOM

Jenis pengujian:
- Component Testing
- Context Testing
- Page Testing
- Service Testing

---

## Test Coverage

Coverage pengujian frontend:

| Metric | Coverage |
|----------|----------|
| Statements | 83.21% |
| Branches | 83.45% |
| Functions | 67.79% |
| Lines | 83.21% |

Coverage minimum yang ditetapkan pada proyek adalah 60%.
---
**RUN Application :** https://project-optimasi-operasional-reduks-eta.vercel.app/login

**Catatan:** Pastikan untuk selalu melakukan sinkronisasi antara model database backend dan schema database lokal Anda.
