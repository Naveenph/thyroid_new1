import tensorflow as tf
from tensorflow.keras.applications import EfficientNetB3
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import os

def train_vision_model():
    print("Setting up Thyroid Ultrasound Image Classifier...")
    
    # Define directories (User needs to put their dataset here)
    base_dir = 'data/ultrasound_images'
    if not os.path.exists(base_dir):
        print(f"Directory {base_dir} not found. Creating it...")
        os.makedirs(os.path.join(base_dir, 'normal'))
        os.makedirs(os.path.join(base_dir, 'abnormal'))
        print("Please place your images into 'data/ultrasound_images/normal' and 'data/ultrasound_images/abnormal'.")
        return
    
    # Check if images exist
    num_normal = len(os.listdir(os.path.join(base_dir, 'normal'))) if os.path.exists(os.path.join(base_dir, 'normal')) else 0
    num_abnormal = len(os.listdir(os.path.join(base_dir, 'abnormal'))) if os.path.exists(os.path.join(base_dir, 'abnormal')) else 0
    
    if num_normal == 0 and num_abnormal == 0:
         print("No images found. Please add images to the folders before training.")
         return
         
    # Setup Data Generators with Augmentation
    datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        horizontal_flip=True,
        validation_split=0.2
    )
    
    print("Loading Images...")
    train_generator = datagen.flow_from_directory(
        base_dir,
        target_size=(224, 224),
        batch_size=32,
        class_mode='binary',
        subset='training'
    )
    
    val_generator = datagen.flow_from_directory(
        base_dir,
        target_size=(224, 224),
        batch_size=32,
        class_mode='binary',
        subset='validation'
    )
    
    print("Building Model using EfficientNetB3...")
    base_model = EfficientNetB3(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
    
    # Freeze the base model layers
    for layer in base_model.layers:
        layer.trainable = False
        
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(512, activation='relu')(x)
    x = Dropout(0.5)(x)
    predictions = Dense(1, activation='sigmoid')(x)
    
    model = Model(inputs=base_model.input, outputs=predictions)
    
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.001), 
                  loss='binary_crossentropy', 
                  metrics=['accuracy'])
                  
    print("Starting Training...")
    history = model.fit(
        train_generator,
        validation_data=val_generator,
        epochs=10
    )
    
    print("Saving trained model...")
    os.makedirs('models', exist_ok=True)
    model.save('models/thyroid_cv_model.h5')
    print("Model successfully saved to 'models/thyroid_cv_model.h5'")

if __name__ == "__main__":
    train_vision_model()
