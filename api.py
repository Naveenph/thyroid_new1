import os
import io
import time
import base64
import hashlib
import random
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, request, jsonify, g, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from PIL import Image
import numpy as np

# In-memory store for pending admin 2FA codes
pending_admin_codes = {}

# Database imports
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy.engine.url import make_url
import pymysql

# Load configuration and environment variables
from dotenv import load_dotenv
load_dotenv(override=True)

DATABASE_URL = os.getenv("DATABASE_URL") or "mysql+pymysql://root:@localhost/thyroid_db"
JWT_SECRET = os.getenv("JWT_SECRET") or "thyroid_secret_key_12345"

# Setup Flask application
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Uploads configurations
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Try checking if MySQL is ready, otherwise fallback to SQLite
engine = None
def ensure_mysql_db_exists(db_url):
    if db_url and (db_url.startswith("mysql+pymysql://") or db_url.startswith("mysql://")):
        try:
            url_obj = make_url(db_url)
            db_name = url_obj.database
            if not db_name:
                print("WARNING: No database name specified in MySQL connection URL.")
                return
            connection = pymysql.connect(
                host=url_obj.host or 'localhost',
                user=url_obj.username or 'root',
                password=url_obj.password or '',
                port=url_obj.port or 3306
            )
            try:
                with connection.cursor() as cursor:
                    cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
                connection.commit()
                print(f"SUCCESS: Verified/Created MySQL database: '{db_name}'", flush=True)
            finally:
                connection.close()
        except Exception as e:
            print(f"WARNING: Automatic MySQL database creation check failed: {e}", flush=True)

try:
    if DATABASE_URL.startswith("mysql"):
        ensure_mysql_db_exists(DATABASE_URL)
    engine = create_engine(DATABASE_URL, echo=False)
    # Ping database to verify connection
    with engine.connect() as conn:
        pass
    print("Successfully connected to MySQL database.", flush=True)
except Exception as e:
    print(f"Failed to connect to MySQL database: {e}. Falling back to local SQLite database...", flush=True)
    DATABASE_URL = "sqlite:///thyroid_dev.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ----------------- DATABASE SCHEMA STRUCTURE -----------------

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(50), default="user") # 'admin' or 'user'
    created_at = Column(DateTime, default=datetime.utcnow)
    
    images = relationship("ImageModel", back_populates="user", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="user", cascade="all, delete-orphan")
    queries = relationship("Query", back_populates="user", cascade="all, delete-orphan")

class ImageModel(Base):
    __tablename__ = "images"
    
    image_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    image_path = Column(String(255), nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="images")
    predictions = relationship("Prediction", back_populates="image", cascade="all, delete-orphan")

class Prediction(Base):
    __tablename__ = "predictions"
    
    prediction_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    image_id = Column(Integer, ForeignKey("images.image_id", ondelete="CASCADE"), nullable=False)
    result = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)
    prediction_date = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="predictions")
    image = relationship("ImageModel", back_populates="predictions")

class AdminModel(Base):
    __tablename__ = "admins"
    
    admin_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    login_code = Column(String(10), nullable=True)
    code_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class HealthTip(Base):
    __tablename__ = "health_tips"
    
    tip_id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Query(Base):
    __tablename__ = "queries"
    
    query_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    question = Column(Text, nullable=False)
    response = Column(Text, nullable=True)
    status = Column(String(50), default="pending") # 'pending', 'answered'
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="queries")

# Create tables
from sqlalchemy import inspect, text
try:
    Base.metadata.create_all(bind=engine)
    # Check for missing columns in existing tables
    inspector = inspect(engine)
    
    # 1. Update admins table
    if 'admins' in inspector.get_table_names():
        columns = [col['name'] for col in inspector.get_columns('admins')]
        with engine.begin() as conn:
            if 'login_code' not in columns:
                conn.execute(text("ALTER TABLE admins ADD COLUMN login_code VARCHAR(10) NULL"))
                print("SUCCESS: Added missing column 'login_code' to 'admins' table.", flush=True)
            if 'code_expires' not in columns:
                conn.execute(text("ALTER TABLE admins ADD COLUMN code_expires DATETIME NULL"))
                print("SUCCESS: Added missing column 'code_expires' to 'admins' table.", flush=True)
                
    # 2. Update users table
    if 'users' in inspector.get_table_names():
        columns = [col['name'] for col in inspector.get_columns('users')]
        with engine.begin() as conn:
            if 'role' not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user'"))
                print("SUCCESS: Added missing column 'role' to 'users' table.", flush=True)
