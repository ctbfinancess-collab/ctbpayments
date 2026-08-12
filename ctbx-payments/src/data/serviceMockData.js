// Inventário recuperado de hermes-modules/1341_items.js. Os dados financeiros abaixo são mocks locais.
export const SERVICE_SECTIONS=[
 {title:'Conta Digital',items:[
  {key:1,label:'PIX',nav:'NavScreen132',route:'Pix',class:'A',icon:'◆'},
  {key:7,label:'Transferências',nav:'NavScreen68',route:'Transfers',class:'A',icon:'↔'},
  {key:8,label:'Pagar Conta',nav:'NavScreen38',route:'Payments',class:'A',icon:'▥'},
  {key:10,label:'Extrato',nav:'NavScreen25',route:'Statement',class:'A',icon:'≡'},
  {key:2,label:'Cartões',nav:'NavScreen36',route:'Cards',class:'A',icon:'▱'},
  {key:11,label:'Cobrança',nav:'NavScreen30',route:'BillingStart',class:'B',icon:'∞'},
 ],},
 {title:'Serviços',items:[
  {key:43,label:'Recarga TOP',nav:'NavScreen182',route:'CardRecharge',params:{transport:true},class:'B',icon:'▰'},
  {key:13,label:'Comprovantes',nav:'NavScreen53',route:'ServiceReceipts',class:'B',icon:'▤'},
  {key:3,label:'Investimentos',nav:'NavScreen170',route:'Investments',class:'B',icon:'◔'},
  {key:25,label:'QR Code',nav:'NavScreen37',route:'PixQrScanner',class:'B',icon:'⌗'},
 ],},
 {title:'Produtos',items:[
  {key:39,label:'Crédito Consignado',nav:'NavScreen178',route:'ConsignedCredit',class:'B',icon:'□'},
  {key:38,label:'Benefícios',nav:'NavScreen177',class:'C',icon:'◇'},
  {key:37,label:'Antecipação Salarial',nav:'NavScreen176',class:'C',icon:'$'},
 ],},
 {title:'Empresas',items:[
  {key:40,label:'Capital de Giro',nav:'NavScreen179',class:'C',icon:'↗'},
  {key:41,label:'Antecipação de Recebíveis',nav:'NavScreen180',class:'C',icon:'✓'},
  {key:42,label:'POS Tapon',nav:'NavScreen181',class:'C',icon:'▦'},
  {key:22,label:'Microcrédito Digital',nav:'NavScreen72',class:'C',icon:'⌁'},
 ],},
 {title:'Configurações',items:[
  {key:27,label:'Tarifas',nav:'NavScreen51',route:'ServiceInfo',params:{type:'fees'},class:'B',icon:'☷'},
  {key:31,label:'Ajuda',nav:'NavScreen10',route:'ServiceInfo',params:{type:'help'},class:'B',icon:'?'},
  {key:30,label:'Indicar Amigos',nav:'NavScreen87',class:'C',icon:'◇'},
  {key:26,label:'Perfil',nav:'NavScreen9',class:'C',icon:'●'},
 ],},
];
export const MOCK_INVESTMENTS=[{id:'cdb',name:'CDB CTBX',return:'105% do CDI',term:'12 meses',risk:'Baixo'},{id:'fixed',name:'Renda Fixa',return:'Pré-fixado',term:'6 meses',risk:'Baixo'}];
export const MOCK_CONSIGNED=[{id:'private',name:'Crédito consignado',rate:'Taxa consultada na contratação',term:'Até 48 parcelas'}];
export const SERVICE_ENDPOINTS={investments:['investimento/lista','investimento/lista-dias','investimento/simulacao','investimento/termo','conta-investimento/investimento','conta/saldo'],billing:['boleto/boleto/boletos-usuario','conta/boletos-restantes','boleto/boleto/boleto-cobranca','boleto/boleto/consulta-boleto-external-id','boleto/boleto/enviar-email-boleto','sacado/lista','sacado/create','sacado/update','sacado/delete','utilitarios/cep'],consigned:['consignado-simples/lista','consignado-simples/lista-doc','consignado-simples/termo-consignado','consignado-pedido/solicitacao','consignado-pedido/lista-pedido'],fees:['cdi/lista-cdi'],help:['termos/texto']};
