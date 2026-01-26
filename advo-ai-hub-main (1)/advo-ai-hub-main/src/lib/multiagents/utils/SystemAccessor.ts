import { IMessageRouter } from '../types';

let router: IMessageRouter | null = null;

export const setRouter = (r: IMessageRouter) => { 
  router = r; 
  console.log('✅ Router registrado no SystemAccessor');
};

export const getRouter = (): IMessageRouter => {
  if (!router) {
    throw new Error("❌ System Router não foi inicializado! Certifique-se de iniciar o EnterpriseMultiAgentSystem.");
  }
  return router;
};