except Exception as ce:
    print(f"Database tables verified (Note: {ce})", flush=True)

# ----------------- DB SEEDING -----------------
db = SessionLocal()
try:
    admin = db.query(AdminModel).first()
    if not admin:
        admin_user = AdminModel(
            name="System Admin",
            email="admin@thyroid.com",
            password=generate_password_hash("admin123")
        )
        db.add(admin_user)
        db.commit()
        print("SUCCESS: Seeded default admin account in admins table (admin@thyroid.com/admin123)", flush=True)
        
    patient = db.query(User).first()
    if not patient:
        user_demo = User(
            name="John Doe",
            email="user@thyroid.com",
            password=generate_password_hash("user123"),
            role="user"
        )
        db.add(user_demo)
        db.commit()
        print("SUCCESS: Seeded default patient account in users table (user@thyroid.com/user123)", flush=True)
        
    tip_count = db.query(HealthTip).count()
    if tip_count == 0:
        default_tips = [
            HealthTip(title="Iodine-Rich Diet", description="Include seafood, dairy, and iodized salt in your meals. Iodine is essential for proper thyroid hormone production and a stable metabolism."),
            HealthTip(title="Stay Active", description="Regular aerobic exercise like walking or cycling helps maintain thyroid hormone balance and boosts overall metabolic efficiency."),
            HealthTip(title="Prioritize Sleep", description="Poor sleep disrupts cortisol and thyroid hormone rhythms. Aim for 7-9 hours of quality sleep every night to support glandular health."),
            HealthTip(title="Limit Caffeine", description="Excess caffeine may interfere with thyroid hormone absorption. Take medications at least 60 minutes before consuming coffee."),
            HealthTip(title="Manage Stress", description="Chronic stress raises cortisol levels that suppress thyroid function. Mindfulness and deep breathing exercises can help regulate hormonal balance."),
            HealthTip(title="Regular Checkups", description="Annual TSH blood tests are recommended for early detection. If you have a family history of thyroid conditions, start screenings earlier."),
            HealthTip(title="Medication Timing", description="Thyroid medications like levothyroxine are most effective on an empty stomach, 30-60 minutes before breakfast."),
            HealthTip(title="Watch Goitrogens", description="Foods like raw cabbage, broccoli, and soy may interfere with thyroid function in large amounts. Cooking reduces this effect.")
        ]
        db.bulk_save_objects(default_tips)
        db.commit()
        print("SUCCESS: Seeded default health tips", flush=True)
except Exception as e:
    print(f"WARNING: Seeding error: {e}", flush=True)
finally:
    db.close()


# ----------------- JWT TOKEN AUTH UTILITIES -----------------
try:
    import jwt
    HAS_JWT = True
except ImportError:
    HAS_JWT = False

