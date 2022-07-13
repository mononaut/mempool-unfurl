const configFile = require('../config.json');

interface IConfig {
  SERVER: {
    HOST: 'http://localhost';
    HTTP_PORT: number;
  };
  MEMPOOL: {
    HTTP_HOST: string;
    HTTP_PORT: number;
  };
  PUPPETEER: {
    CLUSTER_SIZE: number;
  };
}

const defaults: IConfig = {
  'SERVER': {
    'HOST': 'http://localhost',
    'HTTP_PORT': 4201,
  },
  'MEMPOOL': {
    'HTTP_HOST': 'http://localhost',
    'HTTP_PORT': 4200,
  },
  'PUPPETEER': {
    'CLUSTER_SIZE': 1,
  },
};

class Config implements IConfig {
  SERVER: IConfig['SERVER'];
  MEMPOOL: IConfig['MEMPOOL'];
  PUPPETEER: IConfig['PUPPETEER'];

  constructor() {
    const configs = this.merge(configFile, defaults);
    this.SERVER = configs.SERVER;
    this.MEMPOOL = configs.MEMPOOL;
    this.PUPPETEER = configs.PUPPETEER;
  }

  merge = (...objects: object[]): IConfig => {
    // @ts-ignore
    return objects.reduce((prev, next) => {
      Object.keys(prev).forEach(key => {
        next[key] = { ...next[key], ...prev[key] };
      });
      return next;
    });
  }
}

export default new Config();
