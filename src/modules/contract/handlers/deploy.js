import BigNumber from 'bignumber.js';
import store from 'store';
import utils from 'web3-utils';
import { address, bool, bytes, int, string, uint } from './solidityTypes';
import sanitizeHex from '@/core/helpers/sanitizeHex';
import * as ethUnit from 'ethjs-unit';
import { Transaction } from 'ethereumjs-tx';
import { bufferToHex, generateAddress, toBuffer } from 'ethereumjs-util';

const stringToArray = str => {
  return str.replace(/[^a-zA-Z0-9_,]+/g, '').split(',');
};

const isInt = num => {
  try {
    utils.toBN(num);
    return true;
  } catch (e) {
    return false;
  }
};

const validateHexString = str => {
  if (str === '') return true;
  str =
    str.substring(0, 2) === '0x'
      ? str.substring(2).toUpperCase()
      : str.toUpperCase();
  return utils.isHex(str);
};

export default class Deploy {
  constructor(abi, txByteCode, address, web3, gasPrice) {
    try {
      this.userAddress = address;
      this.address = '';
      this.web3 = web3;
      this.gasPrice = gasPrice;
      this.ABI = abi;
      this.constructorABI = null;
      this.constructorInputs = {};
      this.txByteCode = txByteCode;
      this.contractsDeployed = [];
      this.noConstructorInputs = false;
      this.abiConstructor();
    } catch (e) {
      // eslint-disable-next-line
      console.error(e);
    }
  }

  clear() {
    this.constructorABI = null;
    this.constructorInputs = {};
    this.txByteCode = null;
    this.noConstructorInputs = false;
    this.inputs = {};
    this.ABI = null;
    this.contractMethods = [];
  }

  reset() {
    this.clear();
    this.address = '';
  }

  updateGasPrice(gasPrice) {
    this.gasPrice = gasPrice;
  }

  get hasABI() {
    return !!Deploy.validateABI(this.ABI);
  }

  get abiValid() {
    return this.hasABI && typeof this.ABI === 'object';
  }

  get byteCodeValid() {
    try {
      return !!this.txByteCode && this.txByteCode.substring(0, 2) === '0x';
    } catch (e) {
      return false;
    }
  }

  get payableConstructor() {
    if (this.constructorABI) {
      return this.constructorABI.stateMutability
        ? this.constructorABI.stateMutability === 'payable'
        : this.constructorABI.payable;
    }
    return false;
  }

  get canDeploy() {
    return (
      this.hasABI &&
      this.hasConstructorABI &&
      this.txByteCode !== null &&
      ((Object.values(this.constructorInputs).every(item => {
        return item.value !== null && item.valid;
      }) &&
        Object.values(this.constructorInputs).length > 0) ||
        this.noConstructorInputs)
    );
  }

  get hasConstructorABI() {
    if (this.constructorABI) {
      return Object.keys(this.constructorABI).length > 0;
    }
    return false;
  }

  setDeployArg(name, value) {
    this.constructorInputs[name].value = value;
  }

  abiConstructor() {
    try {
      this.constructorInputs = {};
      if (this.hasABI && this.byteCodeValid) {
        this.ABI.forEach(item => {
          if (item.type === 'constructor') {
            this.constructorABI = item;
          }
        });
        if (
          this.constructorABI &&
          this.constructorABI.hasOwnProperty('inputs')
        ) {
          this.constructorABI.inputs.forEach(item => {
            const itemProxy = this.createTypeValidatingProxy(item);
            itemProxy.value = null;
            this.constructorInputs[item.name] = itemProxy;
          });
          if (this.constructorABI.inputs.length === 0) {
            this.noConstructorInputs = true;
          }
        }
      }
      return this.constructorInputs;
    } catch (e) {
      // eslint-disable-next-line
      console.error(e);
      return {};
    }
  }
  deploy(withValue, contractName) {
    return new Promise((resolve, reject) => {
      try {
        if (!this.canDeploy) return Promise.reject();
        const rawTx = {};
        if (this.constructorABI.payable && withValue)
          rawTx.value = sanitizeHex(
            ethUnit.toWei(withValue, 'ether').toString(16)
          );
        else rawTx.value = '0x00';
        rawTx.data = this.txData();
        if (rawTx.data !== '0x') {
          this.sendTransaction(rawTx, contractName)
            .then(res => {
              resolve(res);
            })
            .catch(reject);
        }
      } catch (e) {
        return Promise.reject(e);
      }
    });
  }
  get deployArgs() {
    const _deployArgs = [];
    if (this.constructorABI) {
      this.constructorABI.inputs.forEach(item => {
        if (item.type.includes('[') && item.type.includes(']')) {
          const inputs = this.constructorInputs.hasOwnProperty(item.name)
            ? this.constructorInputs[item.name].value.replace(/\s/g, '')
            : '';
          const arr = inputs.split(',');
          _deployArgs.push(arr);
        } else {
          _deployArgs.push(this.constructorInputs[item.name].value);
        }
      });
    }
    return _deployArgs;
  }

