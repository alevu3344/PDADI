# backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
import os

app = Flask(__name__)
CORS(app) # Allow all origins for development

MODEL_DIR = os.path.join(os.getcwd(), 'saved_model')
models_config = {} # To store loaded models and their expected features

# --- Model Configuration ---
# Define your models and the files they depend on.
# This helps in loading and providing parameters.
MODEL_DEFINITIONS = {
    "logistic_regression_rfecv": {
        "model_file": "logistic_regression_rfecv_model.joblib",
        "features_file": "lr_rfecv_selected_features.joblib", # List of feature names this model expects
        "display_name": "Logistic Regression (RFECV Features)"
    },
    "random_forest_sfs": {
        "model_file": "random_forest_sfs_model.joblib",
        "features_file": "rf_sfs_selected_features.joblib",
        "display_name": "Random Forest (SelectFromModel Features)"
    },
    "xgboost_sfs": {
        "model_file": "xgboost_sfs_model.joblib",
        "features_file": "xgb_sfs_selected_features.joblib",
        "display_name": "XGBoost (SelectFromModel Features)"
    },
    "random_forest_tuned_pipeline": { # Assuming this is your optimized pipeline model
        "model_file": "random_forest_tuned_ALL_FEATURES_pipeline_model.joblib",
        # This file should contain the list of features the *pipeline* was trained on
        # (i.e., the input to the pipeline, which are the selected features BEFORE SMOTE)
        "features_file": "rf_tuned_ALL_FEATURES_pipeline_expected_columns.joblib",
        "display_name": "Random Forest Tuned (Pipeline, Selected Feat.)"
    }
    # Add other models here following the same pattern
}

# --- Load Scalers (common to all models if they use scaled_amount/scaled_time) ---
try:
    scaler_amount = joblib.load(os.path.join(MODEL_DIR, 'scaler_amount.joblib'))
    scaler_time = joblib.load(os.path.join(MODEL_DIR, 'scaler_time.joblib'))
    print("Scalers (Amount, Time) caricati con successo.")
except Exception as e:
    print(f"Errore nel caricamento degli scaler: {e}")
    scaler_amount = None
    scaler_time = None

# --- Load Models and their Feature Lists ---
for model_id, config in MODEL_DEFINITIONS.items():
    try:
        model_obj = joblib.load(os.path.join(MODEL_DIR, config["model_file"]))
        expected_features = joblib.load(os.path.join(MODEL_DIR, config["features_file"]))
        
        # Store the loaded model and its specific configuration
        models_config[model_id] = {
            "model": model_obj,
            "expected_features": expected_features, # List of feature names for this model
            "display_name": config["display_name"]
        }
        print(f"Modello '{model_id}' ({config['display_name']}) caricato. Feature attese: {expected_features}")
    except FileNotFoundError:
        print(f"ATTENZIONE: File non trovati per il modello '{model_id}'. Questo modello non sarà disponibile.")
    except Exception as e:
        print(f"Errore generico durante il caricamento del modello '{model_id}': {e}")

if not models_config:
    print("ERRORE CRITICO: Nessun modello è stato caricato. L'API di predizione non funzionerà.")
if not scaler_amount or not scaler_time:
    print("ERRORE CRITICO: Scaler non caricati. Il preprocessing di Amount/Time fallirà.")

# --- API Endpoints ---

@app.route('/models/list', methods=['GET'])
def list_models():
    """Restituisce la lista dei modelli disponibili."""
    available_model_list = [
        {"id": model_id, "name": config["display_name"]}
        for model_id, config in models_config.items()
    ]
    return jsonify(available_model_list)

