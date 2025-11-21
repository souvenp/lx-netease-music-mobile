import {forwardRef, useEffect, useImperativeHandle, useRef, useState} from 'react'
import Dialog, { type DialogType } from '@/components/common/Dialog'
import { toast } from '@/utils/tools'
import Title from './Title'
import List from './List'
import { useI18n } from '@/lang'
import { addListMusics, moveListMusics } from '@/core/list'
import settingState from '@/store/setting/state'
import { useTheme } from '@/store/theme/hook'
import Button from '@/components/common/Button'
import { getPlaylistType, savePlaylistType } from '@/utils/data'
import wyApi from '@/utils/musicSdk/wy/user'
import { updateWySubscribedPlaylistTrackCount } from '@/store/user/action'
import { clearListDetailCache } from '@/core/songlist'
import {Text, View} from "react-native";

export interface SelectInfo {
  selectedList: LX.Music.MusicInfo[]
  listId: string
  isMove: boolean
  // single: boolean
}
const initSelectInfo = { selectedList: [], listId: '', isMove: false }

export interface MusicMultiAddModalProps {
  onAdded?: () => void
  // onRename: (listInfo: LX.List.UserListInfo) => void
  // onImport: (listInfo: LX.List.MyListInfo, index: number) => void
  // onExport: (listInfo: LX.List.MyListInfo, index: number) => void
  // onSync: (listInfo: LX.List.UserListInfo) => void
  // onRemove: (listInfo: LX.List.UserListInfo) => void
}
export interface MusicMultiAddModalType {
  show: (info: SelectInfo) => void
}

export default forwardRef<MusicMultiAddModalType, MusicMultiAddModalProps>(({ onAdded }, ref) => {
  const t = useI18n()
  const dialogRef = useRef<DialogType>(null)
  const [selectInfo, setSelectInfo] = useState<SelectInfo>(initSelectInfo)
  const [playlistType, setPlaylistType] = useState<'local' | 'online'>('local');
  const theme = useTheme();

  useEffect(() => {
    getPlaylistType().then(setPlaylistType);
  }, []);

  const handlePlaylistTypeChange = (type: 'local' | 'online') => {
    setPlaylistType(type);
    void savePlaylistType(type);
  };

  useImperativeHandle(ref, () => ({
    show(selectInfo) {
      setSelectInfo(selectInfo)

      requestAnimationFrame(() => {
        dialogRef.current?.setVisible(true)
      })
    },
  }))

  const handleHide = () => {
    requestAnimationFrame(() => {
      setSelectInfo({ ...selectInfo, selectedList: [] })
    })
  }

  const handleSelect = (listInfo: LX.List.MyListInfo) => {
    dialogRef.current?.setVisible(false)
    const { selectedList, listId: fromListId, isMove } = selectInfo
    if (playlistType === 'online') {
      if (!selectedList.length) return
      const toListId = String(listInfo.id)
      const songIds = selectedList.map(m => m.meta.songId)

      if (isMove) {
        // 1. 先将歌曲添加到目标歌单
        wyApi.manipulatePlaylistTracks('add', toListId, songIds).then(() => {
          const sourcePlaylistId = fromListId.replace('wy__', '')
          clearListDetailCache('wy', toListId)
          global.app_event.playlist_updated({ source: 'wy', listId: toListId })
          // 2. 从源歌单删除歌曲
          return wyApi.manipulatePlaylistTracks('del', sourcePlaylistId, songIds)
        }).then(() => {
          onAdded?.()
          toast(t('list_edit_action_tip_move_success'))
          // 3. 更新两个歌单的歌曲数量
          updateWySubscribedPlaylistTrackCount(toListId, songIds.length)
          const sourcePlaylistId = fromListId.replace('wy__', '')
          updateWySubscribedPlaylistTrackCount(sourcePlaylistId, -songIds.length)
          // 4. 更新源歌单的缓存和UI
          clearListDetailCache('wy', sourcePlaylistId)
          global.app_event.playlist_updated({ source: 'wy', listId: sourcePlaylistId })
        }).catch((err) => {
          toast(err.message || t('list_edit_action_tip_move_failed'))
        })
      } else {
        wyApi.manipulatePlaylistTracks('add', toListId, songIds).then(() => {
          onAdded?.()
          toast(t('list_edit_action_tip_add_success'))
          updateWySubscribedPlaylistTrackCount(toListId, songIds.length)
          clearListDetailCache('wy', toListId)
          global.app_event.playlist_updated({ source: 'wy', listId: toListId })
        }).catch((err) => {
          toast(err.message || t('list_edit_action_tip_add_failed'))
        })
      }
      return
    }
    if (selectInfo.isMove) {
      void moveListMusics(
        selectInfo.listId,
        listInfo.id,
        [...selectInfo.selectedList],
        settingState.setting['list.addMusicLocationType']
      )
        .then(() => {
          onAdded?.()
          toast(t('list_edit_action_tip_move_success'))
        })
        .catch(() => {
          toast(t('list_edit_action_tip_move_failed'))
        })
    } else {
      void addListMusics(
        listInfo.id,
        [...selectInfo.selectedList],
        settingState.setting['list.addMusicLocationType']
      )
        .then(() => {
          onAdded?.()
          toast(t('list_edit_action_tip_add_success'))
        })
        .catch(() => {
          toast(t('list_edit_action_tip_add_failed'))
        })
    }
  }

  return (
    <Dialog ref={dialogRef} onHide={handleHide}>
      {selectInfo.selectedList.length ? (
        <>
          <Title selectedList={selectInfo.selectedList} isMove={selectInfo.isMove} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', paddingVertical: 10 }}>
            <Button onPress={() => handlePlaylistTypeChange('local')} style={{ marginRight: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4, backgroundColor: playlistType === 'local' ? theme['c-button-background-active'] : theme['c-button-background'] }}>
              <Text color={theme['c-button-font']}>本地歌单</Text>
            </Button>
            <Button onPress={() => handlePlaylistTypeChange('online')} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4, backgroundColor: playlistType === 'online' ? theme['c-button-background-active'] : theme['c-button-background'] }}>
              <Text color={theme['c-button-font']}>在线歌单</Text>
            </Button>
          </View>
          <List listId={selectInfo.listId} onPress={handleSelect} playlistType={playlistType} />
        </>
      ) : null}
    </Dialog>
  );
})
