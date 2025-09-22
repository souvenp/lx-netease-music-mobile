import { useRef, forwardRef, useImperativeHandle } from 'react'
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
import { createStyle } from '@/utils/tools'

export interface OnlineListProps {
  onRefresh: ListProps['onRefresh']
  onLoadMore: ListProps['onLoadMore']
  onPlayList?: ListProps['onPlayList']
  progressViewOffset?: ListProps['progressViewOffset']
  ListHeaderComponent?: ListProps['ListHeaderComponent']
  checkHomePagerIdle?: boolean
  rowType?: RowInfoType
  listId?: string
  playingId?: string | null
  forcePlayList?: boolean
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
      checkHomePagerIdle = false,
      rowType,
      listId,
      playingId,
      forcePlayList,
    },
    ref
  ) => {
    const listRef = useRef<ListType>(null)
    const multipleModeBarRef = useRef<MultipleModeBarType>(null)
    const listMusicAddRef = useRef<ListMusicAddType>(null)
    const listMusicMultiAddRef = useRef<ListAddMultiType>(null)
    const listMenuRef = useRef<ListMenuType>(null)
    const musicDownloadModalRef = useRef<MusicDownloadModalType>(null)

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
            checkHomePagerIdle={checkHomePagerIdle}
            rowType={rowType}
            playingId={playingId}
            forcePlayList={forcePlayList}
          />
          <MultipleModeBar
            ref={multipleModeBarRef}
            onSwitchMode={hancelSwitchSelectMode}
            onSelectAll={(isAll) => listRef.current?.selectAll(isAll)}
            onExitSelectMode={hancelExitSelect}
          />
          <MusicDownloadModal ref={musicDownloadModalRef} onDownloadInfo={(info) => {}} />
        </View>
        <ListMusicAdd
          ref={listMusicAddRef}
          onAdded={() => {
            hancelExitSelect()
          }}
        />
        <ListMusicMultiAdd
          ref={listMusicMultiAddRef}
          onAdded={() => {
            hancelExitSelect()
          }}
        />
        <ListMenu
          ref={listMenuRef}
          listId={listId}
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
