// Inventário recuperado de hermes-modules/1341_items.js. Os dados financeiros abaixo são mocks locais.
// `icon` usa nomes do conjunto Ionicons (ver src/components/ui/Icon.js) — os
// mesmos nomes usados para os mesmos itens em src/screens/HomeScreen.js.
export const SERVICE_SECTIONS=[
 {title:'Conta Digital',items:[
  {key:1,label:'PIX',nav:'NavScreen132',route:'Pix',class:'A',icon:'flash-outline'},
  {key:7,label:'Transferências',nav:'NavScreen68',route:'Transfers',class:'A',icon:'swap-horizontal-outline'},
  {key:8,label:'Pagar Conta',nav:'NavScreen38',route:'Payments',class:'A',icon:'document-text-outline'},
  {key:10,label:'Extrato',nav:'NavScreen25',route:'Statement',class:'A',icon:'reader-outline'},
  {key:2,label:'Cartões',nav:'NavScreen36',route:'Cards',class:'A',icon:'card-outline'},
  {key:11,label:'Cobrança',nav:'NavScreen30',route:'BillingStart',class:'B',icon:'repeat-outline'},
 ],},
 {title:'Serviços',items:[
  {key:43,label:'Recarga TOP',nav:'NavScreen182',route:'CardRecharge',params:{transport:true},class:'B',icon:'bus-outline'},
  {key:13,label:'Comprovantes',nav:'NavScreen53',route:'ServiceReceipts',class:'B',icon:'receipt-outline'},
  {key:3,label:'Investimentos',nav:'NavScreen170',route:'Investments',class:'B',icon:'trending-up-outline'},
  {key:25,label:'QR Code',nav:'NavScreen37',route:'PixQrScanner',class:'B',icon:'qr-code-outline'},
 ],},
 {title:'Produtos',items:[
  {key:39,label:'Crédito Consignado',nav:'NavScreen178',route:'ConsignedCredit',class:'B',icon:'wallet-outline'},
  {key:38,label:'Benefícios',nav:'NavScreen177',class:'C',icon:'gift-outline'},
  {key:37,label:'Antecipação Salarial',nav:'NavScreen176',class:'C',icon:'cash-outline'},
 ],},
 {title:'Empresas',items:[
  {key:40,label:'Capital de Giro',nav:'NavScreen179',class:'C',icon:'briefcase-outline'},
  {key:41,label:'Antecipação de Recebíveis',nav:'NavScreen180',class:'C',icon:'checkmark-done-outline'},
  {key:42,label:'POS Tapon',nav:'NavScreen181',class:'C',icon:'phone-portrait-outline'},
  {key:22,label:'Microcrédito Digital',nav:'NavScreen72',class:'C',icon:'sparkles-outline'},
 ],},
 {title:'Configurações',items:[
  {key:27,label:'Tarifas',nav:'NavScreen51',route:'ServiceInfo',params:{type:'fees'},class:'B',icon:'pricetag-outline'},
  {key:31,label:'Ajuda',nav:'NavScreen10',route:'ServiceInfo',params:{type:'help'},class:'B',icon:'help-circle-outline'},
  {key:30,label:'Indicar Amigos',nav:'NavScreen87',class:'C',icon:'people-outline'},
  {key:26,label:'Perfil',nav:'NavScreen9',route:'Profile',class:'A',icon:'person-outline'},
 ],},
];
export const MOCK_INVESTMENTS=[{id:'cdb',name:'CDB CTBX',return:'105% do CDI',term:'12 meses',risk:'Baixo'},{id:'fixed',name:'Renda Fixa',return:'Pré-fixado',term:'6 meses',risk:'Baixo'}];
// Posições já aplicadas (estrutural/demonstrativo) — irEstimate usa uma
// simplificação fixa de 15% sobre o rendimento bruto, só para ilustrar a
// linha "IR estimado" da tela de detalhe; não reflete a tabela regressiva real.
export const MOCK_INVESTMENT_POSITIONS=[
  {id:'cdb-ctbx',name:'CDB CTBX',icon:'business-outline',status:'Ativo',rateLabel:'100% do CDI',indexer:'CDI',invested:85000,yieldAmount:6375.40,yieldPercent:7.50,appliedAt:'15/08/2025',maturity:'15/08/2027',term:'2 anos',interestPayment:'No vencimento',nextPayment:'—',liquidity:'No vencimento'},
  {id:'renda-fixa',name:'Renda Fixa',icon:'pie-chart-outline',status:'Ativo',rateLabel:'IPCA + 6,20% a.a.',indexer:'IPCA',invested:40480,yieldAmount:2575,yieldPercent:6.36,appliedAt:'20/02/2026',maturity:'20/02/2028',term:'2 anos',interestPayment:'Semestral',nextPayment:'20/08/2026',liquidity:'No vencimento'},
];
export const MOCK_CONSIGNED=[{id:'private',name:'Crédito consignado',rate:'Taxa consultada na contratação',term:'Até 48 parcelas'}];
export const SERVICE_ENDPOINTS={investments:['investimento/lista','investimento/lista-dias','investimento/simulacao','investimento/termo','conta-investimento/investimento','conta/saldo'],billing:['boleto/boleto/boletos-usuario','conta/boletos-restantes','boleto/boleto/boleto-cobranca','boleto/boleto/consulta-boleto-external-id','boleto/boleto/enviar-email-boleto','sacado/lista','sacado/create','sacado/update','sacado/delete','utilitarios/cep'],consigned:['consignado-simples/lista','consignado-simples/lista-doc','consignado-simples/termo-consignado','consignado-pedido/solicitacao','consignado-pedido/lista-pedido'],fees:['cdi/lista-cdi'],help:['termos/texto']};
