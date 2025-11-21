import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { View, BackHandler, TouchableOpacity, StyleSheet } from 'react-native'
import MusicList, { type MusicListType } from './MusicList'
import { type ListInfoItem } from '@/store/songlist/state'
import { ListInfoContext } from './state'
import ActionBar from './ActionBar'
import Image from '@/components/common/Image'
import Text from '@/components/common/Text'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import { confirmDialog, createStyle, toast } from '@/utils/tools'
import { scaleSizeW } from '@/utils/pixelRatio'
import { useTheme } from '@/store/theme/hook'
import { BorderWidths } from '@/theme'
import { pop } from '@/navigation'
import commonState from '@/store/common/state'
import { Icon } from '@/components/common/Icon'
import { useIsWyPlaylistSubscribed, useWySubscribedPlaylists, useWyUid } from '@/store/user/hook'
import wyApi from '@/utils/musicSdk/wy/user'
import { addWySubscribedPlaylist, removeWySubscribedPlaylist } from '@/store/user/action'
import { COMPONENT_IDS } from '@/config/constant'
import Menu, { type MenuType } from '@/components/common/Menu'
import PlaylistEditModal, { type PlaylistEditModalType } from '../Home/Views/MyPlaylist/PlaylistEditModal'
import { type DetailInfo } from "@/screens/SonglistDetail/Header.tsx"
import playerState from '@/store/player/state'
import { LIST_IDS } from '@/config/constant'
import listState from '@/store/list/state'
import {usePlayerMusicInfo} from "@/store/player/hook.ts"
import MusicInfoOnline = LX.Music.MusicInfoOnline

const IMAGE_WIDTH = scaleSizeW(70)

