import pandas as pd
from sklearn.datasets import fetch_openml
import os

def download_thyroid_data():
    print("Fetching thyroid dataset from OpenML...")
    # 'sick' dataset from OpenML is a well-known thyroid disease dataset
    # target variable is 'Class' (sick vs negative)
    try:
        thyroid_data = fetch_openml(name='sick', version=1, as_frame=True, parser='auto')
        df = thyroid_data.frame
        
        # Save to CSV
        os.makedirs('data', exist_ok=True)
        csv_path = os.path.join('data', 'thyroid_dataset.csv')
        df.to_csv(csv_path, index=False)
        print(f"Dataset successfully downloaded and saved to {csv_path}")
        print(f"Dataset shape: {df.shape}")
        print(f"Class distribution:\n{df['Class'].value_counts()}")
        
    except Exception as e:
        print(f"Error downloading dataset: {e}")

if __name__ == "__main__":
    download_thyroid_data()
