# Django SocialSync API - Beginner Tutorial

## What We're Building
A simple social media backend API where users can:
- Sign up and log in
- Manage their profile
- Create, view, and delete posts
- Like and dislike posts

## Tech Stack
- Django (Python web framework)
- Django REST Framework (for building APIs)
- PostgreSQL (database)
- JWT Authentication (for secure login)

---


### Create Virtual Environment
```bash
# Create virtual environment
python -m venv env

# Activate it
env\Scripts\activate
```

### Install Dependencies
```bash
pip install django
pip install djangorestframework
pip install djangorestframework-simplejwt
pip install psycopg2-binary
pip install pillow
pip install python-decouple
```

### Create Django Project
```bash
django-admin startproject socialsync .
cd socialsync
python manage.py startapp accounts
python manage.py startapp posts
```

### PostgreSQL Setup
1. Install PostgreSQL on your computer
2. Create a database named 'socialsync_db'
3. Create a user with password
4. Update settings.py with database credentials
