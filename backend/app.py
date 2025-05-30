# backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
import os
import json
import glob # For finding files

app = Flask(__name__)
CORS(app)

MODEL_DIR = os.path.join(os.getcwd(), 'saved_model')
models_config = {} # To store loaded models, features, display names, and thresholds

# --- Load Scalers (assuming these are common and their names are fixed) ---
try:
    scaler_amount = joblib.load(os.path.join(MODEL_DIR, 'scaler_amount.joblib'))
    scaler_time = joblib.load(os.path.join(MODEL_DIR, 'scaler_time.joblib'))
    print("Scaler (Amount, Time) caricati con successo.")
except Exception as e:
    print(f"Errore FATALE nel caricamento degli scaler: {e}. Il preprocessing di Amount/Time fallirà.")
    scaler_amount = None
    scaler_time = None
    # Potresti voler terminare l'app se gli scaler sono critici e non caricati.
    # exit(1) 

# --- Dynamically Load Models ---
print("\n--- Caricamento Dinamico dei Modelli ---")
if not os.path.isdir(MODEL_DIR):
    print(f"ERRORE: La directory dei modelli '{MODEL_DIR}' non esiste.")
else:
    for model_file_path in glob.glob(os.path.join(MODEL_DIR, '*_model.joblib')):
        try:
            model_filename = os.path.basename(model_file_path)
            model_base_name = model_filename.replace('_model.joblib', '') 
            
            features_filename = f"{model_base_name}_columns.joblib"
            features_file_path = os.path.join(MODEL_DIR, features_filename)
            
            # UPDATED: Consistent threshold filename based on your convention
            threshold_filename = f"{model_base_name}_thresh.json" 
            threshold_file_path = os.path.join(MODEL_DIR, threshold_filename)

            if not os.path.exists(features_file_path):
                print(f"ATTENZIONE: File delle feature '{features_filename}' non trovato per '{model_filename}'. Salto questo modello.")
                continue

            model_obj = joblib.load(model_file_path)
            expected_features = joblib.load(features_file_path)
            
            optimal_threshold = 0.5 # Default threshold
            display_name = model_base_name.replace('_', ' ').title() 

            if os.path.exists(threshold_file_path):
                try:
                    with open(threshold_file_path, 'r') as f:
                        threshold_data = json.load(f)
                    # UPDATED: Simplified logic to expect a dictionary with a "thresh" key
                    if isinstance(threshold_data, dict) and "thresh" in threshold_data:
                        optimal_threshold = float(threshold_data["thresh"])
                        print(f"Soglia ottimale caricata per '{model_base_name}' da {threshold_filename}: {optimal_threshold:.4f}")
                    else:
                        print(f"ATTENZIONE: Chiave 'thresh' non trovata o formato JSON non corretto in '{threshold_filename}' per '{model_base_name}'. Uso soglia default {optimal_threshold:.4f}.")
                except Exception as e_thresh:
                    print(f"Errore nel caricamento/parsing del file soglia '{threshold_filename}' per '{model_base_name}': {e_thresh}. Uso soglia default {optimal_threshold:.4f}.")
            else:
                print(f"INFO: File soglia '{threshold_filename}' non trovato per '{model_base_name}'. Uso default 0.5.")
            
            models_config[model_base_name] = {
                "model": model_obj,
                "expected_features": expected_features,
                "display_name": display_name,
                "optimal_threshold": optimal_threshold
            }
            print(f"Modello '{model_base_name}' ({display_name}) caricato. Feature attese: {len(expected_features)}. Soglia: {optimal_threshold:.4f}")

        except Exception as e:
            print(f"Errore generico durante il caricamento del modello da '{model_file_path}': {e}")

if not models_config:
    print("ERRORE CRITICO: Nessun modello è stato caricato dinamicamente. L'API di predizione non funzionerà.")
if not scaler_amount or not scaler_time:
    print("ERRORE CRITICO: Scaler non caricati. Il preprocessing di Amount/Time fallirà.")

# --- API Endpoints (rest of your API endpoints remain the same) ---

@app.route('/models/list', methods=['GET'])
def list_models():
    available_model_list = [
        {"id": model_id, "name": config["display_name"]}
        for model_id, config in models_config.items()
    ]
    return jsonify(available_model_list)

