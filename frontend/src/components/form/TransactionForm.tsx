// frontend/src/components/TransactionForm.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  getFraudPrediction,
  getAvailableModels,
  getModelParams,
} from "../../services/predictionService";
import type {
  TransactionFormInputData,
  PredictionResponse,
  ModelInfo,
  ModelParam,
} from "../../services/predictionService";
import "./module.css";

const TransactionForm: React.FC = () => {
  const [availableModelsList, setAvailableModelsList] = useState<ModelInfo[]>(
    []
  );
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [currentModelParams, setCurrentModelParams] = useState<ModelParam[]>(
    []
  );

  const [formData, setFormData] = useState<TransactionFormInputData>({
    Time: 0,
    Amount: 0,
  });

  const [predictionResult, setPredictionResult] =
    useState<PredictionResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Carica la lista dei modelli al mount
  useEffect(() => {
    const fetchModels = async () => {
      const models = await getAvailableModels();
      setAvailableModelsList(models);
      if (models.length > 0) {
        // Seleziona il primo modello della lista come default (o un default specifico)
        // Potresti voler selezionare 'random_forest_tuned' se è sempre presente
        const defaultModel =
          models.find((m) => m.id === "random_forest_tuned_pipeline") ||
          models[0];
        setSelectedModelId(defaultModel.id);
      }
    };
    fetchModels();
  }, []);

  // Carica i parametri del modello quando selectedModelId cambia
  const fetchParamsForModel = useCallback(async (modelId: string) => {
    if (!modelId) {
      setCurrentModelParams([]);
      setFormData({ Time: 0, Amount: 0 }); // Resetta il form data
      return;
    }
    setIsLoading(true);
    const paramsResponse = await getModelParams(modelId);
    if (paramsResponse.error) {
      setFormError(
        `Errore nel caricare i parametri per ${modelId}: ${paramsResponse.error}`
      );
      setCurrentModelParams([]);
      setFormData({ Time: 0, Amount: 0 });
    } else {
      setCurrentModelParams(paramsResponse.required_features);
      // Inizializza formData con le feature richieste dal nuovo modello
      const initialFormState: TransactionFormInputData = { Time: 0, Amount: 0 };
      paramsResponse.required_features.forEach((param) => {
        if (param.name !== "Time" && param.name !== "Amount") {
          initialFormState[param.name] = 0.0; // Default a 0.0 per le feature V
        }
      });
      setFormData(initialFormState);
      setFormError(null); // Pulisce errori precedenti
    }
    setIsLoading(false);
  }, []); // useCallback per stabilità

  useEffect(() => {
    if (selectedModelId) {
      fetchParamsForModel(selectedModelId);
    }
  }, [selectedModelId, fetchParamsForModel]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    // Per i campi numerici, è meglio conservare come stringa nello stato per permettere input parziali
    // La conversione a numero avverrà al momento del submit
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModelId(e.target.value);
    setPredictionResult(null); // Resetta la predizione quando si cambia modello
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedModelId || currentModelParams.length === 0) {
      setFormError(
        "Seleziona un modello e attendi il caricamento dei suoi parametri."
      );
      return;
    }
    setIsLoading(true);
    setPredictionResult(null);
    setFormError(null);

    const numericFormData: TransactionFormInputData = { Time: 0, Amount: 0 };
    let isValid = true;

    for (const param of currentModelParams) {
      const valueStr = String(formData[param.name] ?? "0.0"); // Usa '0.0' se undefined
      const numValue = parseFloat(valueStr);
      if (isNaN(numValue)) {
        isValid = false;
        setFormError(
          `Valore non valido per ${
            param.label || param.name
          }. Deve essere un numero.`
        );
        break;
      }
      numericFormData[param.name] = numValue;
    }

    if (!isValid) {
      setIsLoading(false);
      return;
    }

    const result = await getFraudPrediction(
      numericFormData,
      selectedModelId,
      currentModelParams
    );
    setPredictionResult(result);
    setIsLoading(false);
  };

  const renderFormFields = () => {
    if (isLoading && currentModelParams.length === 0)
      return <p>Caricamento parametri modello...</p>;

    return currentModelParams.map((param) => (
      <div
        className={`form-group ${
          param.name.startsWith("V") ? "v-feature-group" : "main-feature-group"
        }`}
        key={param.name}
      >
        <label htmlFor={param.name}>{param.label || param.name}:</label>
        <input
          type="number" // Assumiamo tutti numerici per semplicità
          step="any"
          id={param.name}
          name={param.name}
          value={formData[param.name] ?? "0.0"} // Controlla per undefined e imposta default
          onChange={handleInputChange}
          required
        />
      </div>
    ));
  };

  return (
    <div className="transaction-form-container">
      <h2>Seleziona Modello e Inserisci Dati Transazione</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="modelChoice">Scegli il Modello:</label>
          <select
            id="modelChoice"
            value={selectedModelId}
            onChange={handleModelChange}
            className="model-select"
            disabled={isLoading}
          >
            <option value="">-- Seleziona un modello --</option>
            {availableModelsList.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        {currentModelParams.length > 0 && (
          <div className="dynamic-fields-grid">
            {" "}
            {/* Usa una grid per i campi dinamici */}
            {renderFormFields()}
          </div>
        )}

        {formError && <p className="error-message">{formError}</p>}
        <button
          type="submit"
          disabled={
            isLoading || !selectedModelId || currentModelParams.length === 0
          }
        >
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
          <h3>
            Risultato Predizione (Modello:
            {predictionResult.modelUsed ||
              availableModelsList.find((m) => m.id === selectedModelId)?.name ||
              selectedModelId}{" "}
            {/* Fallback all'ID se il nome non si trova */})
          </h3>
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
