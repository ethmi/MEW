import { ROUTES_WALLET } from '@/core/configs/configRoutes';
import { ETH, GOERLI, RIN, ROP } from '@/utils/networks/types';
import layout from './TheENSManagerLayout';
export default {
  title: 'ENS manager',
  subtitle: 'Migrate or register ENS domain / subdomain',
  tag: '#Property',
  rightIconType: 'mew',
  rightIcon: 'ensManager',
  path: ROUTES_WALLET.ENS_MANAGER.PATH,
  networks: [ETH, GOERLI, RIN, ROP],
  layout,
  meta: {
    noAuth: false
  },
  children: [
    {
      path: ROUTES_WALLET.ENS_1.PATH,
      name: ROUTES_WALLET.ENS_1.NAME
    },
    {
      path: ROUTES_WALLET.ENS_2.PATH,
      name: ROUTES_WALLET.ENS_2.NAME
    },
    {
      path: ROUTES_WALLET.ENS_3.PATH,
      name: ROUTES_WALLET.ENS_3.NAME
    }
  ]
};
