// MOCK TEMPORÁRIO: espelha os campos de `perfil.pessoa` até a sessão/API original ser reconstruída.
export const MOCK_PROFILE={name:'Cliente Demonstração',document:'***.***.***-**',email:'cliente.demo@ctbx.app',phone:'(**) *****-****',birthDate:'Não informado',maritalStatus:'Não informado',address:{zip:'00000-000',street:'Endereço não conectado',number:'—',complement:'',district:'—',city:'São Paulo',state:'SP'}};
export const MOCK_ACCOUNT={bank:'CTBX Payments',agency:'0001',number:'000000-0',type:'Conta Digital',status:'Ativa'};
export const MOCK_DEVICES=[{id:'current',name:'DISPOSITIVO ATUAL',current:true,blocked:false},{id:'pending',name:'DISPOSITIVO PENDENTE',current:false,blocked:true}];
export const PROFILE_TERMS=[{key:'termo_uso',label:'Termos de uso e privacidade'},{key:'termo_emprestimo',label:'Termos de solicitação'},{key:'termo_maquininha',label:'Termos de aquisição'}];
export const PROFILE_ENDPOINTS=['documento/upload&pasta=perfil','usuario/nova-foto-perfil','usuario/login','termos/texto','otp/gerar','reportar-erro/reportar'];
