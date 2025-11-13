import { search } from './api';
import { formatSingerName } from '../utils';

const parseSearchResult = (raw) => {
  const contents = raw?.contents?.tabbedSearchResultsRenderer?.tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents;
  if (!contents) return [];

  let songs = [];
  for (const section of contents) {
    const shelf = section.musicShelfRenderer;
    if (shelf && shelf.contents) {
      for (const item of shelf.contents) {
        const renderer = item.musicResponsiveListItemRenderer;
        if (!renderer || !renderer.playlistItemData) continue;

        const videoId = renderer.playlistItemData.videoId;
        const title = renderer.flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs[0]?.text || '';

        const artists = renderer.flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs
          .filter(run => run.navigationEndpoint)
          .map(run => ({ id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text })) || [];

        const album = renderer.flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs
          .find(run => run.navigationEndpoint?.browseEndpoint?.browseId?.startsWith('MPREb_')) || null;

        const durationRuns = renderer.flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
        const durationText = durationRuns[durationRuns.length - 1]?.text;

        const thumbnails = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];

        const musicInfo = {
          id: `yt_${videoId}`,
          songmid: videoId,
          name: title,
          singer: formatSingerName(artists, 'name'),
          artists,
          albumName: album?.text || '',
          albumId: album?.navigationEndpoint.browseEndpoint.browseId || '',
          img: thumbnails[thumbnails.length - 1]?.url || null,
          interval: durationText || '0:00',
          source: 'yt',
          types: [],
          _types: {},
          typeUrl: {},
          lrc: null,
          meta: {
            songId: videoId,
            albumName: album?.text || '',
            albumId: album?.navigationEndpoint.browseEndpoint.browseId || '',
            picUrl: thumbnails[thumbnails.length - 1]?.url || null,
            qualitys: [],
            _qualitys: {},
            fee: 0,
          },
        };
        songs.push(musicInfo);
      }
    }
  }
  return songs;
};

export default {
  limit: 30,
  search(keyword, page = 1) {
    return search(keyword).then(({ body }) => {
      const list = parseSearchResult(body);
      return Promise.resolve({
        list,
        allPage: 1,
        limit: this.limit,
        total: list.length,
        source: 'yt',
      });
    });
  },
};
