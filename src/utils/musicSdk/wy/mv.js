import { httpFetch } from '../../request';
import { weapi } from './utils/crypto';

export const getMvUrl = (mvId, retryNum = 0) => {
  if (retryNum > 2) return Promise.reject(new Error('try max num'));

  const requestObj = httpFetch('https://music.163.com/weapi/song/enhance/play/mv/url', {
    method: 'post',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
      origin: 'https://music.163.com',
    },
    form: weapi({
      id: mvId,
      r: 1080,
    }),
  });

  return requestObj.promise.then(({ body, statusCode }) => {
    if (statusCode !== 200 || body.code !== 200) {
      return Promise.reject(new Error('获取MV链接失败'));
    }
    if (!body.data.url) {
      return Promise.reject(new Error(body.data.msg || '获取MV链接失败'));
    }
    return body.data;
  });
};
