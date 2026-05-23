import pandas as pd
import numpy as np
import pickle
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.impute import SimpleImputer
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, classification_report

def train_model():
    print("Loading dataset...")
    try:
        df = pd.read_csv('data/thyroid_dataset.csv')
    except FileNotFoundError:
        print("Dataset not found. Please run download_data.py first.")
        return

    print("Preprocessing data...")
    # The 'sick' dataset target variable is 'Class' ('sick' vs 'negative')
    if 'Class' not in df.columns:
        print("Target column 'Class' not found in dataset.")
        return

    # Drop non-informative columns if any (e.g., ID columns, but let's assume standard features for now)
    # OpenML 'sick' dataset has columns like 'TBG', 'T3', etc.
    
    # Separate features and target
    X = df.drop('Class', axis=1)
    y = df['Class']

    # Convert target to binary (0 and 1)
    le = LabelEncoder()
    y = le.fit_transform(y)

    # Identify categorical and numerical columns
    categorical_cols = X.select_dtypes(include=['object', 'category']).columns
    numerical_cols = X.select_dtypes(include=['int64', 'float64']).columns

    # For simplicity in this baseline, we'll dummy encode categorical variables
    # and impute missing values.
    X = pd.get_dummies(X, columns=categorical_cols, drop_first=True)
    
    # Impute missing values with mean for numerical features
    imputer = SimpleImputer(strategy='mean')
    X_imputed = imputer.fit_transform(X)
    
    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(X_imputed, y, test_size=0.2, random_state=42)

    print("Training XGBoost Classifier...")
    model = XGBClassifier(eval_metric='logloss')
    model.fit(X_train, y_train)

    print("Evaluating model...")
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Accuracy: {accuracy:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    print("Saving model and preprocessors...")
    os.makedirs('models', exist_ok=True)
    with open('models/xgboost_model.pkl', 'wb') as f:
        pickle.dump(model, f)
    with open('models/label_encoder.pkl', 'wb') as f:
        pickle.dump(le, f)
    with open('models/imputer.pkl', 'wb') as f:
        pickle.dump(imputer, f)
    # Save the expected feature names for the app
    with open('models/feature_names.pkl', 'wb') as f:
        pickle.dump(list(X.columns), f)
        
    print("Training complete! Model saved to 'models/' directory.")

if __name__ == "__main__":
    train_model()