@app.route('/models/params', methods=['GET'])
def get_model_params():
    """Restituisce le feature attese per un modello specifico."""
    model_id = request.args.get('model_id')
    if not model_id or model_id not in models_config:
        return jsonify({"error": "ID modello non valido o mancante."}), 400
    
    config = models_config[model_id]
    # Le feature da richiedere all'utente sono quelle in 'expected_features'
    # più 'Time' e 'Amount' se 'scaled_time' o 'scaled_amount' sono presenti.
    
    user_input_features = []
    model_expects_scaled_time = 'scaled_time' in config["expected_features"]
    model_expects_scaled_amount = 'scaled_amount' in config["expected_features"]

    if model_expects_scaled_time:
        user_input_features.append({"name": "Time", "type": "number", "label": "Time (secondi)"})
    if model_expects_scaled_amount:
        user_input_features.append({"name": "Amount", "type": "number", "label": "Amount"})

    for feature_name in config["expected_features"]:
        if feature_name not in ['scaled_time', 'scaled_amount']:
            user_input_features.append({"name": feature_name, "type": "number", "label": feature_name})
            
    return jsonify({
        "model_id": model_id,
        "display_name": config["display_name"],
        "required_features": user_input_features # Lista di oggetti {name, type, label}
    })

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Nessun dato JSON ricevuto.'}), 400

    model_id = data.get('model_choice')
    if not model_id or model_id not in models_config:
        return jsonify({'error': f"Modello '{model_id}' non valido o non disponibile."}), 400

    current_model_config = models_config[model_id]
    model_obj = current_model_config["model"]
    model_expected_features = current_model_config["expected_features"]

    if not scaler_amount or not scaler_time: # Verifica aggiuntiva
        return jsonify({'error': 'Scaler non disponibili sul server.'}), 500
        
    print(f"Dati ricevuti per il modello '{model_id}': {data}")

    input_features_processed = {}
    
    # Gestisci Time e Amount per lo scaling, se necessario dal modello
    model_expects_scaled_time = 'scaled_time' in model_expected_features
    model_expects_scaled_amount = 'scaled_amount' in model_expected_features

    if model_expects_scaled_time:
        if 'Time' not in data: return jsonify({'error': "Feature 'Time' mancante."}), 400
        try:
            raw_time = float(data['Time'])
            input_features_processed['scaled_time'] = scaler_time.transform(np.array([[raw_time]]))[0, 0]
        except (TypeError, ValueError): return jsonify({'error': "Valore non valido per Time."}), 400
    
    if model_expects_scaled_amount:
        if 'Amount' not in data: return jsonify({'error': "Feature 'Amount' mancante."}), 400
        try:
            raw_amount = float(data['Amount'])
            input_features_processed['scaled_amount'] = scaler_amount.transform(np.array([[raw_amount]]))[0, 0]
        except (TypeError, ValueError): return jsonify({'error': "Valore non valido per Amount."}), 400

    # Prendi le altre feature V (o altre feature dirette) richieste dal modello
    for feature_name in model_expected_features:
        if feature_name not in ['scaled_time', 'scaled_amount']: # Già gestite
            if feature_name not in data:
                return jsonify({'error': f"Feature richiesta dal modello mancante: '{feature_name}'"}), 400
            try:
                input_features_processed[feature_name] = float(data[feature_name])
            except (TypeError, ValueError):
                 return jsonify({'error': f"Valore non valido per {feature_name}. Deve essere un numero."}), 400
    
    # Costruisci l'array per la predizione nell'ordine corretto
    try:
        ordered_input_data = [input_features_processed[col_name] for col_name in model_expected_features]
    except KeyError as e:
        return jsonify({'error': f"Errore interno: feature processata mancante '{str(e)}' durante la creazione dell'array di input."}), 500
        
    features_for_prediction = np.array([ordered_input_data])
    
    prediction_proba = model_obj.predict_proba(features_for_prediction)
    prediction_val = model_obj.predict(features_for_prediction)

    is_fraud = bool(prediction_val[0])
    fraud_probability = float(prediction_proba[0][1])

    print(f"Predizione con '{model_id}': {'Frode' if is_fraud else 'Legittima'}, Probabilità Frode: {fraud_probability:.4f}")

    return jsonify({
        'prediction': 'Frode' if is_fraud else 'Legittima',
        'isFraud': is_fraud,
        'fraudProbability': fraud_probability,
        'modelUsed': current_model_config["display_name"]
    })

if __name__ == '__main__':
    if not models_config:
        print("AVVISO: Nessun modello è stato caricato. L'API potrebbe non funzionare come previsto.")
    app.run(debug=os.environ.get('FLASK_DEBUG', 'True').lower() == 'true', port=5001)