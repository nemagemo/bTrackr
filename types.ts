
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export interface SubcategoryItem {
  id: string;
  name: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  isSystem: boolean; // System categories cannot be deleted (e.g. Salary, Savings logic depend on them)
  subcategories: SubcategoryItem[];
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  type: TransactionType;
  categoryId: string; // References CategoryItem.id
  subcategoryId?: string; // References SubcategoryItem.id
  date: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  color: string;
}