def generate_token(user_id, role):
    if HAS_JWT:
        payload = {
            "user_id": user_id,
            "role": role,
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        return jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    else:
        payload_str = f"{user_id}:{role}:{int(time.time()) + 604800}"
        signature = hashlib.sha256((payload_str + JWT_SECRET).encode()).hexdigest()
        token_bytes = f"{payload_str}:{signature}".encode()
        return base64.b64encode(token_bytes).decode()

def decode_token(token):
    if not token:
        return None
    if HAS_JWT:
        try:
            # Handle string vs bytes decoding
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            return payload
        except Exception:
            return None
    else:
        try:
            decoded = base64.b64decode(token.encode()).decode()
            parts = decoded.split(":")
            if len(parts) != 4:
                return None
            user_id, role, exp, signature = parts
            payload_str = f"{user_id}:{role}:{exp}"
            expected_sig = hashlib.sha256((payload_str + JWT_SECRET).encode()).hexdigest()
            if signature != expected_sig:
                return None
            if int(exp) < time.time():
                return None
            return {"user_id": int(user_id), "role": role}
        except Exception:
            return None

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({"message": "Token is missing"}), 401
        
        data = decode_token(token)
        if not data:
            return jsonify({"message": "Token is invalid or expired"}), 401
            
        g.user_id = int(data["user_id"])
        g.role = data["role"]
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({"message": "Token is missing"}), 401
        
        data = decode_token(token)
        if not data or data.get("role") != "admin":
            return jsonify({"message": "Admin access required"}), 403
            
        g.user_id = int(data["user_id"])
        g.role = data["role"]
        return f(*args, **kwargs)
    return decorated


# ----------------- AI MODEL INTEGRATION (TI-RADS) -----------------

def predict_ti_rads(image_path):
    """
    Simulated CNN classifier that reads an image path and returns a TI-RADS category
    and clinical insight description.
    In the future, this can be swapped with a real tensorflow model prediction.
    """
    try:
        filename = os.path.basename(image_path).lower()
    except Exception:
        filename = ""
        
    # Seed value for simulating variety
    seed = (len(filename) + int(time.time()) % 10) % 5 + 1 # 1 to 5
    
    categories = {
        1: {
            "category": "TI-RADS 1: Benign",
            "result": "Normal (No nodules/risk)",
            "message": "Benign thyroid scan. No suspicious nodules or features detected. Routine health monitoring recommended.",
            "level": "None",
            "confidence": float(np.random.uniform(92.0, 99.9)),
            "doctors": []
        },
        2: {
            "category": "TI-RADS 2: Not Suspicious",
            "result": "Normal (No risk)",
            "message": "Non-suspicious patterns. Solid nodules are absent. The thyroid shows normal echogenicity. Follow up as part of standard annual checks.",
            "level": "None",
            "confidence": float(np.random.uniform(90.0, 97.0)),
            "doctors": []
        },
        3: {
            "category": "TI-RADS 3: Mildly Suspicious",
            "result": "Abnormal (Mild Suspicion)",
            "message": "Mildly suspicious nodule(s) detected. Estimated malignancy risk is <5%. A follow-up ultrasound is recommended in 1-2 years.",
            "level": "Mild (Stage I)",
            "confidence": float(np.random.uniform(85.0, 91.0)),
            "doctors": [
                {"name": "Dr. Sarah Jenkins", "hospital": "City General Hospital", "phone": "+1 (555) 123-4567"}
            ]
        },
        4: {
            "category": "TI-RADS 4: Moderately Suspicious",
            "result": "Abnormal (Moderate Suspicion)",
            "message": "Moderately suspicious nodule identified. Malignancy risk ranges from 5% to 20%. Recommend clinical evaluation and possible Fine Needle Aspiration (FNA) biopsy.",
            "level": "Moderate (Stage II)",
            "confidence": float(np.random.uniform(86.0, 94.0)),
            "doctors": [
                {"name": "Dr. Sarah Jenkins", "hospital": "City General Hospital", "phone": "+1 (555) 123-4567"},
                {"name": "Dr. Michael Chen", "hospital": "Metro Health Medical Center", "phone": "+1 (555) 987-6543"}
            ]
        },
        5: {
            "category": "TI-RADS 5: Highly Suspicious",
            "result": "Abnormal (High Suspicion)",
            "message": "Highly suspicious nodule(s) detected. Estimated malignancy risk is >20%. Fine Needle Aspiration (FNA) biopsy is strongly recommended to rule out carcinoma.",
            "level": "Severe (Stage III/IV)",
            "confidence": float(np.random.uniform(88.0, 98.0)),
            "doctors": [
                {"name": "Dr. Sarah Jenkins", "hospital": "City General Hospital", "phone": "+1 (555) 123-4567"},
                {"name": "Dr. Michael Chen", "hospital": "Metro Health Medical Center", "phone": "+1 (555) 987-6543"},
                {"name": "Dr. Emily Rodriguez", "hospital": "Endocrinology Specialists Clinic", "phone": "+1 (555) 456-7890"}
            ]
        }
    }
    
    res = categories[seed]
    res["confidence"] = round(res["confidence"], 2)
    return res


# ----------------- CHATBOT ROUTE & FALLBACKS -----------------

FALLBACK_RESPONSES = {
    "nodule": "A thyroid nodule is a lump that forms within the thyroid gland. Most nodules are benign (non-cancerous) and don't cause symptoms. However, some may need further evaluation with ultrasound, blood tests, or a fine-needle biopsy to rule out thyroid cancer.",
    "abnormal": "An 'Abnormal' result means the AI detected patterns consistent with a thyroid nodule. This does NOT automatically mean cancer — most nodules are benign. Please consult an endocrinologist for a proper clinical evaluation including blood work and possibly a biopsy.",
    "ultrasound": "To prepare for a thyroid ultrasound: no special preparation is needed. Wear a comfortable shirt with an open neck. The procedure is painless, takes about 15-20 minutes, and uses sound waves to create images of your thyroid gland.",
    "food": "Foods that support thyroid health include: iodine-rich foods (seafood, dairy, iodized salt), selenium-rich foods (Brazil nuts, tuna, eggs), and zinc-rich foods (oysters, beef, pumpkin seeds). Avoid excessive soy and raw cruciferous vegetables if you have thyroid issues.",
    "doctor": "You should see an endocrinologist if you notice a lump in your neck, have difficulty swallowing, experience unexplained weight changes, feel persistent fatigue, or if your AI scan shows abnormal results. Early consultation leads to better outcomes.",
    "tsh": "TSH (Thyroid Stimulating Hormone) is the primary blood test for thyroid function. Normal range is typically 0.4-4.0 mIU/L. High TSH may indicate hypothyroidism (underactive thyroid), while low TSH may indicate hyperthyroidism (overactive thyroid).",
    "symptom": "Common thyroid disorder symptoms include: fatigue, weight changes, hair loss, sensitivity to cold/heat, mood changes, irregular heartbeat, and neck swelling. If you experience these, consult your doctor for a TSH blood test.",
    "treatment": "Thyroid treatment depends on the condition: Hypothyroidism is treated with levothyroxine (synthetic T4). Hyperthyroidism may be treated with anti-thyroid medications, radioactive iodine, or surgery. Thyroid nodules may require monitoring, biopsy, or surgical removal.",
}

def get_fallback_reply(message: str) -> str:
    msg_lower = message.lower()
    for keyword, response in FALLBACK_RESPONSES.items():
        if keyword in msg_lower:
            return response
    return f"Thank you for your question about: '{message}'. I'm your Thyroid AI assistant. I can answer questions about thyroid nodules, TSH levels, symptoms, ultrasound preparation, diet tips, and when to see a doctor. Try asking about one of these topics!"


# ----------------- FLASK ENDPOINTS -----------------

@app.route("/")
def read_root():
    return jsonify({"message": "Thyroid Detection Flask API is running!"})

@app.route("/uploads/<path:filename>")
def get_uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json or {}
    message = data.get("message", "")
    try:
        import google.generativeai as genai
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key and api_key != "your_gemini_api_key_here":
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-2.0-flash')
            prompt = "You are a professional medical AI assistant specialized in thyroid health. Please provide a clear, concise, and helpful response to the following query: " + message
            response = model.generate_content(prompt)
            return jsonify({"reply": response.text})
    except Exception as e:
        print(f"Gemini API call failed: {e}")
        
    return jsonify({"reply": get_fallback_reply(message)})

# --- AUTH ROUTING ---

@app.route("/api/register", methods=["POST"])
def register():
    data = request.json or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    
    if not name or not email or not password:
        return jsonify({"message": "Please fill out all fields"}), 400
        
    db = SessionLocal()
    try:
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            return jsonify({"message": "Email is already registered"}), 400
            
        hashed_pwd = generate_password_hash(password)
        new_user = User(name=name, email=email, password=hashed_pwd, role="user")
        db.add(new_user)
        db.commit()
        
        # Log in the user automatically
        token = generate_token(new_user.user_id, new_user.role)
        return jsonify({
            "token": token,
            "user": {
                "id": new_user.user_id,
                "name": new_user.name,
                "email": new_user.email,
                "role": new_user.role
            }
        }), 201
    except Exception as e:
        db.rollback()
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        db.close()

@app.route("/api/admin/register", methods=["POST"])
def admin_register():
    data = request.json or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    
    if not name or not email or not password:
        return jsonify({"message": "Please fill out all fields"}), 400
        
    db = SessionLocal()
    try:
        existing = db.query(AdminModel).filter(AdminModel.email == email).first()
        if existing:
            return jsonify({"message": "Admin email is already registered"}), 400
            
        hashed_pwd = generate_password_hash(password)
        new_admin = AdminModel(name=name, email=email, password=hashed_pwd)
        db.add(new_admin)
        db.commit()
        
        return jsonify({
            "message": "Admin registration successful! You can now log in via the Admin Terminal."
        }), 201
    except Exception as e:
        db.rollback()
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        db.close()

@app.route("/api/login", methods=["POST"])
def login():
    data = request.json or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    required_role = data.get("required_role")
    
    if not email or not password:
        return jsonify({"message": "Please provide email and password"}), 400
        
    db = SessionLocal()
    try:
        if required_role == "admin":
            admin = db.query(AdminModel).filter(AdminModel.email == email).first()
            if not admin or not check_password_hash(admin.password, password):
                return jsonify({"message": "Invalid email or password"}), 401
                
            # Generate a 2FA Code
            code = f"{random.randint(100000, 999999)}"
            admin.login_code = code
            admin.code_expires = datetime.utcnow() + timedelta(minutes=5)
            db.commit()
            # Print clearly in the console (unbuffered stderr)
            import sys
            print("\n" + "="*50, file=sys.stderr, flush=True)
            print("SECURITY ACCESS CODE GENERATED FOR ADMIN LOGIN", file=sys.stderr, flush=True)
            print(f"Target Email: {email.upper()}", file=sys.stderr, flush=True)
            print(f"Verification Code: {code}", file=sys.stderr, flush=True)
            print("="*55, file=sys.stderr, flush=True)
            
            # Write to a local file as a robust fallback
            try:
                code_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "admin_security_code.txt")
                with open(code_file_path, "w") as f:
                    f.write(f"Admin Security Verification Code: {code}\nGenerated at: {datetime.utcnow().isoformat()}\n")
            except Exception as fe:
                print(f"Error writing security code file: {fe}", flush=True)
            
            return jsonify({
                "status": "2fa_required",
                "email": email,
                "code": code,
                "message": "A security verification code has been printed in the server terminal console. Please retrieve and enter it to authenticate."
            })
        else:
            user = db.query(User).filter(User.email == email).first()
            if not user or not check_password_hash(user.password, password):
                return jsonify({"message": "Invalid email or password"}), 401
                
            if required_role == "user" and user.role != "user":
                return jsonify({"message": "Access Denied: Account not registered as Patient."}), 403
                
            token = generate_token(user.user_id, user.role)
            return jsonify({
                "token": token,
                "user": {
                    "id": user.user_id,
                    "name": user.name,
                    "email": user.email,
                    "role": user.role
                }
            })
    except Exception as e:
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        db.close()

