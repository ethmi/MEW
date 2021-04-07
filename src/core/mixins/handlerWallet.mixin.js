import utils from 'web3-utils';
import {
  getEthBalance,
  subscribeToAccountBalance,
  getUSDPrice
} from '@/apollo/queries/wallets/wallets.graphql';
import { Toast, ERROR } from '@/modules/toast/handler/handlerToast';

const tokens = {
  eth: 'ethereum'
};

export default {
  name: 'HandlerWallet',
  data() {
    return {
      getEthBalance: '',
      getLatestPrices: '',
      subscribeToAccountBalance: ''
    };
  },
  apollo: {
    /**
     * Apollo query to get eth balance
     */
    getEthBalance: {
      query: getEthBalance,
      variables() {
        return {
          hash: this.address
        };
      },
      skip() {
        return !this.isEthNetwork;
      },
      result({ data }) {
        console.error('eth balance', data)
        this.setAccountBalance(utils.toBN(data.getEthBalance.balance));
      },
      error(error) {
        Toast(error.message, {}, ERROR);
      }
    },
    /**
     * Apollo subscription for eth balance
     */
    $subscribe: {
      subscribeToAccountBalance: {
        query: subscribeToAccountBalance,
        variables() {
          return {
            owner: this.address,
            event: 'NEW_ETH_TRANSFER'
          };
        },
        skip() {
          return !this.isEthNetwork;
        },
        result() {
          console.error('in sub')
          this.$apollo.queries.getEthBalance.refetch();
        },
        error(error) {
          Toast(error.message, {}, ERROR);
        }
      }
    },
    /**
     * Apollo query to fetch latest Eth price in USD.
     */
    getLatestPrices: {
      query: getUSDPrice,
      skip() {
        return !this.isEthNetwork;
      },
      result({ data }) {
        const ethereumPrice = data.getLatestPrices.filter(item => {
          if (item.id === tokens.eth) return item;
        });

        if (ethereumPrice) {
          const usd = {
            value: ethereumPrice[0].current_price,
            symbol: '$',
            name: 'USD',
            price_change_24h: ethereumPrice[0].price_change_24h
          };
          this.setETHUSDValue(usd);
        }
        console.error('ethereumPrice', ethereumPrice)
      },
      error(error) {
        Toast(error.message, {}, ERROR);
      }
    }
  }
};
