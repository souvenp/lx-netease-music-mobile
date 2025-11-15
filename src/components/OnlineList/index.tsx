import {useRef, forwardRef, useImperativeHandle, useCallback} from 'react'
import { View } from 'react-native'
import List, { type ListProps, type ListType, type Status, type RowInfoType } from './List'
import ListMenu, { type ListMenuType, type Position, type SelectInfo } from './ListMenu'
import ListMusicMultiAdd, {
  type MusicMultiAddModalType as ListAddMultiType,
} from '@/components/MusicMultiAddModal'
import ListMusicAdd, {
  type MusicAddModalType as ListMusicAddType,
} from '@/components/MusicAddModal'
import MultipleModeBar, { type MultipleModeBarType, type SelectMode } from './MultipleModeBar'
import {
  handleDislikeMusic,
  handlePlay,
  handlePlayLater,
  handleShare,
  handleShowMusicSourceDetail,
  handleShowArtistDetail,
  handleShowAlbumDetail,
  handleLikeMusic,
} from './listAction'
import MusicDownloadModal, {
  type MusicDownloadModalType,
} from '@/screens/Home/Views/Mylist/MusicList/MusicDownloadModal'
import {createStyle, toast} from '@/utils/tools'
import wyApi from '@/utils/musicSdk/wy/user'
import {batchDownload} from "@/core/download.ts"
import {getMvUrl} from "@/utils/musicSdk/wy/mv.js"
import {useI18n} from "@/lang";
import {updateWySubscribedPlaylistTrackCount} from "@/store/user/action.ts";
import {clearListDetailCache} from "@/core/songlist.ts";

export interface OnlineListProps {
  onRefresh: ListProps['onRefresh']
  onLoadMore: ListProps['onLoadMore']
  onPlayList?: ListProps['onPlayList']
  progressViewOffset?: ListProps['progressViewOffset']
  ListHeaderComponent?: ListProps['ListHeaderComponent']
  ListFooterComponent?: ListProps['ListFooterComponent']
  checkHomePagerIdle?: boolean
  rowType?: RowInfoType
  listId?: string
  playingId?: string | null
  forcePlayList?: boolean
  onListUpdate?: ListProps['onListUpdate']
  isCreator?: boolean
}
export interface OnlineListType {
  setList: (list: LX.Music.MusicInfoOnline[], isAppend?: boolean, showSource?: boolean) => void
  setStatus: (val: Status) => void
  getList: () => LX.Music.MusicInfoOnline[]
}

