// frontend/src/services/predictionService.ts
import axios from "axios";

// Interfaccia per i dati grezzi del form (come l'avevamo definita per il form dinamico)
export interface TransactionFormInputData {
  [key: string]: number | string; // Permette alle feature V di essere stringhe (dall'input) o numeri
}

// Interfaccia per il payload inviato all'API
export interface ApiPayload {
  model_choice: string;
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
    const response = await axios.get<ModelInfo[]>("/api/models/list");
    return response.data;
  } catch (error) {
    console.error("Error fetching model list:", error);
    return [];
  }
};

export const getModelParams = async (
  modelId: string
): Promise<ModelParamsResponse> => {
  try {
    const response = await axios.get<ModelParamsResponse>(
      `/api/models/params?model_id=${modelId}`
    );
    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      return error.response.data as ModelParamsResponse;
    }
    return {
      model_id: modelId,
      display_name: "",
      required_features: [],
      error: "Failed to fetch model params",
    };
  }
};

export const getFraudPrediction = async (
  formData: TransactionFormInputData,
  modelChoice: string,
  requiredFeaturesForModel: ModelParam[]
): Promise<PredictionResponse> => {
  const payloadToSend: ApiPayload = {
    model_choice: modelChoice,
  };

  for (const feature of requiredFeaturesForModel) {
    payloadToSend[feature.name] = Number(formData[feature.name]) || 0;
  }

  try {
    const response = await axios.post<PredictionResponse>(
      "/api/predict",
      payloadToSend
    );
    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      return error.response.data as PredictionResponse;
    }
    return {
      prediction: "Errore",
      isFraud: false,
      fraudProbability: 0,
      error: "Errore API",
    };
  }
};