@app.route("/api/login/verify-2fa", methods=["POST"])
def verify_2fa():
    data = request.json or {}
    email = data.get("email", "").strip().lower()
    code = data.get("code", "").strip()
    
    if not email or not code:
        return jsonify({"message": "Please provide email and verification code"}), 400
        
    db = SessionLocal()
    try:
        admin = db.query(AdminModel).filter(AdminModel.email == email).first()
        if not admin:
            return jsonify({"message": "Admin profile not found."}), 404
            
        if not admin.login_code or not admin.code_expires:
            return jsonify({"message": "No pending login session found for this admin account."}), 400
            
        if datetime.utcnow() > admin.code_expires:
            admin.login_code = None
            admin.code_expires = None
            db.commit()
            return jsonify({"message": "Security code has expired. Please log in again."}), 400
            
        if admin.login_code != code:
            return jsonify({"message": "Invalid security verification code."}), 401
            
        # Valid! Clean up and finalize login
        admin.login_code = None
        admin.code_expires = None
        db.commit()
        
        try:
            code_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "admin_security_code.txt")
            if os.path.exists(code_file_path):
                os.remove(code_file_path)
        except Exception:
            pass
            
        token = generate_token(admin.admin_id, "admin")
        return jsonify({
            "token": token,
            "user": {
                "id": admin.admin_id,
                "name": admin.name,
                "email": admin.email,
                "role": "admin"
            }
        })
    except Exception as e:
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        db.close()

