
import { db } from '../db';
import { SubcategoryItem, CategoryItem } from '../types';

/**
 * Sprawdza, czy podana podkategoria istnieje w danej kategorii.
 * Jeśli nie (lub jeśli nie podano ID), zwraca ID domyślnej podkategorii "Inne",
 * tworząc ją w razie potrzeby.
 */
export const ensureSubcategory = async (categoryId: string, providedSubId?: string): Promise<string> => {
  if (providedSubId) return providedSubId;
  
  const category = await db.categories.get(categoryId);
  if (!category) return ''; 
  
  const inneSub = category.subcategories.find(s => s.name.toLowerCase() === 'inne');
  if (inneSub) return inneSub.id;

  const newSubId = crypto.randomUUID();
  const newSub: SubcategoryItem = { id: newSubId, name: 'Inne' };
  
  // Aktualizacja kategorii w bazie
  const updatedCategory = { ...category, subcategories: [...category.subcategories, newSub] };
  await db.categories.put(updatedCategory);
  
  return newSubId;
};
