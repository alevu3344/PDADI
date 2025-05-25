import React, { useState } from "react";
import type {
  TransactionData,
  PredictionResponse,
} from "../../services/predictionService";
import { getFraudPrediction } from "../../services/predictionService";
import "./module.css"; 

const initialVFeatures: { [key: string]: string } = {};
for (let i = 1; i <= 28; i++) {
  initialVFeatures[`V${i}`] = "0.0"; // Default a stringa "0.0" per l'input
}

const TransactionForm: React.FC = () => {
  const [time, setTime] = useState<string>("0.0");
  const [amount, setAmount] = useState<string>("0.0");
  const [vFeatures, setVFeatures] = useState<{ [key: string]: string }>(
    initialVFeatures
  );
  const [predictionResult, setPredictionResult] =
    useState<PredictionResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleVFeatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVFeatures((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setPredictionResult(null);
    setFormError(null);

    // Validazione e conversione
    const parsedTime = parseFloat(time);
    const parsedAmount = parseFloat(amount);
    const parsedVFeatures: { [key: string]: number } = {};

    if (isNaN(parsedTime) || isNaN(parsedAmount)) {
      setFormError("Time e Amount devono essere numeri validi.");
      setIsLoading(false);
      return;
    }

    let vFeaturesAreValid = true;
    for (let i = 1; i <= 28; i++) {
      const val = parseFloat(vFeatures[`V${i}`]);
      if (isNaN(val)) {
        vFeaturesAreValid = false;
        break;
      }
      parsedVFeatures[`V${i}`] = val;
    }

    if (!vFeaturesAreValid) {
      setFormError("Tutte le feature V1-V28 devono essere numeri validi.");
      setIsLoading(false);
      return;
    }

    const transactionData: TransactionData = {
      Time: parsedTime,
      Amount: parsedAmount,
      ...parsedVFeatures,
    } as TransactionData; // Type assertion dopo aver validato e popolato

    const result = await getFraudPrediction(transactionData);
    setPredictionResult(result);
    setIsLoading(false);
  };

  // Genera i campi di input per V1-V28
  const vFeatureInputs = [];
  for (let i = 1; i <= 28; i++) {
    const featureName = `V${i}`;
    vFeatureInputs.push(
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
    );
  }

  return (
    <div className="transaction-form-container">
      <h2>Inserisci i Dati della Transazione</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group main-feature-group">
          <label htmlFor="Time">Time (secondi):</label>
          <input
            type="number"
            step="any"
            id="Time"
            name="Time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>
        <div className="form-group main-feature-group">
          <label htmlFor="Amount">Amount:</label>
          <input
            type="number"
            step="any"
            id="Amount"
            name="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <p className="v-features-label">
          Features V1-V28 (valori numerici, output di PCA):
        </p>
        <div className="v-features-grid">{vFeatureInputs}</div>

        {formError && <p className="error-message">{formError}</p>}

        <button type="submit" disabled={isLoading}>
          {isLoading ? "Predizione in corso..." : "Ottieni Predizione"}
        </button>
      </form>

      {predictionResult && (
        <div
          className={`prediction-result ${
            predictionResult.error
              ? "error"
              : predictionResult.isFraud
              ? "fraud"
              : "legitimate"
          }`}
        >
          <h3>Risultato Predizione:</h3>
          {predictionResult.error ? (
            <p>Errore: {predictionResult.error}</p>
          ) : (
            <>
              <p>
                Esito: <strong>{predictionResult.prediction}</strong>
              </p>
              <p>
                Probabilità di Frode:{" "}
                <strong>
                  {(predictionResult.fraudProbability * 100).toFixed(2)}%
                </strong>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionForm;