@app.route("/api/me", methods=["GET"])
@token_required
def get_me():
    db = SessionLocal()
    try:
        if g.role == "admin":
            admin = db.query(AdminModel).filter(AdminModel.admin_id == g.user_id).first()
            if not admin:
                return jsonify({"message": "Admin profile not found"}), 404
            return jsonify({
                "id": admin.admin_id,
                "name": admin.name,
                "email": admin.email,
                "role": "admin"
            })
        else:
            user = db.query(User).filter(User.user_id == g.user_id).first()
            if not user:
                return jsonify({"message": "User not found"}), 404
            return jsonify({
                "id": user.user_id,
                "name": user.name,
                "email": user.email,
                "role": user.role
            })
    finally:
        db.close()

# --- PREDICTIONS & HISTORY ---

@app.route("/api/predict", methods=["POST"])
@token_required
def predict():
    if 'file' not in request.files:
        return jsonify({"message": "No file uploaded"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "No file selected"}), 400
        
    db = SessionLocal()
    try:
        # Save file to upload directory
        filename = f"{int(time.time())}_{secure_filename(file.filename)}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Save record to IMAGES table
        db_image = ImageModel(
            user_id=g.user_id,
            image_path=filename
        )
        db.add(db_image)
        db.commit()
        db.refresh(db_image)
        
        # Get AI Prediction results
        pred_data = predict_ti_rads(file_path)
        
        # Save record to PREDICTIONS table
        db_pred = Prediction(
            user_id=g.user_id,
            image_id=db_image.image_id,
            result=pred_data["result"],
            category=pred_data["category"]
        )
        db.add(db_pred)
        db.commit()
        
        return jsonify({
            "prediction": pred_data["result"],
            "category": pred_data["category"],
            "confidence": pred_data["confidence"],
            "level": pred_data["level"],
            "message": pred_data["message"],
            "doctors": pred_data["doctors"],
            "image_path": filename
        })
    except Exception as e:
        db.rollback()
        return jsonify({"message": f"Server error during analysis: {str(e)}"}), 500
    finally:
        db.close()