  txData() {
    if (this.canDeploy) {
      return new this.web3.eth.Contract(this.ABI)
        .deploy({ data: this.txByteCode, arguments: this.deployArgs })
        .encodeABI();
    }

    return '0x';
  }
  async estimateGas(params) {
    return this.web3.eth.estimateGas(params).catch(err => {
      // eslint-disable-next-line
      console.error(err);
    });
  }
  async getNonce(address) {
    return this.web3.eth.getTransactionCount(address);
  }
  getGasPrice() {
    return sanitizeHex(ethUnit.toWei(this.gasPrice, 'gwei').toString(16));
  }
  sendTransaction(tx, contractName) {
    let coinbase;
    return this.web3.eth
      .getCoinbase()
      .then(() => {
        coinbase = this.userAddress; // todo use actual result from getCoinbase if correctly returns user address
        return Promise.all([
          this.estimateGas({ from: coinbase, ...tx }),
          this.getNonce(coinbase)
        ]);
      })

      .then(results => {
        const _tx = new Transaction({
          from: coinbase,
          nonce: results[1],
          gasPrice: this.getGasPrice(),
          gasLimit: sanitizeHex(new BigNumber(results[0]).toString(16)),
          ...tx
        });
        const json = _tx.toJSON(true);
        delete json.to;
        json.from = coinbase;
        const contractAddr = bufferToHex(
          generateAddress(toBuffer(coinbase), toBuffer(results[1]))
        );
        this.address = contractAddr;
        this.pushContractToStore(contractAddr, contractName);
        this.contractsDeployed.push(contractAddr);
        this.clear();
        return this.web3.eth.sendTransaction(json);
      })
      .catch(err => {
        throw err;
      });
  }

  pushContractToStore(addr, contractName) {
    const localStoredContract = store.get('customContracts') || [];
    const itemIndex = localStoredContract.findIndex(item => {
      return item.name.toLowerCase() === contractName.toLowerCase();
    });
    if (itemIndex === -1) {
      const storableObj = {
        abi: this.ABI,
        address: addr,
        comment: '',
        name: contractName
      };
      localStoredContract.push(storableObj);
    } else {
      localStoredContract[itemIndex] = {
        abi: this.ABI,
        address: addr,
        comment: '',
        name: contractName
      };
    }
    store.set('customContracts', localStoredContract);
  }

  createTypeValidatingProxy(item) {
    return new Proxy(item, {
      set: (obj, prop, value) => {
        if (prop === 'value' && value !== null) {
          if (
            Deploy.isContractArgValid(
              value,
              Deploy.getType(obj.type).solidityType
            )
          ) {
            obj.valid = true;
          } else {
            obj.valid = false;
          }
        } else if (prop === 'value' && value === null) {
          obj.valid = false;
        } else if (prop === 'clear') {
          obj.valid = false;
        }
        obj[prop] = value;
        return true;
      },
      get: (target, prop) => {
        if (prop === 'clear') {
          target.value = null;
          target.valid = false;
          return true;
        }
        return target[prop];
      }
    });
  }
  parseJSON(json) {
    try {
      JSON.parse(json);
      return JSON.parse(json);
    } catch (e) {
      if (Array.isArray(json)) {
        return json;
      }
      return false;
    }
  }
  static validateABI(json) {
    if (json === '') return false;
    try {
      JSON.parse(json);
      return JSON.parse(json);
    } catch (e) {
      if (Array.isArray(json)) {
        if (json.length > 0) {
          return json;
        }
      }
      return false;
    }
  }
  static isContractArgValid(value, solidityType) {
    try {
      if (!value) value = '';
      if (solidityType.includes('[]')) {
        const parsedValue = Array.isArray(value) ? value : stringToArray(value);
        const type = solidityType.replace('[]', '');
        for (const parsedItem of parsedValue) {
          if (!Deploy.isContractArgValid(parsedItem, type)) return false;
        }
        return true;
      }
      if (solidityType.includes(uint) || solidityType.includes(int))
        return value !== '' && !isNaN(value) && isInt(value);
      if (solidityType === address) return utils.isAddress(value);
      if (solidityType === string) return true;
      if (solidityType.includes(bytes))
        return value.substr(0, 2) === '0x' && validateHexString(value);
      if (solidityType === bool)
        return typeof value === typeof true || typeof value === typeof false;
      return false;
    } catch (e) {
      // eslint-disable-next-line
      console.error(e);
      return false;
    }
  }
  static getType(inputType) {
    try {
      if (!inputType) inputType = '';
      if (inputType.includes('[]')) {
        return { type: 'string', solidityType: `${inputType}` };
      }
      if (inputType.includes(uint))
        return { type: 'number', solidityType: uint };
      if (inputType.includes(address))
        return { type: 'text', solidityType: address };
      if (inputType.includes(string))
        return { type: 'text', solidityType: string };
      if (inputType.includes(bytes))
        return { type: 'text', solidityType: bytes };
      if (inputType.includes(bool))
        return { type: 'radio', solidityType: bool };
      return { type: 'text', solidityType: string };
    } catch (e) {
      // eslint-disable-next-line
      console.error(e);
    }
  }
  static formatInput(str) {
    try {
      if (str[0] === '[') {
        return JSON.parse(str);
      }
      const newArr = str.split(',');
      return newArr.map(item => {
        return item.replace(' ', '');
      });
    } catch (e) {
      // eslint-disable-next-line
      console.error(e);
    }
  }
}
