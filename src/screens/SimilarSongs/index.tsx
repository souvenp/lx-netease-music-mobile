import {memo, useEffect, useRef, useCallback, useState} from 'react';
import { View } from 'react-native';
import PageContent from '@/components/PageContent';
import Header from './Header';
import OnlineList, { type OnlineListType } from '@/components/OnlineList';
import { toast, createStyle } from '@/utils/tools';
import { setComponentId } from '@/core/common';
import PlayerBar from '@/components/player/PlayerBar';
import { playOnlineList } from '@/core/list';
import { usePlayerMusicInfo } from '@/store/player/hook';


export default memo(({ componentId, similarSongs: initialSimilarSongs }: { componentId: string, similarSongs: LX.Music.MusicInfoOnline[] }) => {
  const listRef = useRef<OnlineListType>(null);
  const playerMusicInfo = usePlayerMusicInfo();
  const [similarSongs, setSimilarSongs] = useState(initialSimilarSongs)

  useEffect(() => {
    setComponentId('SIMILAR_SONGS_SCREEN', componentId);
    if (similarSongs && similarSongs.length) {
      listRef.current?.setList(similarSongs);
      listRef.current?.setStatus('end');
    } else {
      listRef.current?.setList([]);
      listRef.current?.setStatus('end');
      toast('没有找到相似歌曲');
    }
  }, [componentId, similarSongs]);

  const onPlayList = useCallback((index: number) => {
    if (!similarSongs || !similarSongs.length) return;
    const listId = 'similar_songs_list';
    void playOnlineList(listId, similarSongs, index);
  }, [similarSongs]);

  const handleListUpdate = useCallback((newList: LX.Music.MusicInfoOnline[]) => {
    setSimilarSongs(newList);
  }, []);

  return (
    <PageContent>
      <View style={styles.container}>
        <Header componentId={componentId} title="相似歌曲推荐" />
        <OnlineList
          ref={listRef}
          listId="dailyrec_wy"
          forcePlayList={true}
          playingId={playerMusicInfo.id}
          onPlayList={onPlayList}
          onLoadMore={() => {}}
          onRefresh={() => {}}
          onListUpdate={handleListUpdate}
        />
        <PlayerBar />
      </View>
    </PageContent>
  );
});

const styles = createStyle({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
});