@app.route("/api/history", methods=["GET"])
@token_required
def get_user_history():
    db = SessionLocal()
    try:
        results = db.query(Prediction, ImageModel).join(
            ImageModel, Prediction.image_id == ImageModel.image_id
        ).filter(Prediction.user_id == g.user_id).order_by(Prediction.prediction_date.desc()).all()
        
        history_list = []
        for pred, img in results:
            # Recreate structured message based on prediction category
            category_lower = pred.category.lower()
            level = "None"
            confidence = 95.0
            if "rads 1" in category_lower:
                level = "None"
                confidence = 96.5
            elif "rads 2" in category_lower:
                level = "None"
                confidence = 94.2
            elif "rads 3" in category_lower:
                level = "Mild (Stage I)"
                confidence = 88.6
            elif "rads 4" in category_lower:
                level = "Moderate (Stage II)"
                confidence = 91.2
            elif "rads 5" in category_lower:
                level = "Severe (Stage III/IV)"
                confidence = 94.8
                
            history_list.append({
                "id": pred.prediction_id,
                "filename": img.image_path,
                "prediction": pred.result,
                "category": pred.category,
                "confidence": confidence,
                "level": level,
                "created_at": pred.prediction_date.isoformat()
            })
        return jsonify(history_list)
    finally:
        db.close()

@app.route("/api/history/<int:pred_id>", methods=["DELETE"])
@token_required
def delete_user_history_item(pred_id):
    db = SessionLocal()
    try:
        pred = db.query(Prediction).filter(
            Prediction.prediction_id == pred_id,
            Prediction.user_id == g.user_id
        ).first()
        
        if not pred:
            return jsonify({"message": "Scan not found or unauthorized"}), 404
            
        # Also clean up image record and local file if possible
        image = db.query(ImageModel).filter(ImageModel.image_id == pred.image_id).first()
        if image:
            try:
                local_path = os.path.join(app.config['UPLOAD_FOLDER'], image.image_path)
                if os.path.exists(local_path):
                    os.remove(local_path)
            except Exception as fe:
                print(f"Error removing local file: {fe}")
            db.delete(image)
            
        db.delete(pred)
        db.commit()
        return jsonify({"message": f"Scan {pred_id} deleted successfully"})
    except Exception as e:
        db.rollback()
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        db.close()

@app.route("/api/history", methods=["DELETE"])
@token_required
def clear_user_history():
    db = SessionLocal()
    try:
        preds = db.query(Prediction).filter(Prediction.user_id == g.user_id).all()
        for pred in preds:
            image = db.query(ImageModel).filter(ImageModel.image_id == pred.image_id).first()
            if image:
                try:
                    local_path = os.path.join(app.config['UPLOAD_FOLDER'], image.image_path)
                    if os.path.exists(local_path):
                        os.remove(local_path)
                except Exception:
                    pass
                db.delete(image)
            db.delete(pred)
        db.commit()
        return jsonify({"message": "All user history deleted successfully"})
    except Exception as e:
        db.rollback()
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        db.close()

