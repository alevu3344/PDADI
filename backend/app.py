# backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
import os

app = Flask(__name__)
CORS(app, resources={r"/predict": {"origins": "*"}})

MODEL_DIR = os.path.join(os.getcwd(), 'saved_model')

try:
    model_path = os.path.join(MODEL_DIR, 'fraud_detection_model.joblib')
    scaler_amount_path = os.path.join(MODEL_DIR, 'scaler_amount.joblib')
    scaler_time_path = os.path.join(MODEL_DIR, 'scaler_time.joblib')
    expected_columns_path = os.path.join(MODEL_DIR, 'expected_model_columns.joblib')
    
    model = joblib.load(model_path)
    scaler_amount = joblib.load(scaler_amount_path)
    scaler_time = joblib.load(scaler_time_path)
    expected_columns = joblib.load(expected_columns_path) # Questa ora conterrà le 15 feature
    print(f"Modello e scaler caricati. Feature attese dal modello: {expected_columns}")
except FileNotFoundError as e:
    print(f"Errore nel caricamento del modello o degli scaler: {e}")
    model = None; scaler_amount = None; scaler_time = None; expected_columns = [] 
except Exception as e:
    print(f"Errore generico durante il caricamento: {e}")
    model = None; scaler_amount = None; scaler_time = None; expected_columns = []

@app.route('/predict', methods=['POST'])
def predict():
    if not all([model, scaler_amount, scaler_time, expected_columns]):
        return jsonify({'error': 'Modello o scaler non caricati correttamente sul server.'}), 500

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Nessun dato JSON ricevuto.'}), 400
        
        print(f"Dati ricevuti: {data}")

        input_features_processed = {}

        # Scalare Time e Amount se sono tra le feature attese
        # Il frontend invia 'Time' e 'Amount' grezzi
        if 'scaled_time' in expected_columns:
            try:
                raw_time = float(data['Time'])
                input_features_processed['scaled_time'] = scaler_time.transform(np.array([[raw_time]]))[0, 0]
            except (TypeError, ValueError, KeyError):
                return jsonify({'error': "Valore non valido o mancante per Time."}), 400
        
        if 'scaled_amount' in expected_columns:
            try:
                raw_amount = float(data['Amount'])
                input_features_processed['scaled_amount'] = scaler_amount.transform(np.array([[raw_amount]]))[0, 0]
            except (TypeError, ValueError, KeyError):
                return jsonify({'error': "Valore non valido o mancante per Amount."}), 400

        # Prendi le altre feature V direttamente se sono nelle expected_columns
        # Le feature in `expected_columns` sono tipo 'V14', 'V4', etc.
        for feature_name in expected_columns:
            if feature_name.startswith('V'): # Solo per le V features
                if feature_name not in data:
                    return jsonify({'error': f"Feature V mancante: '{feature_name}'"}), 400
                try:
                    input_features_processed[feature_name] = float(data[feature_name])
                except (TypeError, ValueError):
                     return jsonify({'error': f"Valore non valido per {feature_name}. Deve essere un numero."}), 400
            elif feature_name not in ['scaled_time', 'scaled_amount']:
                # Gestisci altre feature non V e non scalate se ce ne fossero (improbabile qui)
                if feature_name not in data:
                     return jsonify({'error': f"Feature mancante: '{feature_name}'"}), 400
                input_features_processed[feature_name] = data[feature_name]


        # Costruisci l'array per la predizione nell'ordine corretto
        ordered_input_data = []
        for col_name in expected_columns:
            if col_name not in input_features_processed:
                print(f"ERRORE INTERNO: Colonna attesa '{col_name}' non trovata nei dati processati.")
                return jsonify({'error': f"Errore interno: feature mancante '{col_name}'"}), 500
            ordered_input_data.append(input_features_processed[col_name])
            
        features_for_prediction = np.array([ordered_input_data])
        
        prediction_proba = model.predict_proba(features_for_prediction)
        prediction = model.predict(features_for_prediction)

        is_fraud = bool(prediction[0])
        fraud_probability = float(prediction_proba[0][1])

        print(f"Predizione: {'Frode' if is_fraud else 'Legittima'}, Probabilità Frode: {fraud_probability:.4f} usando features: {expected_columns}")

        return jsonify({
            'prediction': 'Frode' if is_fraud else 'Legittima',
            'isFraud': is_fraud,
            'fraudProbability': fraud_probability
        })

    except KeyError as e:
        print(f"Errore: Chiave mancante nei dati JSON: {e}. Dati ricevuti: {data}")
        return jsonify({'error': f"Chiave mancante nei dati JSON: '{str(e)}'. Assicurati che tutte le feature richieste dal modello ({len(expected_columns)}) siano presenti."}), 400
    except Exception as e:
        print(f"Errore durante la predizione: {type(e).__name__} - {e}")
        return jsonify({'error': f'Errore interno del server durante la predizione: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=os.environ.get('FLASK_DEBUG', 'True').lower() == 'true', port=5001)