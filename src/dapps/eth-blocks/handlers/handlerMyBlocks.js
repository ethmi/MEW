import axios from 'axios';
import { Toast, ERROR } from '@/modules/toast/handler/handlerToast';
import { URL_POST_OWNER, IMAGE_PROXY } from './configs';

class SortedBlocks {
  constructor(blocks) {
    this.oldest = [...blocks];
    this.newest = [...blocks].reverse();
    this.ascend = [...this.sort(blocks)];
    this.dscend = [...this.ascend].reverse();
  }

  sort(_blocks) {
    const newBlocks = [..._blocks];
    return [
      ...newBlocks.sort(function (a, b) {
        return a.block - b.block;
      })
    ];
  }
}
export default class MyBlocks {
  constructor(web3, network, address) {
    /**
     * set up the variables
     */
    this.loading = true;
    this.web3 = web3;
    this.network = network;
    this.address = address;
    this.blocks = {};
    this.totalBlocks = 0;
  }

  /**
   * Get Block Info
   */
  getBlocks() {
    this.loading = true;
    const payload = {
      address: this.address,
      chainId: this.network.type.chainID
    };
    return axios
      .post(URL_POST_OWNER, payload, {
        header: {
          'Content-Type': 'application/json'
        }
      })
      .then(resp => {
        this.blocks = new SortedBlocks(
          resp.data.tokens.map(item => {
            const block = item;
            block.image = `${IMAGE_PROXY}${item.image}`;
            return block;
          })
        );
        this.totalBlocks = resp.data.tokens.length;
        this.loading = false;
      })
      .catch(err => {
        this.loading = false;
        Toast(err, {}, ERROR);
      });
  }
}
