import { ApiError } from '../errors/ApiError.js';
import type { CompanyRepository } from '../repositories/CompanyRepository.js';
import type { CompanyRepresentativeRepository } from '../repositories/CompanyRepresentativeRepository.js';
import { isValidCnpj, onlyDigits } from '../utils/cnpj.js';

export interface RegisterCompanyInput {
  cnpj: string;
  legalName: string;
  tradeName?: string;
}

// Formato público — nunca há senha/credencial numa empresa (autenticação
// sempre pertence ao customer/representante, nunca à companies).
export interface RegisteredCompany {
  id: string;
  cnpj: string;
  legalName: string;
  tradeName: string | null;
  status: string;
  createdAt: string;
}

// Customer Identity — estrutura PJ (aditiva). Ainda sem rota HTTP: não
// existe login/sessão real de cliente ainda (Etapa 2), então não haveria
// como saber COM AUTORIDADE qual customer está cadastrando a empresa —
// expor isso sem autenticação real seria inseguro. Este service já é
// funcional e testado; a rota HTTP entra quando o login real existir.
export class CompanyService {
  constructor(
    private readonly companies: CompanyRepository,
    private readonly representatives: CompanyRepresentativeRepository,
  ) {}

  // Cria a empresa e já vincula quem a cadastrou como primeiro
  // representante (papel padrão 'ADMIN' — o representante original,
  // outros podem ser adicionados depois via addRepresentative).
  async registerCompany(input: RegisterCompanyInput, representativeCustomerId: string): Promise<RegisteredCompany> {
    const cnpj = onlyDigits(input.cnpj);
    const legalName = input.legalName.trim();
    const tradeName = input.tradeName?.trim() || null;

    if (!isValidCnpj(cnpj)) throw new ApiError('COMPANY_CNPJ_INVALID', 'CNPJ inválido.', { statusCode: 422 });
    if (!legalName) throw new ApiError('COMPANY_LEGAL_NAME_INVALID', 'Razão social inválida.', { statusCode: 422 });
    if (await this.companies.findByCnpj(cnpj)) throw new ApiError('COMPANY_CNPJ_ALREADY_REGISTERED', 'Este CNPJ já está cadastrado.', { statusCode: 409 });

    const company = await this.companies.create({ cnpj, legalName, tradeName });
    await this.representatives.create({ companyId: company.id, customerId: representativeCustomerId, role: 'ADMIN' });
    return this.toPublicCompany(company);
  }

  // Vincula um customer já existente como representante adicional de uma
  // empresa já cadastrada — é assim que "uma empresa pode ter mais de um
  // representante" e "uma pessoa pode representar mais de uma empresa"
  // acontecem na prática, sem duplicar nada em customers/companies.
  async addRepresentative(companyId: string, customerId: string, role = 'MEMBER'): Promise<void> {
    const company = await this.companies.findById(companyId);
    if (!company) throw new ApiError('COMPANY_NOT_FOUND', 'Empresa não encontrada.', { statusCode: 404 });
    const existing = await this.representatives.findByCompanyAndCustomer(companyId, customerId);
    if (existing) throw new ApiError('COMPANY_REPRESENTATIVE_ALREADY_LINKED', 'Este cliente já representa esta empresa.', { statusCode: 409 });
    await this.representatives.create({ companyId, customerId, role });
  }

  async listCompaniesForCustomer(customerId: string): Promise<Array<{ company: RegisteredCompany; role: string }>> {
    const links = await this.representatives.listByCustomer(customerId);
    const results: Array<{ company: RegisteredCompany; role: string }> = [];
    for (const link of links) {
      const company = await this.companies.findById(link.companyId);
      if (company) results.push({ company: this.toPublicCompany(company), role: link.role });
    }
    return results;
  }

  async listRepresentativesForCompany(companyId: string): Promise<string[]> {
    const links = await this.representatives.listByCompany(companyId);
    return links.map((link) => link.customerId);
  }

  // Autorização pra rota HTTP: devolve o papel do customer naquela
  // empresa (ou null se ele não a representa) — quem chama decide o que
  // fazer com isso (ex.: exigir 'ADMIN' pra adicionar representante,
  // exigir "qualquer papel" só pra listar). Nunca lança — a ausência de
  // vínculo é um resultado normal, não um erro.
  async getRepresentativeRole(companyId: string, customerId: string): Promise<string | null> {
    const link = await this.representatives.findByCompanyAndCustomer(companyId, customerId);
    return link?.role ?? null;
  }

  private toPublicCompany(company: { id: string; cnpj: string; legalName: string; tradeName: string | null; status: string; createdAt: Date }): RegisteredCompany {
    return { id: company.id, cnpj: company.cnpj, legalName: company.legalName, tradeName: company.tradeName, status: company.status, createdAt: company.createdAt.toISOString() };
  }
}
