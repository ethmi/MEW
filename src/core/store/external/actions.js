import { Toast, ERROR } from '@/modules/toast/handler/handlerToast';
import { ETH, BSC, MATIC } from '@/utils/networks/types';
import { MAIN_TOKEN_ADDRESS } from '@/core/helpers/common';
import BigNumber from 'bignumber.js';
import {
  formatFiatValue,
  formatFloatingPointValue
} from '@/core/helpers/numberFormatHelper';

const setDarkList = async function ({ commit }) {
  const darkList = await fetch(
    'https://raw.githubusercontent.com/MyEtherWallet/ethereum-lists/master/src/addresses/addresses-darklist.json'
  )
    .then(res => res.json())
    .catch(e => {
      Toast(e.message, {}, ERROR);
    });
  commit('SET_DARK_LIST', {
    data: darkList,
    timestamp: Date.now()
  });
};
const setCurrency = async function ({ commit }, val) {
  const rates = await fetch(
    'https://mainnet.mewwallet.dev/v2/prices/exchange-rates'
  )
    .then(res => res.json())
    .catch(e => {
      Toast(e.message, {}, ERROR);
    });
  const currentRate = rates
    ? rates.find(rate => rate.fiat_currency === val)
    : {};
  commit('SET_CURRENCY_RATE', {
    data: currentRate,
    timestamp: Date.now()
  });
};
const setLastPath = function ({ commit }, val) {
  commit('SET_LAST_PATH', val);
};
const setCoinGeckoTokens = function ({ commit }, params) {
  commit('SET_COIN_GECKO_TOKENS', params);
};
const setTokenBalance = function ({
  rootGetters,
  getters,
  dispatch,
  rootState
}) {
  const network = rootGetters['global/network'];
  const isTokenBalanceApiSupported =
    network.type.name === BSC.name ||
    network.type.name === ETH.name ||
    network.type.name === MATIC.name;
  const balanceInWei = rootGetters['wallet/balanceInWei'];
  const address = rootState.wallet.address;
  const TOKEN_BALANCE_API = 'https://tokenbalance.mewapi.io';

  const _getTokenBalance = (balance, decimals) => {
    let n = new BigNumber(balance);
    if (decimals) {
      n = n.div(new BigNumber(10).pow(decimals));
      n = formatFloatingPointValue(n);
    }
    return n;
  };
  if (!isTokenBalanceApiSupported) {
    const token = getters.contractToToken(MAIN_TOKEN_ADDRESS);
    const denominator = new BigNumber(10).pow(token.decimals);
    const usdBalance = new BigNumber(balanceInWei)
      .div(denominator)
      .times(token.price)
      .toString();
    dispatch(
      'wallet/setTokens',
      [
        Object.assign(
          {
            balance: balanceInWei,
            balancef: _getTokenBalance(balanceInWei, token.decimals).value,
            usdBalance: usdBalance,
            usdBalancef: formatFiatValue(usdBalance).value
          },
          token
        )
      ],
      { root: true }
    );
    return;
  }
  fetch(
    `${TOKEN_BALANCE_API}/${network.type.name.toLowerCase()}?address=${address}`
  )
    .then(res => res.json())
    .then(res => res.result)
    .then(tokens => {
      tokens.push({
        contract: MAIN_TOKEN_ADDRESS,
        balance: balanceInWei
      });
      const formattedList = [];
      tokens.forEach(t => {
        const token = getters.contractToToken(t.contract);
        if (!token) return;
        const denominator = new BigNumber(10).pow(token.decimals);
        const usdBalance = new BigNumber(t.balance)
          .div(denominator)
          .times(token.price)
          .toString();
        formattedList.push(
          Object.assign(
            {
              balance: t.balance,
              balancef: _getTokenBalance(t.balance, token.decimals).value,
              usdBalance: usdBalance,
              usdBalancef: formatFiatValue(usdBalance).value
            },
            token
          )
        );
      });
      formattedList.sort(function (x, y) {
        return x.contract == MAIN_TOKEN_ADDRESS
          ? -1
          : y.contract == MAIN_TOKEN_ADDRESS
          ? 1
          : 0;
      });
      dispatch('wallet/setTokens', formattedList, { root: true });
    });
};
export default {
  setDarkList,
  setLastPath,
  setCurrency,
  setCoinGeckoTokens,
  setTokenBalance
};
