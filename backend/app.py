from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd

app = Flask(__name__)
CORS(app)  # Abilita CORS per tutte le route, utile per lo sviluppo locale

# Carica il modello e gli scaler all'avvio dell'applicazione
try:
    model = joblib.load('./saved_model/fraud_detection_model.joblib')
    scaler_amount = joblib.load('./saved_model/scaler_amount.joblib')
    scaler_time = joblib.load('./saved_model/scaler_time.joblib')
    expected_columns = joblib.load('./saved_model/expected_model_columns.joblib')
    print("Modello e scaler caricati con successo.")
except FileNotFoundError as e:
    print(f"Errore nel caricamento del modello o degli scaler: {e}")
    model = None
    scaler_amount = None
    scaler_time = None
    expected_columns = [] # Inizializza per evitare errori successivi se il caricamento fallisce
except Exception as e:
    print(f"Errore generico durante il caricamento: {e}")
    model = None
    scaler_amount = None
    scaler_time = None
    expected_columns = []


@app.route('/predict', methods=['POST'])
def predict():
    if not model or not scaler_amount or not scaler_time or not expected_columns:
        return jsonify({'error': 'Modello o scaler non caricati correttamente sul server.'}), 500

    try:
        data = request.get_json()
        print(f"Dati ricevuti: {data}")

        # Estrai le feature V1-V28, Time, Amount
        # Assicurati che i nomi delle chiavi in 'data' corrispondano a quelli inviati dal frontend
        # e che siano quelli attesi dal modello.

        # Costruzione del DataFrame per il preprocessing
        # I nomi delle chiavi devono corrispondere a quelli inviati dal frontend
        # Per le feature V1-V28, il frontend dovrebbe inviarle direttamente
        # Per Time e Amount, il frontend invia i valori grezzi

        # Valori di default o gestione errori per chiavi mancanti
        input_features = {}
        # Le features V1-V28 dovrebbero essere fornite come float
        for i in range(1, 29):
            key = f'V{i}'
            input_features[key] = float(data.get(key, 0.0)) # Usa 0.0 come default se mancante

        raw_time = float(data.get('Time', 0.0))
        raw_amount = float(data.get('Amount', 0.0))

        # Preprocessing: Applica gli scaler a Time e Amount
        scaled_time_val = scaler_time.transform(np.array([[raw_time]]))[0, 0]
        scaled_amount_val = scaler_amount.transform(np.array([[raw_amount]]))[0, 0]

        input_features['scaled_time'] = scaled_time_val
        input_features['scaled_amount'] = scaled_amount_val

        # Crea un DataFrame con una singola riga nell'ordine corretto atteso dal modello
        # Questo è cruciale! L'ordine deve essere identico a quello usato per l'addestramento.

        # Verifica se tutte le colonne attese sono presenti in input_features
        # (scaled_time e scaled_amount sono state aggiunte, Time e Amount grezze non servono più)

        # Crea il DataFrame con le colonne nell'ordine corretto
        # Questo assume che `expected_columns` contenga nomi come 'V1', ..., 'V28', 'scaled_amount', 'scaled_time'
        # nell'ordine corretto.

        ordered_input_data = []
        for col in expected_columns:
            if col not in input_features:
                # Questo non dovrebbe accadere se expected_columns è corretto e
                # input_features è stato popolato con tutti i V1-V28, scaled_amount, scaled_time
                print(f"Attenzione: Colonna attesa '{col}' non trovata nei dati di input preparati. Uso 0.0.")
                ordered_input_data.append(0.0) 
            else:
                ordered_input_data.append(input_features[col])

        features_for_prediction = np.array([ordered_input_data])

        # Predizione
        prediction_proba = model.predict_proba(features_for_prediction) # Probabilità per [classe_0, classe_1]
        prediction = model.predict(features_for_prediction) # Classe predetta (0 o 1)

        is_fraud = bool(prediction[0]) # Converte in booleano Python
        fraud_probability = float(prediction_proba[0][1]) # Probabilità della classe frode (1)

        print(f"Predizione: {'Frode' if is_fraud else 'Legittima'}, Probabilità Frode: {fraud_probability:.4f}")

        return jsonify({
            'prediction': 'Frode' if is_fraud else 'Legittima',
            'isFraud': is_fraud,
            'fraudProbability': fraud_probability
        })

    except TypeError as e:
        print(f"Errore di tipo nei dati ricevuti: {e}. Dati: {data}")
        return jsonify({'error': f"Errore di tipo nei dati: assicuratevi che V1-V28, Time, Amount siano numeri. Dettagli: {str(e)}"}), 400
    except ValueError as e:
        print(f"Errore di valore nei dati ricevuti: {e}. Dati: {data}")
        return jsonify({'error': f"Errore di valore nei dati: controllare i formati. Dettagli: {str(e)}"}), 400
    except Exception as e:
        print(f"Errore durante la predizione: {e}")
        return jsonify({'error': f'Errore interno del server durante la predizione: {str(e)}'}), 500

if __name__ == '__main__':
    # Non usare host='0.0.0.0' se non intendi esporre l'app pubblicamente
    # Per sviluppo locale, '127.0.0.1' (default) è più sicuro.
    app.run(debug=True, port=5001) # Usa una porta diversa da quella di Vite (es. 5173)