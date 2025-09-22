// 文件路径: src/components/player/PlayerPlaylist.tsx

import { forwardRef, useImperativeHandle, useRef, useState, useEffect, useCallback, memo } from 'react'
import Popup, { type PopupType } from '@/components/common/Popup'
import { useI18n } from '@/lang'
import { FlatList, View, TouchableOpacity } from 'react-native'
import Text from '@/components/common/Text'
import Image from '@/components/common/Image'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import playerState from '@/store/player/state'
import { getListMusicSync } from '@/utils/listManage'
import { usePlayInfo, usePlayerMusicInfo } from '@/store/player/hook'
import { playList } from '@/core/player/player'
import { createStyle } from '@/utils/tools'
import { scaleSizeH } from '@/utils/pixelRatio'
import { LIST_ITEM_HEIGHT } from '@/config/constant'
import { useIsWyLiked } from '@/store/user/hook'
import {
  handleShare,
  handleUpdateMusicInfo,
} from '@/screens/Home/Views/Mylist/MusicList/listAction'
import ListMenu, { type ListMenuType, type Position, type SelectInfo } from '@/screens/Home/Views/Mylist/MusicList/ListMenu'
import MusicAddModal, { type MusicAddModalType } from '@/components/MusicAddModal'
import MetadataEditModal, { type MetadataEditType, type MetadataEditProps } from '@/components/MetadataEditModal'
import MusicToggleModal, { type MusicToggleModalType } from '@/screens/Home/Views/Mylist/MusicList/MusicToggleModal'
import { useSettingValue } from '@/store/setting/hook'
import Badge, { type BadgeType } from '@/components/common/Badge'
import {
  handleDislikeMusic,
  handleLikeMusic,
  handleShowAlbumDetail,
  handleShowArtistDetail
} from "@/components/OnlineList/listAction.ts";

export interface PlayerPlaylistType {
  show: () => void
}

const useQualityTag = (musicInfo: LX.Music.MusicInfoOnline) => {
  const t = useI18n()
  let info: { type: BadgeType | null; text: string } = { type: null, text: '' }
  if (musicInfo.meta._qualitys.hires) {
    info.type = 'secondary'
    info.text = t('quality_lossless_24bit')
  } else if (musicInfo.meta._qualitys.flac) {
    info.type = 'sq'
    info.text = t('quality_lossless')
  } else if (musicInfo.meta._qualitys['320k']) {
    info.type = 'tertiary'
    info.text = t('quality_high_quality')
  }
  return info
}


