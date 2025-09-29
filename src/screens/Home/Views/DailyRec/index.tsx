// src/screens/Home/Views/DailyRec/index.tsx

import { memo, useEffect, useRef, useState, useCallback } from 'react'
import { View } from 'react-native'
import OnlineList, { type OnlineListType } from '@/components/OnlineList'
import wySdk from '@/utils/musicSdk/wy'
import { useSettingValue } from '@/store/setting/hook'
import { toast } from '@/utils/tools'
import { useI18n } from '@/lang'
import {autoSaveDailyPlaylist, handlePlay} from './listAction'
import { usePlayerMusicInfo } from '@/store/player/hook';

export default memo(() => {
  const listRef = useRef<OnlineListType>(null)
  const [isLoading, setIsLoading] = useState(true)
  const t = useI18n()
  const cookie = useSettingValue('common.wy_cookie')
  const playerMusicInfo = usePlayerMusicInfo();

  useEffect(() => {
    if (!cookie) {
      // 只有在组件初次加载且没有cookie时才提示
      if (isLoading) {
        toast('请先设置网易云 Cookie')
        setIsLoading(false)
      }
      listRef.current?.setList([]) // 如果cookie被移除，清空列表
      listRef.current?.setStatus('idle')
      return
    }

    setIsLoading(true) // 每次有效cookie触发时都应该显示加载状态
    listRef.current?.setStatus('loading')
    wySdk.dailyRec.getList(cookie).then(result => {
      listRef.current?.setList(result.list)
      listRef.current?.setStatus('idle')
      if (result.list && result.list.length > 0) {
        void autoSaveDailyPlaylist(result.list);
      }
    }).catch(err => {
      console.error(err)
      toast(t('load_failed'), 'long')
      listRef.current?.setStatus('error')
    }).finally(() => {
      setIsLoading(false)
    })
  }, [t, cookie])
  // 添加一个新的 useEffect 来处理事件
  useEffect(() => {
    const handleReplaceMusic = (oldMusicInfoId: string, newMusicInfo: LX.Music.MusicInfoOnline | null) => { // <--- 允许 newMusicInfo 为 null
      const currentList = listRef.current?.getList()
      if (!currentList) return
      const index = currentList.findIndex(s => s.id === oldMusicInfoId)
      if (index > -1) {
        const newList = [...currentList]
        if (newMusicInfo) {
          newList.splice(index, 1, newMusicInfo) // 替换
        } else {
          newList.splice(index, 1) // 移除
        }
        listRef.current?.setList(newList)
      }
    }

    global.list_event.on('daily_rec_music_replace', handleReplaceMusic)

    return () => {
      global.list_event.off('daily_rec_music_replace', handleReplaceMusic)
    }
  }, []) // 空依赖数组，确保只注册一次监听器

  const handleRefresh = useCallback(() => {
    if (!cookie) {
      toast('请先设置网易云 Cookie')
      listRef.current?.setStatus('idle')
      return
    }
    listRef.current?.setStatus('refreshing')
    wySdk.dailyRec.getList(cookie).then(result => {
      listRef.current?.setList(result.list)
      if (result.list && result.list.length > 0) {
        void autoSaveDailyPlaylist(result.list);
      }
    }).catch(err => {
      console.error(err)
      toast(t('load_failed'), 'long')
      listRef.current?.setStatus('error')
    }).finally(() => {
      listRef.current?.setStatus('idle')
    })
  }, [cookie, t])

  return (
    <View style={{ flex: 1 }}>
      <OnlineList
        ref={listRef}
        listId="dailyrec_wy"
        forcePlayList={true}
        playingId={playerMusicInfo.id}
        onPlayList={(index) => {
          const list = listRef.current?.getList()
          if (!list) return
          handlePlay(list, index)
        }}
        onRefresh={handleRefresh} // <--- 实现下拉刷新
        onLoadMore={() => { /* 日推列表通常不分页 */ }}
        checkHomePagerIdle
      />
    </View>
  )
})