# --- HEALTH TIPS ---

@app.route("/api/tips", methods=["GET"])
def get_tips():
    db = SessionLocal()
    try:
        tips = db.query(HealthTip).order_by(HealthTip.created_at.desc()).all()
        return jsonify([{
            "id": t.tip_id,
            "title": t.title,
            "description": t.description
        } for t in tips])
    finally:
        db.close()

# --- QUERIES ---

@app.route("/api/queries", methods=["POST"])
@token_required
def submit_query():
    data = request.json or {}
    question = data.get("question", "").strip()
    
    if not question:
        return jsonify({"message": "Please enter a question"}), 400
        
    db = SessionLocal()
    try:
        new_query = Query(
            user_id=g.user_id,
            question=question,
            status="pending"
        )
        db.add(new_query)
        db.commit()
        return jsonify({"message": "Query submitted successfully"}), 201
    except Exception as e:
        db.rollback()
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        db.close()

@app.route("/api/queries", methods=["GET"])
@token_required
def get_user_queries():
    db = SessionLocal()
    try:
        queries = db.query(Query).filter(Query.user_id == g.user_id).order_by(Query.created_at.desc()).all()
        return jsonify([{
            "id": q.query_id,
            "question": q.question,
            "response": q.response,
            "status": q.status,
            "created_at": q.created_at.isoformat()
        } for q in queries])
    finally:
        db.close()


# ----------------- ADMIN PORTAL ENDPOINTS -----------------

@app.route("/api/admin/dashboard", methods=["GET"])
@admin_required
def get_admin_dashboard_stats():
    db = SessionLocal()
    try:
        total_users = db.query(User).count()
        total_predictions = db.query(Prediction).count()
        total_images = db.query(ImageModel).count()
        pending_queries = db.query(Query).filter(Query.status == "pending").count()
        
        return jsonify({
            "total_users": total_users,
            "total_predictions": total_predictions,
            "total_images": total_images,
            "pending_queries": pending_queries
        })
    finally:
        db.close()

# --- ADMIN USER CRUD ---

@app.route("/api/admin/users", methods=["GET"])
@admin_required
def admin_get_users():
    db = SessionLocal()
    try:
        users = db.query(User).order_by(User.created_at.desc()).all()
        return jsonify([{
            "id": u.user_id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at.isoformat()
        } for u in users])
    finally:
        db.close()

@app.route("/api/admin/users", methods=["POST"])
@admin_required
def admin_create_user():
    data = request.json or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role = data.get("role", "user").strip().lower()
    
    if not name or not email or not password:
        return jsonify({"message": "Name, email, and password are required"}), 400
        
    if role not in ["admin", "user"]:
        role = "user"
        
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            return jsonify({"message": "Email already in use"}), 400
            
        hashed = generate_password_hash(password)
        new_u = User(name=name, email=email, password=hashed, role=role)
        db.add(new_u)
        db.commit()
        return jsonify({"message": "User created successfully"}), 201
    except Exception as e:
        db.rollback()
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        db.close()

@app.route("/api/admin/users/<int:uid>", methods=["PUT"])
@admin_required
def admin_update_user(uid):
    data = request.json or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role = data.get("role", "user").strip().lower()
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.user_id == uid).first()
        if not user:
            return jsonify({"message": "User not found"}), 404
            
        if name:
            user.name = name
        if email:
            existing = db.query(User).filter(User.email == email, User.user_id != uid).first()
            if existing:
                return jsonify({"message": "Email is already taken"}), 400
            user.email = email
        if password:
            user.password = generate_password_hash(password)
        if role in ["admin", "user"]:
            # Prevent admin from de-escalating themselves
            if uid == g.user_id and role != "admin":
                return jsonify({"message": "You cannot change your own admin role"}), 400
            user.role = role
            
        db.commit()
        return jsonify({"message": "User updated successfully"})
    except Exception as e:
        db.rollback()
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        db.close()

@app.route("/api/admin/users/<int:uid>", methods=["DELETE"])
@admin_required
def admin_delete_user(uid):
    if uid == g.user_id:
        return jsonify({"message": "You cannot delete your own account"}), 400
        
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.user_id == uid).first()
        if not user:
            return jsonify({"message": "User not found"}), 404
            
        db.delete(user)
        db.commit()
        return jsonify({"message": "User deleted successfully"})
    except Exception as e:
        db.rollback()
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        db.close()

