import { ApiError } from '../api';
import { isDemoMode, isSandboxMode } from '../config';
import { MOCK_EXCHANGE_RATES, MOCK_GLOBAL_ACCOUNTS, MOCK_GLOBAL_MOVEMENTS } from '../data/globalAccountMockData';
import { parseCurrency } from '../utils/pixValidation';

const notConfigured = () => { throw new ApiError('Backend not configured', { code: 'BACKEND_NOT_CONFIGURED' }); };
// Contas globais e câmbio ainda não têm endpoint original — SANDBOX usa o
// mesmo dataset estrutural do DEMO por enquanto (ver nota em
// globalAccountMockData.js). Nenhuma cotação aqui é real.
const structural = () => isDemoMode || isSandboxMode;

export const getGlobalAccount = async (currency) => structural() ? MOCK_GLOBAL_ACCOUNTS[currency] : notConfigured();
export const getExchangeRate = async (currency) => structural() ? MOCK_EXCHANGE_RATES[currency] : notConfigured();
export const getGlobalMovements = async (currency) => structural() ? (MOCK_GLOBAL_MOVEMENTS[currency] || []) : notConfigured();

// Conversão estrutural BRL <-> moeda estrangeira, sempre usando a taxa de
// venda (BRL -> moeda) ou compra (moeda -> BRL) do mock acima.
export const convertCurrency = async ({ amount, from, to }) => {
  if (!structural()) return notConfigured();
  const foreign = from === 'BRL' ? to : from;
  const rate = MOCK_EXCHANGE_RATES[foreign];
  if (!rate) throw new ApiError('Moeda não suportada.', { code: 'UNSUPPORTED_CURRENCY' });
  const value = parseCurrency(amount);
  const result = from === 'BRL' ? value / rate.sell : value * rate.buy;
  return { amount: value, from, rate: from === 'BRL' ? rate.sell : rate.buy, result: result.toFixed(2).replace('.', ','), to };
};
