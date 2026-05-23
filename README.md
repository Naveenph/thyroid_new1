# Thyroid Project

A web application for thyroid prediction and analysis, featuring a React (Vite + Tailwind CSS) frontend and a FastAPI backend integrated with a MySQL database.

---

## Prerequisites

Before running the project, make sure you have the following installed:
1. **Python 3.10+** (Ensure it is added to your PATH)
2. **Node.js** (LTS version) & **npm**
3. **XAMPP** (or any MySQL database server running locally on port 3306)

---

## Setup & Running Guide

Follow these steps to set up and run the application on your local machine.

### Step 1: Start MySQL Database
1. Open the **XAMPP Control Panel**.
2. Click **Start** next to **MySQL** (make sure port `3306` is active and green).
3. Keep the control panel open while running the application.
> **Note**: The backend is configured to automatically create the database (`thyroid_db`) and all required tables on its first startup. You don't need to manually create any tables!

---

### Step 2: Configure Environment Variables
1. In the root directory of the project, create a file named `.env`.
2. Copy the content from `.env.example` into your new `.env` file:
   ```ini
   GEMINI_API_KEY=your_gemini_api_key_here
   DATABASE_URL=mysql+pymysql://root:@localhost/thyroid_db
   ```
3. Replace `your_gemini_api_key_here` with your actual Gemini API key. If your MySQL server has a password, update the `DATABASE_URL` format accordingly: `mysql+pymysql://root:password@localhost/thyroid_db`.

---

### Step 3: Run the Backend (FastAPI)
Open a terminal (e.g., PowerShell or Command Prompt) in the **root directory** of the project and run:

1. **Create a virtual environment**:
   ```powershell
   python -m venv venv
   ```
2. **Activate the virtual environment**:
   * On Windows (PowerShell):
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   * On Windows (Command Prompt):
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   * On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```
3. **Install the dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Start the FastAPI backend server**:
   ```bash
   python api.py
   ```
The backend server will start running on **[http://127.0.0.1:8000](http://127.0.0.1:8000)**.

---

### Step 4: Run the Frontend (React + Vite)
Open a **new** terminal window, navigate to the `frontend` folder, and run:

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```
2. **Install frontend dependencies**:
   ```bash
   npm install
   ```
3. **Start the React dev server**:
   ```bash
   npm run dev
   ```
The frontend application will start running on **[http://localhost:5173](http://localhost:5173)**. Open this link in your browser to interact with the project!
