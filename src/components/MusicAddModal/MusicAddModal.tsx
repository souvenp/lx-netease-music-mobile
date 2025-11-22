import {forwardRef, useEffect, useImperativeHandle, useRef, useState} from 'react'
import Dialog, { type DialogType } from '@/components/common/Dialog'
import { toast } from '@/utils/tools'
import Title from './Title'
import List from './List'
import Button from '@/components/common/Button'
import wyApi from '@/utils/musicSdk/wy/user'
import { useI18n } from '@/lang'
import { addListMusics, moveListMusics } from '@/core/list'
import settingState from '@/store/setting/state'
import {useTheme} from "@/store/theme/hook"
import {getPlaylistType, savePlaylistType} from "@/utils/data"
import {Text, View} from "react-native"
import {addWyLikedSong, removeWyLikedSong, updateWySubscribedPlaylistTrackCount} from "@/store/user/action.ts";
import {clearListDetailCache} from "@/core/songlist.ts";
import {useWySubscribedPlaylists} from "@/store/user/hook.ts";

export interface SelectInfo {
  musicInfo: LX.Music.MusicInfo | null
  listId: string
  isMove: boolean
}

const initSelectInfo = {}

export interface MusicAddModalProps {
  onAdded?: () => void
}

export interface MusicAddModalType {
  show: (info: SelectInfo) => void
}

export default forwardRef<MusicAddModalType, MusicAddModalProps>(({ onAdded }, ref) => {
  const t = useI18n()
  const dialogRef = useRef<DialogType>(null)
  const [selectInfo, setSelectInfo] = useState<SelectInfo>(initSelectInfo as SelectInfo)
  const [playlistType, setPlaylistType] = useState<'local' | 'online'>('local')
  const theme = useTheme()
  const subscribedPlaylists = useWySubscribedPlaylists()

  useEffect(() => {
    getPlaylistType().then(setPlaylistType)
  }, [])

  const handlePlaylistTypeChange = (type: 'local' | 'online') => {
    setPlaylistType(type)
    void savePlaylistType(type)
  }


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
      setSelectInfo({ ...selectInfo, musicInfo: null })
    })
  }

  const handleSelect = (listInfo: LX.List.MyListInfo) => {
    dialogRef.current?.setVisible(false)
    const { musicInfo, listId: fromListId, isMove } = selectInfo
    if (playlistType === 'online') {
      if (!musicInfo) return;
      const toListId = String(listInfo.id);
      const songId = musicInfo.meta.songId;
      const sourcePlaylist = subscribedPlaylists.find(p => `wy__${p.id}` === fromListId);

      if (isMove) {
        wyApi.manipulatePlaylistTracks('add', toListId, [songId]).then(() => {
          if (listInfo.name === listInfo.creator.nickname + '喜欢的音乐') {
            addWyLikedSong(songId)
          }
          const sourcePlaylistId = fromListId.replace('wy__', '');
          clearListDetailCache('wy', toListId)
          global.app_event.playlist_updated({ source: 'wy', listId: toListId })
          return wyApi.manipulatePlaylistTracks('del', sourcePlaylistId, [songId]);
        }).then(() => {
          if (sourcePlaylist.name === sourcePlaylist.creator.nickname + '喜欢的音乐') {
            removeWyLikedSong(songId)
          }
          onAdded?.()
          toast(t('list_edit_action_tip_move_success'));
          updateWySubscribedPlaylistTrackCount(toListId, 1);
          const sourcePlaylistId = fromListId.replace('wy__', '')
          updateWySubscribedPlaylistTrackCount(sourcePlaylistId, -1);
          clearListDetailCache('wy', sourcePlaylistId)
          global.app_event.playlist_updated({ source: 'wy', listId: sourcePlaylistId })
        }).catch((err) => {
          toast(err.message || t('list_edit_action_tip_move_failed'));
        });
      } else {
        wyApi.manipulatePlaylistTracks('add', toListId, [songId]).then(() => {
          if (listInfo.name === listInfo.creator.nickname + '喜欢的音乐') {
            addWyLikedSong(songId)
          }
          onAdded?.()
          toast(t('list_edit_action_tip_add_success'))
          updateWySubscribedPlaylistTrackCount(toListId, 1)
          clearListDetailCache('wy', toListId)
          global.app_event.playlist_updated({ source: 'wy', listId: toListId })
        }).catch((err) => {
          toast(err.message || t('list_edit_action_tip_add_failed'));
        });
      }
      return;
    }

    if (selectInfo.isMove) {
      void moveListMusics(
        selectInfo.listId,
        listInfo.id,
        [selectInfo.musicInfo!],
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
        [selectInfo.musicInfo!],
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
      {selectInfo.musicInfo ? (
        <>
          <Title musicInfo={selectInfo.musicInfo} isMove={selectInfo.isMove} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', paddingVertical: 10 }}>
            <Button onPress={() => handlePlaylistTypeChange('local')} style={{ marginRight: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4, backgroundColor: playlistType === 'local' ? theme['c-button-background-active'] : theme['c-button-background'] }}>
              <Text color={theme['c-button-font']}>本地歌单</Text>
            </Button>
            <Button onPress={() => handlePlaylistTypeChange('online')} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4, backgroundColor: playlistType === 'online' ? theme['c-button-background-active'] : theme['c-button-background'] }}>
              <Text color={theme['c-button-font']}>在线歌单</Text>
            </Button>
          </View>
          <List musicInfo={selectInfo.musicInfo} onPress={handleSelect} playlistType={playlistType} />
        </>
      ) : null}
    </Dialog>
  )
})
