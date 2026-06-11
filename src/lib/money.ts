export const MASKED_AMOUNT = '*****';

export const DEFAULT_MONEY_FORMAT: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

export const formatMoney = (
  currency: string,
  amount: number,
  hidden: boolean,
  options: Intl.NumberFormatOptions = DEFAULT_MONEY_FORMAT,
) => (hidden ? MASKED_AMOUNT : `${currency}${amount.toLocaleString('en-US', options)}`);
