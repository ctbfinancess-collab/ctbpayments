import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryCompanyRepository } from '../src/repositories/InMemoryCompanyRepository.js';
import { InMemoryCompanyRepresentativeRepository } from '../src/repositories/InMemoryCompanyRepresentativeRepository.js';
import { InMemoryCustomerRepository } from '../src/repositories/InMemoryCustomerRepository.js';
import { InMemoryCustomerSessionRepository } from '../src/repositories/InMemoryCustomerSessionRepository.js';
import { CompanyService } from '../src/services/companyService.js';
import { CustomerAuthService } from '../src/services/customerAuthService.js';

// Customer Identity — estrutura PJ (aditiva). CNPJs válidos usados nos
// testes (dígito verificador correto, mesmo algoritmo de src/utils/cnpj.ts).
const VALID_CNPJ = '11.222.333/0001-81';
const VALID_CNPJ_2 = '11.444.777/0001-61';

function setup() {
  const companies = new InMemoryCompanyRepository();
  const representatives = new InMemoryCompanyRepresentativeRepository();
  const customers = new InMemoryCustomerRepository();
  return { companies, representatives, customers, service: new CompanyService(companies, representatives), customerAuth: new CustomerAuthService(customers, new InMemoryCustomerSessionRepository()) };
}

async function registerCustomer(customerAuth: CustomerAuthService, suffix: string) {
  return customerAuth.register({ name: `Cliente ${suffix}`, document: suffix === 'A' ? '111.444.777-35' : '529.982.247-25', email: `${suffix}@sandbox.invalid`, phone: '11999990000', password: 'senha-forte-123' });
}

test('registerCompany creates the company and links the registering customer as ADMIN representative', async () => {
  const { service, customerAuth, representatives } = setup();
  const customer = await registerCustomer(customerAuth, 'A');
  const company = await service.registerCompany({ cnpj: VALID_CNPJ, legalName: 'Empresa Exemplo LTDA', tradeName: 'Exemplo' }, customer.id);
  assert.equal(company.legalName, 'Empresa Exemplo LTDA');
  assert.equal(company.tradeName, 'Exemplo');
  assert.equal(company.status, 'ACTIVE');
  assert.equal(company.cnpj, '11222333000181'); // CNPJ presente, só dígitos (sem máscara)
  const link = await representatives.findByCompanyAndCustomer(company.id, customer.id);
  assert.ok(link);
  assert.equal(link!.role, 'ADMIN');
});

test('registerCompany rejects an invalid CNPJ (wrong check digit)', async () => {
  const { service, customerAuth } = setup();
  const customer = await registerCustomer(customerAuth, 'A');
  await assert.rejects(
    service.registerCompany({ cnpj: '11.222.333/0001-82', legalName: 'Empresa' }, customer.id),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'COMPANY_CNPJ_INVALID',
  );
});

test('registerCompany rejects a duplicate CNPJ', async () => {
  const { service, customerAuth } = setup();
  const customerA = await registerCustomer(customerAuth, 'A');
  const customerB = await registerCustomer(customerAuth, 'B');
  await service.registerCompany({ cnpj: VALID_CNPJ, legalName: 'Empresa A' }, customerA.id);
  await assert.rejects(
    service.registerCompany({ cnpj: VALID_CNPJ, legalName: 'Empresa B' }, customerB.id),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'COMPANY_CNPJ_ALREADY_REGISTERED',
  );
});

test('a company can have more than one representative', async () => {
  const { service, customerAuth } = setup();
  const customerA = await registerCustomer(customerAuth, 'A');
  const customerB = await registerCustomer(customerAuth, 'B');
  const company = await service.registerCompany({ cnpj: VALID_CNPJ, legalName: 'Empresa Exemplo' }, customerA.id);
  await service.addRepresentative(company.id, customerB.id, 'MEMBER');
  const representativeIds = await service.listRepresentativesForCompany(company.id);
  assert.equal(representativeIds.length, 2);
  assert.ok(representativeIds.includes(customerA.id));
  assert.ok(representativeIds.includes(customerB.id));
});