export default forwardRef<OnlineListType, OnlineListProps>(
  (
    {
      onRefresh,
      onLoadMore,
      onPlayList,
      progressViewOffset,
      ListHeaderComponent,
      ListFooterComponent,
      checkHomePagerIdle = false,
      rowType,
      listId,
      playingId,
      forcePlayList,
      onListUpdate,
      isCreator = false,
    },
    ref
  ) => {
    const listRef = useRef<ListType>(null)
    const multipleModeBarRef = useRef<MultipleModeBarType>(null)
    const listMusicAddRef = useRef<ListMusicAddType>(null)
    const listMusicMultiAddRef = useRef<ListAddMultiType>(null)
    const listMenuRef = useRef<ListMenuType>(null)
    const musicDownloadModalRef = useRef<MusicDownloadModalType>(null)
    const t = useI18n()

    useImperativeHandle(ref, () => ({
      setList(list, isAppend = false, showSource = false) {
        listRef.current?.setList(list, isAppend, showSource)
        multipleModeBarRef.current?.setIsSelectAll(false)
      },
      setStatus(val) {
        listRef.current?.setStatus(val)
      },
      getList() {
        return listRef.current?.getList() ?? []
      },
    }))

    const hancelMultiSelect = () => {
      multipleModeBarRef.current?.show()
      listRef.current?.setIsMultiSelectMode(true)
    }
    const hancelSwitchSelectMode = (mode: SelectMode) => {
      multipleModeBarRef.current?.setSwitchMode(mode)
      listRef.current?.setSelectMode(mode)
    }
    const hancelExitSelect = () => {
      multipleModeBarRef.current?.exitSelectMode()
      listRef.current?.setIsMultiSelectMode(false)
    }

    const handleBatchDownload = useCallback(() => {
      const selectedList = listRef.current?.getSelectedList() ?? [];
      if (!selectedList.length) return;
      void batchDownload(selectedList);
      hancelExitSelect();
    }, [hancelExitSelect]);

    const showMenu = (musicInfo: LX.Music.MusicInfoOnline, index: number, position: Position) => {
      listMenuRef.current?.show(
        {
          musicInfo,
          index,
          single: false,
          selectedList: listRef.current!.getSelectedList(),
        },
        position
      )
    }
    const handleAddMusic = (info: SelectInfo) => {
      if (info.selectedList.length) {
        listMusicMultiAddRef.current?.show({
          selectedList: info.selectedList,
          listId: '',
          isMove: false,
        })
      } else {
        listMusicAddRef.current?.show({ musicInfo: info.musicInfo, listId: '', isMove: false })
      }
    }
    const handleShowArtist = (info: SelectInfo) => {
      void handleShowArtistDetail(info.musicInfo)
    }
    const handleShowAlbum = (info: SelectInfo) => {
      handleShowAlbumDetail(info.musicInfo)
    }

    const handlePlayMv = useCallback((info: SelectInfo) => {
      const mvId = info.musicInfo.meta.mv;
      if (!mvId) return;
      getMvUrl(mvId).then(data => {
        global.app_event.showVideoPlayer(data.url);
      }).catch(err => {
        toast(err.message || '获取MV失败');
      });
    }, []);


    const handleMoveMusic = (info: SelectInfo) => {
      if (info.selectedList.length) {
        listMusicMultiAddRef.current?.show({ selectedList: info.selectedList, listId: listId!, isMove: true });
      } else {
        listMusicAddRef.current?.show({ musicInfo: info.musicInfo, listId: listId!, isMove: true });
      }
    };

    const handleRemoveMusic = useCallback((info: SelectInfo) => {
      if (!listId) return;
      const playlistId = listId.replace('wy__', '');
      const musicInfos = info.selectedList.length ? info.selectedList : [info.musicInfo];
      const songIds = musicInfos.map(m => m.meta.songId);

      wyApi.manipulatePlaylistTracks('del', playlistId, songIds).then(() => {
        toast(t('list_edit_action_tip_remove_success'));
        const currentList = listRef.current?.getList() ?? [];
        const idsToRemove = new Set(musicInfos.map(m => m.id));
        const newList = currentList.filter(m => !idsToRemove.has(m.id));
        listRef.current?.setList(newList, false);
        updateWySubscribedPlaylistTrackCount(playlistId, -songIds.length);
        clearListDetailCache('wy', playlistId)
        global.app_event.playlist_updated({ source: 'wy', listId: playlistId })
        hancelExitSelect();
      }).catch(err => {
        toast('移除失败: ' + err.message);
      });
    }, [listId, hancelExitSelect, t]);

    return (
      <View style={styles.container}>
        <View style={{ flex: 1 }}>
          <List
            ref={listRef}
            listId={listId}
            onShowMenu={showMenu}
            onMuiltSelectMode={hancelMultiSelect}
            onSelectAll={(isAll) => multipleModeBarRef.current?.setIsSelectAll(isAll)}
            onRefresh={onRefresh}
            onLoadMore={onLoadMore}
            onPlayList={onPlayList}
            progressViewOffset={progressViewOffset}
            ListHeaderComponent={ListHeaderComponent}
            ListFooterComponent={ListFooterComponent}
            checkHomePagerIdle={checkHomePagerIdle}
            rowType={rowType}
            playingId={playingId}
            forcePlayList={forcePlayList}
            onListUpdate={onListUpdate}
          />
          <MultipleModeBar
            ref={multipleModeBarRef}
            onSwitchMode={hancelSwitchSelectMode}
            onSelectAll={(isAll) => listRef.current?.selectAll(isAll)}
            onExitSelectMode={hancelExitSelect}
            onDownload={handleBatchDownload}
          />
          <MusicDownloadModal ref={musicDownloadModalRef} onDownloadInfo={(info) => {}} />
        </View>
        <ListMusicAdd
          ref={listMusicAddRef}
          onAdded={hancelExitSelect}
        />
        <ListMusicMultiAdd
          ref={listMusicMultiAddRef}
          onAdded={hancelExitSelect}
        />
        <ListMenu
          ref={listMenuRef}
          listId={listId}
          isCreator={isCreator}
          onPlay={(info) => {
            handlePlay(info.musicInfo)
          }}
          onPlayLater={(info) => {
            hancelExitSelect()
            handlePlayLater(info.musicInfo, info.selectedList, hancelExitSelect)
          }}
          onCopyName={(info) => {
            handleShare(info.musicInfo)
          }}
          onAdd={handleAddMusic}
          onMove={handleMoveMusic}
          onRemove={handleRemoveMusic}
          onArtistDetail={handleShowArtist}
          onAlbumDetail={handleShowAlbum}
          onMusicSourceDetail={(info) => {
            void handleShowMusicSourceDetail(info.musicInfo)
          }}
          onDislikeMusic={(info) => {
            void handleDislikeMusic(info.musicInfo, listId)
          }}
          onDownload={(info) => musicDownloadModalRef.current?.show(info.musicInfo)}
          onLike={(info) => {
            handleLikeMusic(info.musicInfo)
          }}
          onPlayMv={handlePlayMv}
        />
        {}
      </View>
    )
  }
)

const styles = createStyle({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  list: {
    flex: 1,
  },
  exitMultipleModeBtn: {
    height: 40,
  },
})
