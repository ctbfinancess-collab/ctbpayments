import { apiClient } from '../api';

// KYC real (Customer Identity, Etapa 1) — fala com /v1/customers/kyc/*,
// diferente do resto de src/services que fala com o login SANDBOX de
// credencial fixa (mesmo espírito de customerAuthClient.js). Sempre
// autenticado (nunca skipAuth aqui) — o backend exige sessão real
// (requireCustomerSession) e nunca aceita um customerId vindo do
// cliente; quem o app é vem sempre do token Bearer já anexado pelo
// apiClient (ver src/api/client.js).
export async function getKycPersonalInfo(client = apiClient) {
  return client('/v1/customers/kyc/personal-info', { method: 'GET' });
}

// `patch` aceita qualquer subconjunto de { birthDate, motherName,
// nationality } — o backend faz o merge com o que já estava salvo
// (ver CustomerKycService.savePersonalInfo), então esta função nunca
// precisa reenviar o que não mudou.
export async function saveKycPersonalInfo(patch, client = apiClient) {
  return client('/v1/customers/kyc/personal-info', { method: 'PUT', body: JSON.stringify(patch) });
}
