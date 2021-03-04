import { isInt, stringToArray } from '@/core/helpers/common';
import {
  address,
  bool,
  bytes,
  int,
  string,
  uint
} from '@/modules/contract/handlers/solidityTypes';
import { isAddress } from '@/core/helpers/addressUtils';
import validateHexString from '@/core/helpers/validateHexString';

export function isContractArgValid(value, solidityType) {
  try {
    if (!value) value = '';
    if (solidityType.includes('[]')) {
      const parsedValue = Array.isArray(value) ? value : stringToArray(value);
      const type = solidityType.replace('[]', '');
      for (const parsedItem of parsedValue) {
        if (!isContractArgValid(parsedItem, type)) return false;
      }
      return true;
    }
    if (solidityType.includes(uint) || solidityType.includes(int))
      return value !== '' && !isNaN(value) && isInt(value);
    if (solidityType === address) return isAddress(value);
    if (solidityType === string) return true;
    if (solidityType.includes(bytes))
      return value.substr(0, 2) === '0x' && validateHexString(value);
    if (solidityType === bool)
      return typeof value === typeof true || typeof value === typeof false;
    return false;
  } catch (e) {
    return false;
  }
}
export function getType(inputType) {
  if (!inputType) inputType = '';
  if (inputType.includes('[]')) {
    return { type: 'string', solidityType: `${inputType}` };
  }
  if (inputType.includes(uint)) return { type: 'number', solidityType: uint };
  if (inputType.includes(address))
    return { type: 'text', solidityType: address };
  if (inputType.includes(string)) return { type: 'text', solidityType: string };
  if (inputType.includes(bytes)) return { type: 'text', solidityType: bytes };
  if (inputType.includes(bool)) return { type: 'radio', solidityType: bool };
  return { type: 'text', solidityType: string };
}
export function formatInput(str) {
  if (str[0] === '[') {
    return JSON.parse(str);
  }
  const newArr = str.split(',');
  return newArr.map(item => {
    return item.replace(' ', '');
  });
}

export function validateABI(json) {
  if (json === '') return false;
  if (Array.isArray(json)) {
    if (json.length > 0) {
      return json.every(item => {
        if (item.type === 'constructor') {
          return !!item.type && !!item.inputs;
        }
        if (item.type === 'function') {
          return !!item.type && !!item.inputs && !!item.outputs;
        }
        if (item.type !== 'function' || item.type !== 'constructor') {
          return !!item.type;
        }
      });
    }
  }
  return false;
}

export function parseABI(json) {
  if (json === '') return false;
  try {
    const value = JSON.parse(json);
    if (Array.isArray(value)) {
      if (value.length > 0) {
        return value;
      }
    }
    return JSON.parse(json);
  } catch (e) {
    return false;
  }
}

export function parseJSON(json) {
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
