// frontend/src/services/predictionService.ts
import axios from 'axios';

// Interfaccia per i dati grezzi del form (come l'avevamo definita per il form dinamico)
export interface TransactionFormInputData {
  Time: number; // O string se lo stato del form li tiene come stringhe inizialmente
  Amount: number; // O string
  [key: string]: number | string; // Permette alle feature V di essere stringhe (dall'input) o numeri
}

// Interfaccia per il payload inviato all'API
export interface ApiPayload {
  model_choice: string;
  Time: number;
  Amount: number;
  [key: string]: string | number; 
}

export interface PredictionResponse {
  prediction: string;
  isFraud: boolean;
  fraudProbability: number;
  modelUsed?: string;
  error?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
}

export interface ModelParam {
  name: string;
  type: string;
  label: string;
}

export interface ModelParamsResponse {
  model_id: string;
  display_name: string;
  required_features: ModelParam[];
  error?: string;
}

export const getAvailableModels = async (): Promise<ModelInfo[]> => {
  try {
    const response = await axios.get<ModelInfo[]>('/api/models/list');
    return response.data;
  } catch (error) {
    console.error('Error fetching model list:', error);
    return [];
  }
};

export const getModelParams = async (modelId: string): Promise<ModelParamsResponse> => {
  try {
    const response = await axios.get<ModelParamsResponse>(`/api/models/params?model_id=${modelId}`);
    return response.data;
  } catch (error: any) {
    // ... (gestione errori) ...
    if (axios.isAxiosError(error) && error.response) {
      return error.response.data as ModelParamsResponse;
    }
    return { model_id: modelId, display_name: '', required_features: [], error: 'Failed to fetch model params' };
  }
};

export const getFraudPrediction = async (
  formData: TransactionFormInputData, // I dati del form (potrebbero avere valori stringa per i numeri)
  modelChoice: string,
  requiredFeaturesForModel: ModelParam[]
): Promise<PredictionResponse> => {
  
  // Costruisci l'oggetto payload con i tipi corretti
  const payloadToSend: ApiPayload = { // Usa l'interfaccia ApiPayload qui
      model_choice: modelChoice,
      Time: Number(formData.Time) || 0, // Assicura sia un numero
      Amount: Number(formData.Amount) || 0, // Assicura sia un numero
  };

  // Aggiungi dinamicamente le feature V richieste come numeri
  for (const feature of requiredFeaturesForModel) {
      if (feature.name !== 'Time' && feature.name !== 'Amount') { // Time e Amount già gestiti
          payloadToSend[feature.name] = Number(formData[feature.name]) || 0; // Assicura sia un numero
      }
  }

  try {
    const response = await axios.post<PredictionResponse>('/api/predict', payloadToSend);
    return response.data;
  } catch (error: any) {
    // ... (gestione errori come prima) ...
    if (axios.isAxiosError(error) && error.response) {
      return error.response.data as PredictionResponse;
    }
    return { prediction: 'Errore', isFraud: false, fraudProbability: 0, error: 'Errore API' };
  }
};