import { memo, useEffect, useRef, useState, useCallback } from 'react'
import { View } from 'react-native'
import PageContent from '@/components/PageContent'
import Header from './Header'
import OnlineList, { type OnlineListType } from '@/components/OnlineList'
import wyApi from '@/utils/musicSdk/wy/album'
import { toast } from '@/utils/tools'
import { setComponentId } from '@/core/common'
import PlayerBar from '@/components/player/PlayerBar'
import { createStyle } from '@/utils/tools'
import { type ListInfoItem } from '@/store/songlist/state'
import { playOnlineList } from '@/core/list'
import {COMPONENT_IDS} from "@/config/constant.ts";

export default memo(({ componentId, albumInfo }: { componentId: string; albumInfo: ListInfoItem }) => {
  const [albumDetail, setAlbumDetail] = useState({ info: null, list: [] });
  const listRef = useRef<OnlineListType>(null);

  useEffect(() => {
    setComponentId(COMPONENT_IDS.ALBUM_DETAIL_SCREEN, componentId);
    listRef.current?.setStatus('loading');
    wyApi.getAlbum(albumInfo.id).then(data => {
      setAlbumDetail(data);
      listRef.current?.setList(data.list);
      listRef.current?.setStatus('idle');
    }).catch(() => {
      toast('获取专辑信息失败');
      listRef.current?.setStatus('error');
    });
  }, [componentId, albumInfo.id]);

  const onRefresh = useCallback(() => {
    listRef.current?.setStatus('refreshing');
    wyApi.getAlbum(albumInfo.id).then(data => {
      setAlbumDetail(data);
      listRef.current?.setList(data.list);
      listRef.current?.setStatus('idle');
    }).catch(() => {
      toast('刷新专辑信息失败');
      listRef.current?.setStatus('error');
    });
  }, [albumInfo.id]);

  const onPlayList = useCallback((index: number) => {
    if (!albumDetail.list.length) return;
    const listId = `album_${albumInfo.id}`;
    void playOnlineList(listId, albumDetail.list, index);
  }, [albumDetail.list, albumInfo.id]);

  const handleListUpdate = useCallback((newList: LX.Music.MusicInfoOnline[]) => {
    setAlbumDetail(prev => ({
      ...prev,
      list: newList,
    }));
  }, []);
  return (
    <PageContent>
      <View style={styles.container}>
        <Header albumInfo={albumDetail.info || albumInfo} componentId={componentId} />
        <OnlineList componentId={componentId}
          ref={listRef}
          listId='album'
          forcePlayList={true}
          onPlayList={onPlayList}
          onLoadMore={() => {}}
          onRefresh={onRefresh}
          onListUpdate={handleListUpdate}
        />
        <PlayerBar componentId={componentId} />
      </View>
    </PageContent>
  )
});

const styles = createStyle({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
})
