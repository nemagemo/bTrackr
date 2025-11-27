export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum Category {
  FOOD = 'Jedzenie',
  SHOPPING = 'Zakupy',
  TRANSPORT = 'Transport',
  HOUSING = 'Mieszkanie',
  ENTERTAINMENT = 'Rozrywka',
  HEALTH = 'Zdrowie',
  SALARY = 'Wynagrodzenie',
  INVESTMENTS = 'Inwestycje',
  OTHER = 'Inne'
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  type: TransactionType;
  category: Category | string;
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