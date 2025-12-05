
import { CURRENCY_FORMATTER } from '../../constants';

export interface ChartProps {
  data?: any[];
  height?: number;
  colors?: string[];
  className?: string;
  isPrivateMode?: boolean;
  showSurplusLine?: boolean;
  showSavingsRateLine?: boolean;
}

export const formatValue = (val: number, isPrivate?: boolean): string => {
   if (isPrivate) return '***';
   return CURRENCY_FORMATTER.format(val);
};
