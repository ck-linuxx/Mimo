import { useCallback, useState } from 'react';

interface CurrencyInputResult {
  displayValue: string;
  numericValue: number;
  onChange: (text: string) => void;
}

export function useCurrencyInput(initialValue = 0): CurrencyInputResult {
  const format = (value: number): string => {
    if (value === 0) return '';
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const [displayValue, setDisplayValue] = useState<string>(format(initialValue));
  const [numericValue, setNumericValue] = useState<number>(initialValue);

  const onChange = useCallback((text: string) => {
    const digits = text.replace(/\D/g, '');

    if (digits === '') {
      setDisplayValue('');
      setNumericValue(0);
      return;
    }

    const numeric = parseFloat(digits) / 100;
    const formatted = numeric.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    setDisplayValue(formatted);
    setNumericValue(numeric);
  }, []);

  return { displayValue, numericValue, onChange };
}
