import {
  LedgerWallet,
  TrezorWallet,
  BitBoxWallet,
  BitBox02Wallet,
  KeepkeyWallet,
  BCVaultWallet,
  CoolWallet
} from '@/modules/access-wallet/hardware/handlers';
import WalletInterface from './WalletInterface';
import { MnemonicWallet, Web3Wallet } from '../software/handlers';
import {
  MewConnectWallet,
  WalletConnectWallet,
  WalletLinkWallet
} from '../hybrid/handlers';

export {
  LedgerWallet,
  TrezorWallet,
  BitBoxWallet,
  BitBox02Wallet,
  KeepkeyWallet,
  CoolWallet,
  MewConnectWallet,
  WalletConnectWallet,
  WalletLinkWallet,
  WalletInterface,
  Web3Wallet,
  MnemonicWallet,
  BCVaultWallet
};
