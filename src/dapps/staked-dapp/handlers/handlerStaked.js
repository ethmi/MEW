import axios from 'axios';
import BigNumber from 'bignumber.js';
import configNetworkTypes from './configNetworkTypes';
import calculateEth2Rewards from './helpers';
import { Toast, ERROR } from '@/modules/toast/handler/handlerToast';

/**
 * ABI to get fees
 * from batch contract
 */
const ABI_GET_FEES = [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'numValidators',
        type: 'uint256'
      }
    ],
    name: 'getFees',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

export { ABI_GET_FEES };
export default class Staked {
  constructor(web3, network, address) {
    /**
     * set up the variables
     */
    this.web3 = web3;
    this.network = network;
    this.address = address;
    this.totalStaked = '';
    this.apr = '';
    this.validatorsCount = '';
    this.pollingStatus = {};
    this.transactionData = {};
    this.endpoint = configNetworkTypes.network[this.network.type.name].endpoint;
    /**
     * get the initial data (total staked, apr, validators)
     */
    this.getTotalStakedAndAPR();
    this.getValidators();
  }
  /**
   * Get the total staked and current APR
   */
  getTotalStakedAndAPR() {
    this.eth2ContractAddress =
      configNetworkTypes.network[this.network.type.name].depositAddress;
    this.web3.eth
      .getBalance(this.eth2ContractAddress)
      .then(res => {
        const raw = this.web3.utils.fromWei(res, 'ether');
        this.totalStaked = new BigNumber(raw).toFormat(0);
        this.apr = new BigNumber(calculateEth2Rewards({ totalAtStake: raw }))
          .times(100)
          .toFixed();
      })
      .catch(err => {
        Toast(err, {}, ERROR);
      });
  }
  /**
   * Get clients validators
   */
  getValidators() {
    // this.loadingValidators = true;
    return axios
      .get(`${this.endpoint}/history?address=${this.address}`, {
        header: {
          'Content-Type': 'application/json'
        }
      })
      .then(resp => {
        this.myValidators = resp.data;
        // this.loadingValidators = false;
      })
      .catch(err => {
        // this.loadingValidators = false;
        this.myValidators = [];
        if (
          err.response &&
          err.response.status === 404 &&
          err.response.data.msg === 'No matching history found'
        ) {
          return;
        }
        Toast(err, {}, ERROR);
      });
  }
  /**
   * Start provisioning and get the provisoning request uuid to start polling
   */
  async startProvision(params) {
    this.validatorsCount = params.count;
    await axios
      .post(
        this.endpoint + '/provision',
        {
          address: this.address,
          withdrawalKey: params.eth2Address,
          validatorsCount: params.count
        },
        {
          header: {
            'Content-Type': 'application/json'
          }
        }
      )
      .then(response => {
        return response && response.data.provisioning_request_uuid
          ? this.startPolling(response.data.provisioning_request_uuid)
          : Toast(this.$t('dappsStaked.error-try-again'), {}, ERROR);
      })
      .catch(err => {
        Toast(err, {}, ERROR);
      });
  }
  /**
   * Start polling every 5000 ms
   * sets pollingStatus for UI
   */
  startPolling(uuid) {
    let prevReqComplete = true;
    const interval = setInterval(() => {
      if (!prevReqComplete) return;
      prevReqComplete = false;
      return axios
        .get(`${this.endpoint}/status?provisioning_request_uuid=${uuid}`, {
          header: {
            'Content-Type': 'application/json'
          }
        })
        .then(response => {
          prevReqComplete = true;
          if (
            response &&
            response.data &&
            response.data.raw.length === parseInt(this.validatorsCount)
          ) {
            this.pollingStatus = { success: true };
            this.transactionData = response.data.transaction;
            clearInterval(interval);
          }
        })
        .catch(err => {
          prevReqComplete = true;
          if (
            (err.response &&
              err.response.status === 424 &&
              err.response.data.msg ===
                'Not all validators have been provisioned') ||
            (err.response &&
              err.response.status === 404 &&
              err.response.data.msg ===
                'Requested provisioning_request_uuid not found')
          ) {
            return;
          }
          this.pollingStatus = { success: false, error: err.response };
        });
    }, 5000);
  }
  /**
   * Send tx to confirm staking
   */
  sendTransaction() {
    this.transactionData.from = this.address;
    this.web3.eth
      .sendTransaction(this.transactionData)
      .on('transactionHash', () => {
        // this.txHash = res;
      })
      .catch(err => {
        Toast(err, {}, ERROR);
      });
  }
}