@app.route('/models/params', methods=['GET'])
def get_model_params():
    model_id = request.args.get('model_id')
    if not model_id or model_id not in models_config:
        return jsonify({"error": "ID modello non valido o mancante."}), 400
    
    config = models_config[model_id]
    user_input_features = []
    
    model_expects_scaled_time = 'scaled_time' in config["expected_features"]
    model_expects_scaled_amount = 'scaled_amount' in config["expected_features"]
    
    temp_expected_features_for_user = set(config["expected_features"])
    
    if model_expects_scaled_time:
        user_input_features.append({"name": "Time", "type": "number", "label": "Time (secondi tra transazioni)"})
        temp_expected_features_for_user.discard('scaled_time')
    if model_expects_scaled_amount:
        user_input_features.append({"name": "Amount", "type": "number", "label": "Importo Transazione"})
        temp_expected_features_for_user.discard('scaled_amount')

    for feature_name in sorted(list(temp_expected_features_for_user)):
        user_input_features.append({"name": feature_name, "type": "number", "label": feature_name})
            
    return jsonify({
        "model_id": model_id,
        "display_name": config["display_name"],
        "required_features": user_input_features
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
    model_expected_original_features = current_model_config["expected_features"]

    if not scaler_amount or not scaler_time:
        return jsonify({'error': 'Scaler non disponibili sul server.'}), 500
        
    print(f"Dati ricevuti per predizione con '{model_id}': {data}")

    input_df_dict = {}
    for feature_name in model_expected_original_features:
        user_provided_value = None
        original_feature_name_for_user = feature_name

        if feature_name == 'scaled_time':
            if 'Time' not in data: return jsonify({'error': "Feature 'Time' mancante."}), 400
            original_feature_name_for_user = 'Time'
            try:
                raw_val = float(data[original_feature_name_for_user])
                user_provided_value = scaler_time.transform(np.array([[raw_val]]))[0,0]
            except (TypeError, ValueError): return jsonify({'error': f"Valore non valido per {original_feature_name_for_user}."}), 400
        elif feature_name == 'scaled_amount':
            if 'Amount' not in data: return jsonify({'error': "Feature 'Amount' mancante."}), 400
            original_feature_name_for_user = 'Amount'
            try:
                raw_val = float(data[original_feature_name_for_user])
                user_provided_value = scaler_amount.transform(np.array([[raw_val]]))[0,0]
            except (TypeError, ValueError): return jsonify({'error': f"Valore non valido per {original_feature_name_for_user}."}), 400
        else: 
            if feature_name not in data:
                return jsonify({'error': f"Feature richiesta '{feature_name}' mancante."}), 400
            try:
                user_provided_value = float(data[feature_name])
            except (TypeError, ValueError):
                 return jsonify({'error': f"Valore non valido per {feature_name}. Deve essere un numero."}), 400
        
        input_df_dict[feature_name] = [user_provided_value]

    try:
        features_for_prediction_df = pd.DataFrame(input_df_dict)[model_expected_original_features]
    except KeyError as e:
         return jsonify({'error': f"Errore interno: feature mancante '{str(e)}' durante la preparazione dell'input."}), 500
    
    prediction_proba = model_obj.predict_proba(features_for_prediction_df)
    fraud_probability = float(prediction_proba[0][1])

    optimal_threshold = current_model_config.get("optimal_threshold", 0.5)
    is_fraud = bool(fraud_probability >= optimal_threshold)
    
    print(f"Predizione con '{model_id}' (Soglia={optimal_threshold:.4f}): {'Frode' if is_fraud else 'Legittima'}, Probabilità Frode: {fraud_probability:.4f}")

    return jsonify({
        'prediction': 'Frode' if is_fraud else 'Legittima',
        'isFraud': is_fraud,
        'fraudProbability': fraud_probability,
        'modelUsed': current_model_config["display_name"],
        'thresholdUsed': optimal_threshold
    })

if __name__ == '__main__':
    if not models_config:
        print("AVVISO: Nessun modello è stato caricato. L'API potrebbe non funzionare come previsto.")
    app.run(debug=True, port=5001)