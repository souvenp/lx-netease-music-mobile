import musicSearch from './musicSearch';

const getMusicUrl = (songInfo, type) => {
  const requestObj = {};

  const proxyUrl = `http://1.1.1.1:3000/getYouTubeUrl?videoId=${songInfo.songmid}`;

  requestObj.promise = fetch(proxyUrl)
    .then(response => {
      if (!response.ok) {
        return response.json().then(err => {
          throw new Error(err.error || 'Proxy server returned an error');
        });
      }
      return response.json();
    })
    .then(data => {
      if (!data.url) {
        throw new Error('Proxy server did not return a valid URL.');
      }
      return {
        url: data.url,
        type: type,
      };
    });

  return requestObj;
};

export default {
  musicSearch,
  getMusicUrl,
  getLyric(songInfo) {
    const requestObj = {};
    requestObj.promise = Promise.resolve({ lyric: '[00:00.000]暂无歌词', tlyric: '' });
    return requestObj;
  },
  getPic(songInfo) {
    const requestObj = {};
    requestObj.promise = Promise.resolve(songInfo.img);
    return requestObj;
  },
};
