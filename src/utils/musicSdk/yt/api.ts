import { httpFetch } from '@/utils/request';
import settingState from '@/store/setting/state';
import { toMD5 } from '@/utils/tools';

const ORIGIN = "https://www.youtube.com";

// 从 InnerTube.kt 翻译过来的 SAPISIDHASH 算法
const generateSapisidHash = (sapisid: string): string => {
  const timestamp = Math.floor(Date.now() / 1000);
  const hash = toMD5(`${timestamp} ${sapisid} ${ORIGIN}`);
  return `${timestamp}_${hash}`;
};

const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'x-origin': ORIGIN,
    'Referer': ORIGIN + '/',
  };

  const cookie = settingState.setting['common.yt_cookie'];
  if (cookie) {
    headers.Cookie = cookie;
    const sapisidMatch = cookie.match(/SAPISID=([^;]+)/);
    if (sapisidMatch && sapisidMatch[1]) {
      headers.Authorization = `SAPISIDHASH ${generateSapisidHash(sapisidMatch[1])}`;
    }
  }
  return headers;
};

const buildContext = () => ({
  client: {
    clientName: "WEB_REMIX",
    clientVersion: "1.20210721.00.00",
    "hl": "en",
    "gl": "US"
  },
  "user": {},
  "request": {}
});

export const search = (query: string) => {
  const url = `https://www.youtube.com/youtubei/v1/search`;
  const payload = {
    context: buildContext(),
    query,
  };
  console.log(payload)
  return httpFetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: payload,
  }).promise;
};
