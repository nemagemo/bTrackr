import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, Category } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const suggestCategory = async (description: string): Promise<string | null> => {
  if (!apiKey) return null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Categorize this transaction description into strictly one of these categories (return only the category name in Polish): Jedzenie, Transport, Mieszkanie, Rozrywka, Zdrowie, Zakupy, Kredyt, Inwestycje, Przelew własny, Inne. Description: "${description}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              enum: [
                'Jedzenie',
                'Transport',
                'Mieszkanie',
                'Rozrywka',
                'Zdrowie',
                'Zakupy',
                'Kredyt',
                'Inwestycje',
                'Przelew własny',
                'Inne'
              ]
            }
          }
        }
      }
    });

    const json = JSON.parse(response.text || '{}');
    return json.category || Category.OTHER;
  } catch (error) {
    console.error("Gemini categorization failed:", error);
    return null;
  }
};

export const getFinancialAdvice = async (transactions: Transaction[]): Promise<string> => {
  if (!apiKey || transactions.length === 0) return "Dodaj więcej transakcji, aby otrzymać analizę AI.";

  // Simplify data to save tokens
  const summary = transactions.slice(0, 50).map(t => `${t.date}: ${t.description} (${t.amount} PLN, ${t.type}, ${t.category})`).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Jako doradca finansowy, przeanalizuj te ostatnie transakcje i podaj jedną, krótką, konkretną i minimalistyczną poradę po polsku (maksymalnie 2 zdania). Skup się na oszczędzaniu lub trendach. Dane:\n${summary}`,
      config: {
         thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    return response.text || "Nie udało się wygenerować porady.";
  } catch (error) {
    console.error("Gemini advice failed:", error);
    return "Błąd podczas generowania porady AI.";
  }
};