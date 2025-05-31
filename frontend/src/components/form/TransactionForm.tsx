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

  useEffect(() => {
    const fetchModels = async () => {
      const models = await getAvailableModels();
      setAvailableModelsList(models);
      if (models.length > 0) {
        const defaultModel = models[0];
        setSelectedModelId(defaultModel.id);
      }
    };
    fetchModels();
  }, []);

  const fetchParamsForModel = useCallback(async (modelId: string) => {
    if (!modelId) {
      setCurrentModelParams([]);
      setFormData({ Time: 0, Amount: 0 });
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

      const initialFormState: TransactionFormInputData = { Time: 0, Amount: 0 };
      paramsResponse.required_features.forEach((param) => {
        if (param.name !== "Time" && param.name !== "Amount") {
          initialFormState[param.name] = 0.0;
        }
      });
      setFormData(initialFormState);
      setFormError(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (selectedModelId) {
      fetchParamsForModel(selectedModelId);
    }
  }, [selectedModelId, fetchParamsForModel]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModelId(e.target.value);
    setPredictionResult(null);
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
      const valueStr = String(formData[param.name] ?? "0.0");
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
          type="number"
          step="any"
          id={param.name}
          name={param.name}
          value={formData[param.name] ?? "0.0"}
          onChange={handleInputChange}
          required
        />
      </div>
    ));
  };

  return (
    <div className="transaction-form-container">
      <h2>Seleziona un modello e inserisci i dati</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="modelChoice">Scegli il modello:</label>
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
          <div className="dynamic-fields-grid"> {renderFormFields()}</div>
        )}

        {formError && <p className="error-message">{formError}</p>}
        <button
          type="submit"
          disabled={
            isLoading || !selectedModelId || currentModelParams.length === 0
          }
        >
          {isLoading ? "Predizione in corso..." : "Ottieni predizione"}
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
            Risultato predizione (Modello:
            {predictionResult.modelUsed ||
              availableModelsList.find((m) => m.id === selectedModelId)?.name ||
              selectedModelId}{" "}
            )
          </h3>
          {predictionResult.error ? (
            <p>Errore: {predictionResult.error}</p>
          ) : (
            <>
              <p>
                Esito: <strong>{predictionResult.prediction}</strong>
              </p>
              <p>
                Probabilità di frode:{" "}
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
