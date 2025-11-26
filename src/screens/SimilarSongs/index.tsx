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
import playerState from '@/store/player/state';
import listState from '@/store/list/state';
import {LIST_IDS} from "@/config/constant.ts";

export default memo(({ componentId, similarSongs: initialSimilarSongs }: { componentId: string, similarSongs: LX.Music.MusicInfoOnline[] }) => {
  const listRef = useRef<OnlineListType>(null);
  const playerMusicInfo = usePlayerMusicInfo();
  const [similarSongs, setSimilarSongs] = useState(initialSimilarSongs)

  useEffect(() => {
    const handleJumpPosition = () => {
      let listId = playerState.playMusicInfo.listId;
      if (listId === LIST_IDS.TEMP) listId = listState.tempListMeta.id;
      if (listId !== 'similar_songs_list') return;

      const musicInfo = playerState.playMusicInfo.musicInfo;
      if (musicInfo) {
        listRef.current?.scrollToInfo(musicInfo as LX.Music.MusicInfoOnline);
      }
    };
    global.app_event.on('jumpListPosition', handleJumpPosition);
    return () => {
      global.app_event.off('jumpListPosition', handleJumpPosition);
    };
  }, [])

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
        <OnlineList componentId={componentId}
                    ref={listRef}
                    listId="dailyrec_wy"
                    forcePlayList={true}
                    playingId={playerMusicInfo.id}
                    onPlayList={onPlayList}
                    onLoadMore={() => {}}
                    onRefresh={() => {}}
                    onListUpdate={handleListUpdate}
        />
        <PlayerBar componentId={componentId} />
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