test('a single person (customer) can represent more than one company', async () => {
  const { service, customerAuth } = setup();
  const customer = await registerCustomer(customerAuth, 'A');
  await service.registerCompany({ cnpj: VALID_CNPJ, legalName: 'Empresa A' }, customer.id);
  await service.registerCompany({ cnpj: VALID_CNPJ_2, legalName: 'Empresa B' }, customer.id);
  const companiesForCustomer = await service.listCompaniesForCustomer(customer.id);
  assert.equal(companiesForCustomer.length, 2);
  assert.equal(companiesForCustomer[0]!.role, 'ADMIN');
  assert.equal(companiesForCustomer[1]!.role, 'ADMIN');
});

test('addRepresentative rejects linking the same customer to the same company twice', async () => {
  const { service, customerAuth } = setup();
  const customerA = await registerCustomer(customerAuth, 'A');
  const customerB = await registerCustomer(customerAuth, 'B');
  const company = await service.registerCompany({ cnpj: VALID_CNPJ, legalName: 'Empresa' }, customerA.id);
  await service.addRepresentative(company.id, customerB.id);
  await assert.rejects(
    service.addRepresentative(company.id, customerB.id),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'COMPANY_REPRESENTATIVE_ALREADY_LINKED',
  );
});

test('addRepresentative rejects an unknown company', async () => {
  const { service, customerAuth } = setup();
  const customer = await registerCustomer(customerAuth, 'A');
  await assert.rejects(
    service.addRepresentative('00000000-0000-0000-0000-000000000000', customer.id),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'COMPANY_NOT_FOUND',
  );
});

test('companies never carry a password/credential field', async () => {
  const { service, customerAuth } = setup();
  const customer = await registerCustomer(customerAuth, 'A');
  const company = await service.registerCompany({ cnpj: VALID_CNPJ, legalName: 'Empresa' }, customer.id);
  assert.equal('passwordHash' in company, false);
  assert.equal('password' in company, false);
});

test('a company and its representatives survive a fresh service instance over the same repositories (simulates a backend restart)', async () => {
  const companies = new InMemoryCompanyRepository();
  const representatives = new InMemoryCompanyRepresentativeRepository();
  const customers = new InMemoryCustomerRepository();
  const customerAuth = new CustomerAuthService(customers, new InMemoryCustomerSessionRepository());
  const service = new CompanyService(companies, representatives);
  const customer = await registerCustomer(customerAuth, 'A');
  const company = await service.registerCompany({ cnpj: VALID_CNPJ, legalName: 'Empresa' }, customer.id);

  const serviceAfterRestart = new CompanyService(companies, representatives);
  const companiesForCustomer = await serviceAfterRestart.listCompaniesForCustomer(customer.id);
  assert.equal(companiesForCustomer.length, 1);
  assert.equal(companiesForCustomer[0]!.company.id, company.id);
});

// getRepresentativeRole — usado pela camada HTTP pra autorização (só
// ADMIN pode adicionar representante; qualquer papel pode listar).
test('getRepresentativeRole returns the role for an existing representative, and null for a stranger', async () => {
  const { service, customerAuth } = setup();
  const customerA = await registerCustomer(customerAuth, 'A');
  const customerB = await registerCustomer(customerAuth, 'B');
  const company = await service.registerCompany({ cnpj: VALID_CNPJ, legalName: 'Empresa' }, customerA.id);
  await service.addRepresentative(company.id, customerB.id, 'MEMBER');

  assert.equal(await service.getRepresentativeRole(company.id, customerA.id), 'ADMIN');
  assert.equal(await service.getRepresentativeRole(company.id, customerB.id), 'MEMBER');
  // Terceiro CPF sintético válido, diferente dos dois já usados por
  // registerCustomer() acima (só cobre os sufixos 'A' e demais).
  const customerC = await customerAuth.register({ name: 'Cliente C', document: '734.912.658-19', email: 'C@sandbox.invalid', phone: '11999990000', password: 'senha-forte-123' });
  assert.equal(await service.getRepresentativeRole(company.id, customerC.id), null);
});
