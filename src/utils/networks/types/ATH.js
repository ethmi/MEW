import tokens from '@/_generated/tokens/tokens-ath.json';
import contracts from '@/_generated/contracts/contract-abi-ath.json';
import ath from '@/assets/images/networks/network.svg';

export default {
  name: 'ATH',
  name_long: 'Atheios',
  homePage: 'https://www.atheios.com/',
  blockExplorerTX: 'https://scan.atheios.com/tx/[[txHash]]',
  blockExplorerAddr: 'https://scan.atheios.com/addr/[[address]]',
  chainID: 1620,
  tokens: tokens,
  contracts: contracts,
  icon: ath,
  currencyName: 'ATH'
};
