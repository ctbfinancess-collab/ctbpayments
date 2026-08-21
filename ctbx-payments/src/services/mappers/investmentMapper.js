import{formatCents}from'./accountMapper';const minor=(v,n)=>{if(!Number.isInteger(v))throw new TypeError(`${n} must use integer minor units`);return formatCents(v)};export const mapInvestmentProduct=x=>({...x,term:`${x.termDays} dias`,return:x.rateDisplay,risk:x.riskLabel});export const mapInvestmentSimulation=x=>({...x,product:mapInvestmentProduct(x.product),amount:minor(x.amountMinor,'amountMinor'),projectedGross:minor(x.projectedGrossMinor,'projectedGrossMinor'),projectedNet:minor(x.projectedNetMinor,'projectedNetMinor')});export const mapInvestmentOrder=x=>({...x,product:mapInvestmentProduct(x.product),amount:minor(x.amountMinor,'amountMinor'),simulated:x.simulated===true});
// Posição SANDBOX (GET /v1/investments/positions) só existe hoje como
// {positionId,orderId,product,investedMinor,currentMinor,status,simulated,
// environment} — sem rentabilidade/vencimento/indexador (o backend não
// calcula nem armazena nada disso ainda, é 1:1 derivado da ordem). Este
// mapper traduz só o que é real: valores em reais a partir de
// investedMinor/currentMinor (rendimento sempre 0 hoje, já que o backend
// nunca simula ganho) e o nome/taxa reais do produto da ordem. Campos que
// simplesmente não existem no backend (indexador, data de aplicação,
// prazo textual, pagamento de juros, vencimento) viram '—' — nunca um
// valor inventado — mesmo símbolo que o mock já usa pra "sem próximo
// pagamento".
const centsToAmount=v=>Number.isFinite(v)?v/100:0;
export const mapInvestmentPosition=x=>{
  const investedMinor=Number.isFinite(x.investedMinor)?x.investedMinor:0;
  const currentMinor=Number.isFinite(x.currentMinor)?x.currentMinor:investedMinor;
  const invested=centsToAmount(investedMinor);
  const yieldAmount=centsToAmount(currentMinor-investedMinor);
  const yieldPercent=investedMinor>0?((currentMinor-investedMinor)/investedMinor)*100:0;
  return{
    id:x.positionId,orderId:x.orderId,
    name:x.product?.name??'—',icon:'trending-up-outline',
    status:x.status==='ACTIVE'?'Ativo':(x.status??'—'),
    rateLabel:x.product?.rateDisplay??'—',
    invested,yieldAmount,yieldPercent,
    maturity:'—',indexer:'—',appliedAt:'—',
    term:Number.isFinite(x.product?.termDays)?`${x.product.termDays} dias`:'—',
    interestPayment:'—',nextPayment:'—',liquidity:'—',
  };
};
