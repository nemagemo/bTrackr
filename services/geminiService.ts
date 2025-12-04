
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, CategoryItem } from "../types";

// Safety check for process.env to prevent "process is not defined" crash in browsers
const getApiKey = () => {
  try {
    return process.env.API_KEY || '';
  } catch (e) {
    console.warn("API_KEY not found in environment variables.");
    return '';
  }
};

const apiKey = getApiKey();
// Initialize only if key exists to avoid immediate errors, though calls will fail
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const suggestCategory = async (description: string, categories: CategoryItem[]): Promise<string | null> => {
  if (!ai) return null;

  // Extract names to send to AI
  const expenseCategoryNames = categories
    .filter(c => c.type === 'EXPENSE')
    .map(c => c.name);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Categorize this transaction description into strictly one of these categories: ${expenseCategoryNames.join(', ')}. Return only the category name in Polish. Description: "${description}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
            }
          }
        }
      }
    });

    const json = JSON.parse(response.text || '{}');
    const suggestedName = json.category;

    // Find ID by Name
    const matchedCategory = categories.find(c => c.name.toLowerCase() === suggestedName?.toLowerCase());
    return matchedCategory ? matchedCategory.id : null;
  } catch (error) {
    console.error("Gemini categorization failed:", error);
    return null;
  }
};

export const getFinancialAdvice = async (transactions: Transaction[], categories: CategoryItem[]): Promise<string> => {
  if (!ai || transactions.length === 0) return "Dodaj więcej transakcji, aby otrzymać analizę AI.";

  const summary = transactions.slice(0, 50).map(t => {
    const catName = categories.find(c => c.id === t.categoryId)?.name || 'Nieznana';
    return `${t.date}: ${t.description} (${t.amount} PLN, ${t.type}, ${catName})`;
  }).join('\n');

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
