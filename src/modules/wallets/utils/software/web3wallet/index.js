import { WALLET_TYPES } from '../../../../access-wallet/hardware/handlers/configs/configWalletTypes';
import WalletInterface from '@/modules/wallets/utils/WalletInterface.js';
import Web3 from 'web3';
import { getBufferFromHex } from '@/modules/access-wallet/hardware/handlers/helpers/helperHex';
import errorHandler from './errorHandler';

class Web3Wallet extends WalletInterface {
  static get errorHandler() {
    return errorHandler;
  }
  constructor(address) {
    super(address, true, WALLET_TYPES.WEB3_WALLET);
    this.errorHandler = errorHandler;
    if (window.ethereum) {
      this.web3 = new Web3(window.ethereum);
    } else {
      this.web3 = new Web3(window.web3.currentProvider);
    }
    if (!this.web3) throw new Error('No Web3 instance found');
  }
  signTransaction(tx) {
    tx.from = this.getAddressString();
    return this.web3.eth.sendTransaction(tx);
  }
  signMessage(msg) {
    return new Promise(resolve => {
      this.web3.eth.personal
        .sign(msg, this.getAddressString())
        .then(hex => {
          resolve(getBufferFromHex(hex));
        })
        .catch(errorHandler);
    });
  }
}
export default Web3Wallet;