const PlaylistItem = memo(({ item, index, activeId, onPress, onShowMenu, onLike }: {
  item: LX.Player.PlayMusic,
  index: number,
  activeId: string | null,
  onPress: (index: number) => void,
  onShowMenu: (musicInfo: LX.Music.MusicInfo, index: number, position: Position) => void,
  onLike: (musicInfo: LX.Music.MusicInfoOnline) => void
}) => {
  const theme = useTheme()
  const musicInfo = 'progress' in item ? item.metadata.musicInfo : item
  const isActive = musicInfo.id === activeId
  const isShowAlbumName = useSettingValue('list.isShowAlbumName')
  const isLiked = useIsWyLiked(musicInfo.meta.songId)
  const moreButtonRef = useRef<TouchableOpacity>(null)
  const qualityTag = musicInfo.source !== 'local' ? useQualityTag(musicInfo as LX.Music.MusicInfoOnline) : { type: null, text: '' }

  const showLikeButton = musicInfo.source === 'wy'

  const handleShowMenu = () => {
    if (moreButtonRef.current?.measure) {
      moreButtonRef.current.measure((fx, fy, width, height, px, py) => {
        onShowMenu(musicInfo, index, { x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) })
      })
    }
  }

  const singer = `${musicInfo.singer}${isShowAlbumName && musicInfo.meta.albumName ? ` · ${musicInfo.meta.albumName}` : ''}`

  return (
    <View style={{ ...styles.listItem, height: scaleSizeH(LIST_ITEM_HEIGHT), backgroundColor: isActive ? theme['c-primary-background-hover'] : 'transparent' }}>
      <TouchableOpacity style={styles.itemLeft} onPress={() => onPress(index)}>
        <Image url={musicInfo.meta.picUrl} style={styles.artwork} />
        <View style={styles.itemInfo}>
          <Text color={isActive ? theme['c-primary-font'] : theme['c-font']} numberOfLines={1}>
            {musicInfo.name}
            {musicInfo.alias ? <Text color={theme['c-font-label']}> ({musicInfo.alias})</Text> : null}
          </Text>
          <View style={styles.listItemSingle}>
            {qualityTag.type ? <Badge type={qualityTag.type}>{qualityTag.text}</Badge> : null}
            {musicInfo.source !== 'local' && (musicInfo as LX.Music.MusicInfoOnline).meta.fee === 1 ? <Badge type="vip">VIP</Badge> : null}
            <Text
              style={styles.listItemSingleText}
              size={11}
              color={isActive ? theme['c-primary-alpha-200'] : theme['c-500']}
              numberOfLines={1}
            >
              {singer}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
      {showLikeButton && (
        <TouchableOpacity onPress={() => onLike(musicInfo as LX.Music.MusicInfoOnline)} style={styles.likeButton}>
          <Icon name={isLiked ? 'love-filled' : 'love'} size={18} color={isLiked ? theme['c-liked'] : theme['c-font-label']} />
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={handleShowMenu} ref={moreButtonRef} style={styles.moreButton}>
        <Icon name="dots-vertical" style={{ color: theme['c-350'] }} size={12} />
      </TouchableOpacity>
    </View>
  )
})


export default forwardRef<PlayerPlaylistType, {}>((props, ref) => {
  const popupRef = useRef<PopupType>(null)
  const flatListRef = useRef<FlatList>(null)
  const [visible, setVisible] = useState(false)
  const t = useI18n()
  const playerInfo = usePlayInfo()
  const playerMusicInfo = usePlayerMusicInfo()
  const [playlist, setPlaylist] = useState<LX.Player.PlayMusic[]>([])
  const [shouldScroll, setShouldScroll] = useState(false)
  const selectedInfoRef = useRef<SelectInfo>()

  const listMenuRef = useRef<ListMenuType>(null)
  const musicAddModalRef = useRef<MusicAddModalType>(null)
  const metadataEditTypeRef = useRef<MetadataEditType>(null)
  const musicToggleModalRef = useRef<MusicToggleModalType>(null)

  useImperativeHandle(ref, () => ({
    show() {
      if (playerInfo.playerListId) {
        const currentList = getListMusicSync(playerInfo.playerListId)
        setPlaylist(currentList)
        setShouldScroll(true)
      }
      if (visible) {
        popupRef.current?.setVisible(true)
      } else {
        setVisible(true)
      }
    },
  }))

  useEffect(() => {
    if (visible && shouldScroll && playlist.length > 0) {
      const activeIndex = playlist.findIndex(item => ('progress' in item ? item.metadata.musicInfo.id : item.id) === playerMusicInfo.id)
      if (activeIndex > -1) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: activeIndex,
            viewPosition: 0,
            animated: true,
          })
        }, 100)
      }
      setShouldScroll(false)
    }
  }, [visible, shouldScroll, playlist, playerMusicInfo.id])

  useEffect(() => {
    if (visible) {
      requestAnimationFrame(() => {
        popupRef.current?.setVisible(true)
      })
    }
  }, [visible])

  const handlePlay = useCallback((index: number) => {
    if (playerInfo.playerListId) {
      void playList(playerInfo.playerListId, index)
    }
  }, [playerInfo.playerListId])

  const handleShowMenu = useCallback((musicInfo: LX.Music.MusicInfo, index: number, position: Position) => {
    listMenuRef.current?.show({
      musicInfo,
      index,
      listId: playerInfo.playerListId!,
      single: false,
      selectedList: [],
    }, position)
  }, [playerInfo.playerListId])


  const renderItem = ({ item, index }: { item: LX.Player.PlayMusic, index: number }) => (
    <PlaylistItem
      item={item}
      index={index}
      activeId={playerMusicInfo.id}
      onPress={handlePlay}
      onShowMenu={handleShowMenu}
      onLike={handleLikeMusic}
    />
  )

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: scaleSizeH(LIST_ITEM_HEIGHT),
    offset: scaleSizeH(LIST_ITEM_HEIGHT) * index,
    index,
  }), [])

  const handleAddMusic = useCallback((info: SelectInfo) => {
    musicAddModalRef.current?.show({
      musicInfo: info.musicInfo,
      listId: info.listId,
      isMove: false,
    })
  }, [])

  const handleUpdateMetadata = useCallback<MetadataEditProps['onUpdate']>((info) => {
    if (!selectedInfoRef.current || selectedInfoRef.current.musicInfo.source != 'local') return
    handleUpdateMusicInfo(selectedInfoRef.current.listId, selectedInfoRef.current.musicInfo as LX.Music.MusicInfoLocal, info)
  }, [])

  const handleArtistDetail = useCallback((info: SelectInfo) => {
    popupRef.current?.setVisible(false) // 先关闭Popup
    requestAnimationFrame(() => { // 延迟到下一帧再执行导航
      void handleShowArtistDetail(info.musicInfo as LX.Music.MusicInfoOnline)
    })
  }, [])

  const handleAlbumDetail = useCallback((info: SelectInfo) => {
    popupRef.current?.setVisible(false) // 先关闭Popup
    requestAnimationFrame(() => { // 延迟到下一帧再执行导航
      handleShowAlbumDetail(info.musicInfo as LX.Music.MusicInfoOnline)
    })
  }, [])

  return visible
    ? (
      <>
        <Popup ref={popupRef} position="bottom" title={t('list_name_temp')} onHide={() => setVisible(false)}>
          <FlatList
            ref={flatListRef}
            style={styles.list}
            data={playlist}
            renderItem={renderItem}
            keyExtractor={(item, index) => 'progress' in item ? item.id : item.id + index}
            initialNumToRender={10}
            getItemLayout={getItemLayout}
          />
        </Popup>
        <ListMenu
          ref={listMenuRef}
          onAdd={handleAddMusic}
          onRemove={() => {}}
          onDislikeMusic={info => handleDislikeMusic(info.musicInfo)}
          onCopyName={handleShare}
          onDownload={() => {}}
          onEditMetadata={info => {
            if (info.musicInfo.source != 'local') return
            selectedInfoRef.current = info
            metadataEditTypeRef.current?.show(info.musicInfo.meta.filePath)
          }}
          onToggleSource={(info) => musicToggleModalRef.current?.show(info)}
          onArtistDetail={handleArtistDetail}
          onAlbumDetail={handleAlbumDetail}
        />
        <MusicAddModal ref={musicAddModalRef} />
        <MetadataEditModal ref={metadataEditTypeRef} onUpdate={handleUpdateMetadata} />
        <MusicToggleModal ref={musicToggleModalRef} />
      </>
    )
    : null
})

const styles = createStyle({
  list: {
    height: '70%',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 15,
    paddingRight: 5,
  },
  itemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  artwork: {
    width: 45,
    height: 45,
    borderRadius: 4,
  },
  itemInfo: {
    flex: 1,
    paddingLeft: 10,
    paddingRight: 10,
  },
  listItemSingle: {
    paddingTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemSingleText: {
    flexGrow: 0,
    flexShrink: 1,
    fontWeight: '300',
  },
  likeButton: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  moreButton: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
})
