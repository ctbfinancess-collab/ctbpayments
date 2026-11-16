// Status de cada serviço exibido no site.
//
//   'available' → funciona hoje para clientes reais (aparece como Disponível)
//   'soon'      → existe no app só em ambiente de testes (aparece como Em breve)
//   'hidden'    → não aparece no site
//
// Regra: só marque 'available' quando o serviço estiver de fato operando
// em produção para clientes reais. Nunca publique taxas, rendimentos,
// limites ou condições comerciais aqui.

export type ServiceStatus = 'available' | 'soon' | 'hidden';

export interface Service {
  id: string;
  status: ServiceStatus;
  icon: 'pix' | 'card' | 'bill' | 'chart' | 'credit' | 'building';
}

export const services: Service[] = [
  { id: 'pix', status: 'soon', icon: 'pix' },
  { id: 'cards', status: 'soon', icon: 'card' },
  { id: 'payments', status: 'soon', icon: 'bill' },
  { id: 'investments', status: 'soon', icon: 'chart' },
  { id: 'credit', status: 'soon', icon: 'credit' },
  { id: 'business', status: 'soon', icon: 'building' },
];
