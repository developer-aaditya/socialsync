# SocialSync - Social Media Application

SocialSync is a full-stack social media application featuring a decoupled Django REST Framework backend and a React (Vite) frontend.

---

## 📁 Repository Structure

```text
socialsync/
│
├── backend/                  # Django REST Framework Backend
│   ├── accounts/             # User management, authentication, follow system
│   ├── posts/                # Posts, comments, likes, and feed generation
│   ├── notifications/        # User activity notifications
│   ├── social_media/         # Django project settings and routing configuration
│   ├── media/                # User uploaded media (avatars, post images)
│   ├── manage.py             # Django management CLI
│   └── requirements.txt      # Python dependencies
│
├── frontend/                 # React + Vite Frontend
│   ├── src/                  # React components, pages, state management, and services
│   ├── public/               # Static assets
│   ├── index.html            # App entry HTML
│   ├── vite.config.js        # Vite bundler configuration
│   └── package.json          # Node dependencies & npm scripts
│
├── .gitignore                # Root gitignore rules
└── README.md                 # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Python**: 3.10+
- **Node.js**: 18+ & **npm**

---

### 1. Setting Up the Backend

```bash
# Navigate to the backend directory
cd backend

# Create and activate a Python virtual environment (if not created)
python -m venv env

# On Windows (PowerShell):
.\env\Scripts\Activate.ps1
# On Linux/macOS:
source env/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start the Django development server
python manage.py runserver
```

The backend REST API will be available at `http://127.0.0.1:8000/`.

---

### 2. Setting Up the Frontend

```bash
# Open a new terminal and navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

The React frontend will be available at `http://localhost:5173/`.

---

## 🛠️ Tech Stack

- **Backend**: Python, Django 6.0, Django REST Framework, SimpleJWT (JWT Authentication), SQLite / PostgreSQL
- **Frontend**: React 19, Vite, Axios
