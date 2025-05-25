import React, { useState } from "react";
import type {
  TransactionData,
  PredictionResponse,
} from "../../services/predictionService";
import { getFraudPrediction } from "../../services/predictionService";
import "./module.css"; 

// Definisci le feature V selezionate che il form deve mostrare
const selectedVFeaturesNames = [
  'V1', 'V4', 'V7', 'V8', 'V10', 
  'V12', 'V13', 'V14', 'V15', 'V17', 
  'V18', 'V26', 'V27'
]; // 13 V-features

const initialVFeaturesState: { [key: string]: string } = {};
selectedVFeaturesNames.forEach(name => {
  initialVFeaturesState[name] = '0.0'; // Default a stringa "0.0"
});

const TransactionForm: React.FC = () => {
  const [time, setTime] = useState<string>('0.0');
  const [amount, setAmount] = useState<string>('0.0');
  const [vFeatures, setVFeatures] = useState<{ [key: string]: string }>(initialVFeaturesState);
  const [predictionResult, setPredictionResult] = useState<PredictionResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleVFeatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVFeatures(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setPredictionResult(null);
    setFormError(null);

    const parsedTime = parseFloat(time);
    const parsedAmount = parseFloat(amount);
    const parsedVFeatures: { [key: string]: number } = {};

    if (isNaN(parsedTime) || isNaN(parsedAmount)) {
      setFormError('Time e Amount devono essere numeri validi.');
      setIsLoading(false);
      return;
    }

    let vFeaturesAreValid = true;
    for (const featureName of selectedVFeaturesNames) {
      const val = parseFloat(vFeatures[featureName]);
      if (isNaN(val)) {
        vFeaturesAreValid = false;
        break;
      }
      parsedVFeatures[featureName] = val;
    }

    if (!vFeaturesAreValid) {
      setFormError(`Tutte le feature V selezionate (${selectedVFeaturesNames.join(', ')}) devono essere numeri validi.`);
      setIsLoading(false);
      return;
    }
    
    const transactionData: TransactionData = {
      Time: parsedTime,
      Amount: parsedAmount,
      // ...parsedVFeatures dovrebbe espandere correttamente le chiavi corrispondenti
      // all'interfaccia TransactionData
      V1: parsedVFeatures['V1'],
      V4: parsedVFeatures['V4'],
      V7: parsedVFeatures['V7'],
      V8: parsedVFeatures['V8'],
      V10: parsedVFeatures['V10'],
      V12: parsedVFeatures['V12'],
      V13: parsedVFeatures['V13'],
      V14: parsedVFeatures['V14'],
      V15: parsedVFeatures['V15'],
      V17: parsedVFeatures['V17'],
      V18: parsedVFeatures['V18'],
      V26: parsedVFeatures['V26'],
      V27: parsedVFeatures['V27'],
    }; 

    const result = await getFraudPrediction(transactionData);
    setPredictionResult(result);
    setIsLoading(false);
  };
  
  const vFeatureInputs = selectedVFeaturesNames.map(featureName => (
    <div className="form-group v-feature-group" key={featureName}>
      <label htmlFor={featureName}>{featureName}:</label>
      <input
        type="number"
        step="any"
        id={featureName}
        name={featureName}
        value={vFeatures[featureName]}
        onChange={handleVFeatureChange}
        required
      />
    </div>
  ));

  return (
    <div className="transaction-form-container">
      <h2>Inserisci i Dati della Transazione (15 Feature Selezionate)</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group main-feature-group">
          <label htmlFor="Time">Time (secondi):</label>
          <input type="number" step="any" id="Time" name="Time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>
        <div className="form-group main-feature-group">
          <label htmlFor="Amount">Amount:</label>
          <input type="number" step="any" id="Amount" name="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        
        <p className="v-features-label">Feature V selezionate (output di PCA):</p>
        <div className="v-features-grid">
            {vFeatureInputs}
        </div>

        {formError && <p className="error-message">{formError}</p>}
        
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Predizione in corso...' : 'Ottieni Predizione'}
        </button>
      </form>

      {predictionResult && (
         // ... (visualizzazione risultati come prima) ...
        <div className={`prediction-result ${predictionResult.error ? 'error' : (predictionResult.isFraud ? 'fraud' : 'legitimate')}`}>
          <h3>Risultato Predizione:</h3>
          {predictionResult.error ? (
            <p>Errore: {predictionResult.error}</p>
          ) : (
            <>
              <p>Esito: <strong>{predictionResult.prediction}</strong></p>
              <p>Probabilità di Frode: <strong>{(predictionResult.fraudProbability * 100).toFixed(2)}%</strong></p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionForm;