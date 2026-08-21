import { ApiError } from '../api';
import { isDemoMode, isSandboxMode } from '../config';
import { getServiceProductConfig } from '../data/businessServicesData';

// Fluxo genérico para os produtos que estavam com badge "Em breve" (Benefícios,
// Antecipação Salarial, Capital de Giro, Antecipação de Recebíveis, POS Tapon,
// Microcrédito Digital). Não há endpoint SANDBOX real para esses produtos ainda —
// em demoMode a solicitação é simulada localmente; em sandboxMode fica indisponível,
// mesmo padrão usado em pixService/consignedService.
const unavailable = () => { throw new ApiError('Produto ainda não disponível no momento.', { code: 'SANDBOX_OPERATION_UNAVAILABLE' }); };
const notFound = () => { throw new ApiError('Produto não encontrado.', { code: 'PRODUCT_NOT_FOUND' }); };

export function createBusinessServicesService({ demoMode = false, sandboxMode = false } = {}) {
  const getProduct = async (id) => {
    const product = getServiceProductConfig(id);
    if (!product) return notFound();
    return product;
  };
  const submitRequest = async (id, payload) => {
    const product = getServiceProductConfig(id);
    if (!product) return notFound();
    if (demoMode) {
      return {
        productId: id,
        protocol: `DEMO-${id.toUpperCase()}-${Date.now()}`,
        status: product.statusLabel,
        submittedAt: new Date().toISOString(),
        ...payload,
      };
    }
    if (sandboxMode) return unavailable();
    throw new ApiError('Backend not configured', { code: 'BACKEND_NOT_CONFIGURED' });
  };
  return { getProduct, submitRequest };
}

const service = createBusinessServicesService({ demoMode: isDemoMode, sandboxMode: isSandboxMode });
export const getServiceProduct = service.getProduct;
export const submitServiceProductRequest = service.submitRequest;