const ListHeader = ({ detailInfo, info, onBack }: { detailInfo: DetailInfo, info: ListInfoItem, onBack: () => void }) => {
  const theme = useTheme()
  const loggedInUserId = useWyUid()
  const isSubscribed = useIsWyPlaylistSubscribed(info.id)
  const moreBtnRef = useRef<TouchableOpacity>(null)
  const menuRef = useRef<MenuType>(null)
  const playlistEditModalRef = useRef<PlaylistEditModalType>(null)
  const [isMenuVisible, setMenuVisible] = useState(false)

  const isCreator = useMemo(() => {
    return info.source === 'wy' &&
      detailInfo.userId &&
      String(detailInfo.userId) === String(loggedInUserId)
  }, [info.source, detailInfo.userId, loggedInUserId])

  const showSubscribeButton = useMemo(() => {
    return info.source === 'wy' && !isCreator
  }, [info.source, isCreator])

  const toggleSubscribe = useCallback(() => {
    const newSubState = !isSubscribed
    wyApi.subPlaylist(String(info.id), newSubState).then(() => {
      toast(newSubState ? '收藏成功' : '取消收藏成功')
      if (newSubState) {
        addWySubscribedPlaylist({
          id: info.id,
          userId: detailInfo.userId as number,
          name: detailInfo.name,
          coverImgUrl: detailInfo.imgUrl || '',
          trackCount: info.total || 0,
        })
      } else {
        removeWySubscribedPlaylist(info.id)
      }
    }).catch(err => {
      toast(`操作失败: ${err.message}`)
    })
  }, [isSubscribed, info, detailInfo])

  const showMenu = () => {
    moreBtnRef.current?.measure((fx, fy, width, height, px, py) => {
      const position = { x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) }
      setMenuVisible(true)
      requestAnimationFrame(() => {
        menuRef.current?.show(position)
      })
    })
  }

  const handleMenuPress = ({ action }: { action: 'edit' | 'delete' }) => {
    setMenuVisible(false)
    switch (action) {
      case 'edit':
        playlistEditModalRef.current?.show({
          id: String(info.id),
          name: detailInfo.name,
          desc: detailInfo.desc,
        })
        break
      case 'delete':
        confirmDialog({
          message: `确定要删除歌单“${detailInfo.name}”吗？`,
          confirmButtonText: '删除',
        }).then(confirm => {
          if (!confirm) return
          wyApi.deletePlaylist(info.id).then(() => {
            toast('删除成功')
            removeWySubscribedPlaylist(info.id)
            onBack()
          }).catch(err => {
            toast(`删除失败: ${err.message}`)
          })
        })
        break
    }
  }

  return (
    <>
      <View style={{ ...styles.listHeaderContainer, borderBottomColor: theme['c-border-background'] }}>
        <View style={{ flexDirection: 'row', flexGrow: 0, flexShrink: 0, padding: 10 }}>
          <View style={{ ...styles.listItemImg, width: IMAGE_WIDTH, height: IMAGE_WIDTH }}>
            <Image
              nativeID={`${NAV_SHEAR_NATIVE_IDS.songlistDetail_pic}_to_${info.id}`}
              url={detailInfo.imgUrl}
              style={{ flex: 1, borderRadius: 4 }}
            />
          </View>
          <View
            style={{ flexDirection: 'column', flexGrow: 1, flexShrink: 1, paddingLeft: 5 }}
            nativeID={NAV_SHEAR_NATIVE_IDS.songlistDetail_title}
          >
            <Text size={14} numberOfLines={1}>
              {detailInfo.name}
            </Text>
            <View style={styles.descContainer}>
              <View style={{ flexGrow: 1, flexShrink: 1 }}>
                <Text size={13} color={theme['c-font-label']} numberOfLines={4}>
                  {detailInfo.desc}
                </Text>
              </View>
              {showSubscribeButton && (
                <TouchableOpacity style={styles.subscribeButton} onPress={toggleSubscribe}>
                  <Icon name={isSubscribed ? 'love-filled' : 'love'} color={isSubscribed ? theme['c-liked'] : theme['c-font-label']} size={20} />
                </TouchableOpacity>
              )}
              {isCreator && (
                <TouchableOpacity ref={moreBtnRef} style={styles.subscribeButton} onPress={showMenu}>
                  <Icon name="dots-vertical" color={theme['c-font-label']} size={20} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        <ActionBar onBack={onBack} />
      </View>
      {isCreator && isMenuVisible && (
        <Menu
          ref={menuRef}
          menus={[{ action: 'edit', label: '编辑' }, { action: 'delete', label: '删除' }]}
          onPress={handleMenuPress}
          onHide={() => setMenuVisible(false)}
        />
      )}
      <PlaylistEditModal ref={playlistEditModalRef} />
    </>
  )
}

export default ({ info, onBack, initialScrollToInfo }: { info: ListInfoItem, onBack?: () => void, initialScrollToInfo: MusicInfoOnline | null }) => {
  const musicListRef = useRef<MusicListType>(null)
  const [detailInfo, setDetailInfo] = useState<DetailInfo>({
    name: info.name,
    desc: info.desc || '',
    playCount: info.play_count || '',
    imgUrl: info.img,
    userId: info.userId,
    total: Number(info.total) || 0,
  })
  const playlists = useWySubscribedPlaylists()
  const isInitialMount = useRef(true)
  const loggedInUserId = useWyUid()
  const playerMusicInfo = usePlayerMusicInfo()
  const initialScrollDoneRef = useRef(false)

  const handleBack = onBack

  const refreshList = useCallback((isRefresh = false) => {
    musicListRef.current?.loadList(info.source, info.id, isRefresh).then(setDetailInfo)
  }, [info.source, info.id])

  useEffect(() => {
    const handleJumpPosition = () => {
      let listId = playerState.playMusicInfo.listId
      if (listId === LIST_IDS.TEMP) listId = listState.tempListMeta.id
      if (listId !== `${info.source}__${info.id}`) return
      const musicInfo = playerState.playMusicInfo.musicInfo
      if (musicInfo) {
        musicListRef.current?.scrollToInfo(musicInfo as LX.Music.MusicInfoOnline)
      }
    }
    global.app_event.on('jumpListPosition', handleJumpPosition)
    return () => {
      global.app_event.off('jumpListPosition', handleJumpPosition)
    }
  }, [info.id, info.source])

  useEffect(() => {
    refreshList()
  }, [refreshList])

  useEffect(() => {
    const handlePlaylistUpdate = ({ source, listId }: { source: string, listId: string }) => {
      if (info.source === source && String(info.id) === String(listId)) {
        console.log(`歌单详情页 ${listId} 收到更新事件，正在刷新...`)
        refreshList(true)
      }
    }
    global.app_event.on('playlist_updated', handlePlaylistUpdate)
    return () => {
      global.app_event.off('playlist_updated', handlePlaylistUpdate)
    }
  }, [info.id, info.source, refreshList])

  useEffect(() => {
    const onBackPress = () => {
      // 获取状态管理中记录的最后一个（即最顶层）屏幕信息
      const lastScreen = commonState.componentIds[commonState.componentIds.length - 1]

      // 如果最顶层的屏幕不是 Home 屏幕，则意味着有其他屏幕（如歌手详情页）被 push 到栈顶
      // 此时不应处理返回事件，应交由 react-native-navigation 默认处理（即 pop 顶层屏幕）
      if (lastScreen && lastScreen.name !== COMPONENT_IDS.home) {
        return false
      }

      // 否则，处理返回事件，关闭当前的歌单详情浮层
      handleBack()
      return true
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress)
    return () => subscription.remove()
  }, [handleBack])

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    const updatedPlaylist = playlists.find(p => String(p.id) === String(info.id))
    if (!updatedPlaylist) {
      return
    }
    if (updatedPlaylist.name !== detailInfo.name || updatedPlaylist.description !== detailInfo.desc && updatedPlaylist.description != null) {
      console.log('歌单详情页检测到名称或描述变化，正在更新UI...')
      setDetailInfo(prev => ({
        ...prev,
        name: updatedPlaylist.name,
        desc: updatedPlaylist.description || '',
      }))
    }
  }, [playlists, handleBack, info.id, detailInfo.name, detailInfo.desc])

  useEffect(() => {
    if (initialScrollToInfo && detailInfo.total > 0 && !initialScrollDoneRef.current) {
      initialScrollDoneRef.current = true
      setTimeout(() => {
        musicListRef.current?.scrollToInfo(initialScrollToInfo)
      }, 300)
    }
  }, [detailInfo.total, initialScrollToInfo])

  const ListHeaderComponent = useMemo(() => <ListHeader detailInfo={detailInfo} info={info} onBack={handleBack} />, [detailInfo, info, handleBack])

  const isCreator = useMemo(() => {
    return info.source === 'wy' &&
      detailInfo.userId &&
      String(detailInfo.userId) === String(loggedInUserId)
  }, [info.source, detailInfo.userId, loggedInUserId])

  const handleListUpdate = useCallback((newList: LX.Music.MusicInfoOnline[]) => {
    setDetailInfo(prev => ({
      ...prev,
      total: newList.length,
    }))
  }, [])

  return (
    <View style={{ flex: 1 }}>
      <ListInfoContext.Provider value={info}>
        {ListHeaderComponent}
        <MusicList ref={musicListRef} playingId={playerMusicInfo.id} componentId={commonState.componentIds[commonState.componentIds.length - 1]?.id} isCreator={isCreator} onListUpdate={handleListUpdate} />
      </ListInfoContext.Provider>
    </View>
  )
}

const styles = createStyle({
  listHeaderContainer: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
    borderBottomWidth: BorderWidths.normal,
  },
  listItemImg: {
    flexGrow: 0,
    flexShrink: 0,
    overflow: 'hidden',
  },
  playCount: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    fontSize: 12,
    paddingLeft: 3,
    paddingRight: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: '#fff',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  descContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    flexShrink: 1,
  },
  subscribeButton: {
    paddingLeft: 10,
    paddingRight: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
