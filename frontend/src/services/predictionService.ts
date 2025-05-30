import axios from "axios";

export interface TransactionFormInputData {
  Time: number;
  Amount: number;
  [key: string]: number | string;
}

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
  thresholdUsed?: number;
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
    Time: Number(formData.Time) || 0,
    Amount: Number(formData.Amount) || 0,
  };

  for (const feature of requiredFeaturesForModel) {
    if (feature.name !== "Time" && feature.name !== "Amount") {
    }
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