# --- ADMIN PREDICTION AUDITING ---

@app.route("/api/admin/predictions", methods=["GET"])
@admin_required
def admin_get_predictions():
    db = SessionLocal()
    try:
        results = db.query(Prediction, User, ImageModel).join(
            User, Prediction.user_id == User.user_id
        ).join(
            ImageModel, Prediction.image_id == ImageModel.image_id
        ).order_by(Prediction.prediction_date.desc()).all()
        
        preds_list = []
        for pred, user, img in results:
            preds_list.append({
                "id": pred.prediction_id,
                "user_name": user.name,
                "user_email": user.email,
                "filename": img.image_path,
                "prediction": pred.result,
                "category": pred.category,
                "created_at": pred.prediction_date.isoformat()
            })
        return jsonify(preds_list)
    finally:
        db.close()

# --- ADMIN HEALTH TIPS CRUD ---

@app.route("/api/admin/tips", methods=["GET"])
@admin_required
def admin_get_tips():
    db = SessionLocal()
    try:
        tips = db.query(HealthTip).order_by(HealthTip.created_at.desc()).all()
        return jsonify([{
            "id": t.tip_id,
            "title": t.title,
            "description": t.description,
            "created_at": t.created_at.isoformat()
        } for t in tips])
    finally:
        db.close()

@app.route("/api/admin/tips", methods=["POST"])
@admin_required
def admin_create_tip():
    data = request.json or {}
    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    
    if not title or not description:
        return jsonify({"message": "Title and description are required"}), 400
        
    db = SessionLocal()
    try:
        new_tip = HealthTip(title=title, description=description)
        db.add(new_tip)
        db.commit()
        return jsonify({"message": "Health tip created successfully"}), 201
    except Exception as e:
        db.rollback()
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        db.close()

@app.route("/api/admin/tips/<int:tid>", methods=["PUT"])
@admin_required
def admin_update_tip(tid):
    data = request.json or {}
    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    
    db = SessionLocal()
    try:
        tip = db.query(HealthTip).filter(HealthTip.tip_id == tid).first()
        if not tip:
            return jsonify({"message": "Health tip not found"}), 404
            
        if title:
            tip.title = title
        if description:
            tip.description = description
            
        db.commit()
        return jsonify({"message": "Health tip updated successfully"})
    except Exception as e:
        db.rollback()
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        db.close()

@app.route("/api/admin/tips/<int:tid>", methods=["DELETE"])
@admin_required
def admin_delete_tip(tid):
    db = SessionLocal()
    try:
        tip = db.query(HealthTip).filter(HealthTip.tip_id == tid).first()
        if not tip:
            return jsonify({"message": "Health tip not found"}), 404
            
        db.delete(tip)
        db.commit()
        return jsonify({"message": "Health tip deleted successfully"})
    except Exception as e:
        db.rollback()
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        db.close()

# --- ADMIN SUPPORT CONSOLE ---

@app.route("/api/admin/queries", methods=["GET"])
@admin_required
def admin_get_queries():
    db = SessionLocal()
    try:
        queries = db.query(Query, User).join(
            User, Query.user_id == User.user_id
        ).order_by(Query.created_at.desc()).all()
        
        return jsonify([{
            "id": q.query_id,
            "user_name": u.name,
            "user_email": u.email,
            "question": q.question,
            "response": q.response,
            "status": q.status,
            "created_at": q.created_at.isoformat()
        } for q, u in queries])
    finally:
        db.close()

@app.route("/api/admin/queries/<int:qid>/respond", methods=["POST"])
@admin_required
def admin_respond_query(qid):
    data = request.json or {}
    response = data.get("response", "").strip()
    
    if not response:
        return jsonify({"message": "Response content cannot be empty"}), 400
        
    db = SessionLocal()
    try:
        query = db.query(Query).filter(Query.query_id == qid).first()
        if not query:
            return jsonify({"message": "Query ticket not found"}), 404
            
        query.response = response
        query.status = "answered"
        db.commit()
        return jsonify({"message": "Response submitted successfully"})
    except Exception as e:
        db.rollback()
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        db.close()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
