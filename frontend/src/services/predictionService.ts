import axios from "axios";

// Non è più necessario un API_BASE_URL completo con host e porta.
// Le richieste saranno relative al dominio da cui è servito il frontend.
// Nginx intercetterà quelle che iniziano con /api/

export interface TransactionData {
  Time: number;
  Amount: number;
  V1: number;
  V2: number;
  V3: number;
  V4: number;
  V5: number;
  V6: number;
  V7: number;
  V8: number;
  V9: number;
  V10: number;
  V11: number;
  V12: number;
  V13: number;
  V14: number;
  V15: number;
  V16: number;
  V17: number;
  V18: number;
  V19: number;
  V20: number;
  V21: number;
  V22: number;
  V23: number;
  V24: number;
  V25: number;
  V26: number;
  V27: number;
  V28: number;
}

export interface PredictionResponse {
  prediction: string; // "Frode" o "Legittima"
  isFraud: boolean;
  fraudProbability: number; // Probabilità che sia una frode (0.0 a 1.0)
  error?: string; // Campo opzionale per errori dal backend
}

export const getFraudPrediction = async (
  data: TransactionData
): Promise<PredictionResponse> => {
  try {
    // La richiesta ora usa un percorso relativo che inizia con /api/
    // Nginx intercetterà questo e lo inoltrerà al backend Flask.
    const response = await axios.post<PredictionResponse>("/api/predict", data);
    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Error from backend or Nginx proxy:", error.response.data);
      return error.response.data as PredictionResponse;
    } else {
      console.error("Network or other error making API call:", error);
      return {
        prediction: "Errore",
        isFraud: false,
        fraudProbability: 0,
        error:
          "Errore di comunicazione. Controlla la console del browser e i log di Nginx/Backend.",
      };
    }
  }
};
