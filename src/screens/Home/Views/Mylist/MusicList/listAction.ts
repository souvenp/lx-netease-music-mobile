import musicSdk from '@/utils/musicSdk'
import RNFetchBlob from 'rn-fetch-blob'
import playerState from '@/store/player/state'
import settingState from '@/store/setting/state'

import { removeListMusics, updateListMusicPosition, updateListMusics } from '@/core/list'
import { playList, playNext } from '@/core/player/player'
import { addTempPlayList } from '@/core/player/tempPlayList'

import { filterFileName, similar, sortInsert, toOldMusicInfo } from '@/utils'
import { confirmDialog, openUrl, shareMusic, toast } from '@/utils/tools'
import { addDislikeInfo, hasDislike } from '@/core/dislikeList'

import { type SelectInfo } from './ListMenu'
import { type Metadata } from '@/components/MetadataEditModal'

import { getFileExtension, getFileExtensionFromUrl } from './download/utils'
import { mergeLyrics } from './download/lrcTool'

import { getListMusicSync } from '@/utils/listManage'
import { requestStoragePermission } from '@/utils/tools'
import { getMusicUrl, getLyricInfo, getPicUrl } from '@/core/music/online'
import { writeMetadata, writePic, writeLyric } from '@/utils/localMediaMetadata'
import { downloadFile, writeFile } from '@/utils/fs'
import {MusicMetadata} from "react-native-local-media-metadata";
export const handlePlay = (listId: SelectInfo['listId'], index: SelectInfo['index']) => {
  void playList(listId, index)
}
export const handlePlayLater = (
  listId: SelectInfo['listId'],
  musicInfo: SelectInfo['musicInfo'],
  selectedList: SelectInfo['selectedList'],
  onCancelSelect: () => void
) => {
  if (selectedList.length) {
    addTempPlayList(selectedList.map((s) => ({ listId, musicInfo: s })))
    onCancelSelect()
  } else {
    addTempPlayList([{ listId, musicInfo }])
  }
}

export const handleRemove = (
  listId: SelectInfo['listId'],
  musicInfo: SelectInfo['musicInfo'],
  selectedList: SelectInfo['selectedList'],
  onCancelSelect: () => void
) => {
  if (selectedList.length) {
    void confirmDialog({
      message: global.i18n.t('list_remove_music_multi_tip', { num: selectedList.length }),
      confirmButtonText: global.i18n.t('list_remove_tip_button'),
    }).then((isRemove) => {
      if (!isRemove) return
      void removeListMusics(
        listId,
        selectedList.map((s) => s.id)
      )
      onCancelSelect()
    })
  } else {
    void removeListMusics(listId, [musicInfo.id])
  }
}

export const handleUpdateMusicPosition = (
  position: number,
  listId: SelectInfo['listId'],
  musicInfo: SelectInfo['musicInfo'],
  selectedList: SelectInfo['selectedList'],
  onCancelSelect: () => void
) => {
  if (selectedList.length) {
    void updateListMusicPosition(
      listId,
      position,
      selectedList.map((s) => s.id)
    )
    onCancelSelect()
  } else {
    void updateListMusicPosition(listId, position, [musicInfo.id])
  }
}

export const handleUpdateMusicInfo = (
  listId: SelectInfo['listId'],
  musicInfo: LX.Music.MusicInfoLocal,
  newInfo: Metadata
) => {
  void updateListMusics([
    {
      id: listId,
      musicInfo: {
        ...musicInfo,
        name: newInfo.name,
        singer: newInfo.singer,
        meta: {
          ...musicInfo.meta,
          albumName: newInfo.albumName,
        },
      },
    },
  ])
}

export const handleShare = (musicInfo: SelectInfo['musicInfo']) => {
  shareMusic(
    settingState.setting['common.shareType'],
    settingState.setting['download.fileName'],
    musicInfo
  )
}

export const searchListMusic = (list: LX.Music.MusicInfo[], text: string) => {
  let result: LX.Music.MusicInfo[] = []
  let rxp = new RegExp(
    text
      .split('')
      .map((s) => s.replace(/[.*+?^${}()|[\]\\]/, '\\$&'))
      .join('.*') + '.*',
    'i'
  )
  for (const mInfo of list) {
    const str = `${mInfo.name}${mInfo.singer}${mInfo.meta.albumName ? mInfo.meta.albumName : ''}`
    if (rxp.test(str)) result.push(mInfo)
  }

  const sortedList: Array<{ num: number; data: LX.Music.MusicInfo }> = []

  for (const mInfo of result) {
    sortInsert(sortedList, {
      num: similar(
        text,
        `${mInfo.name}${mInfo.singer}${mInfo.meta.albumName ? mInfo.meta.albumName : ''}`
      ),
      data: mInfo,
    })
  }
  return sortedList.map((item) => item.data).reverse()
}

export const handleShowMusicSourceDetail = async (minfo: SelectInfo['musicInfo']) => {
  const url = musicSdk[minfo.source as LX.OnlineSource]?.getMusicDetailPageUrl(
    toOldMusicInfo(minfo)
  )
  if (!url) return
  void openUrl(url)
}

export const handleDislikeMusic = async (musicInfo: SelectInfo['musicInfo']) => {
  const confirm = await confirmDialog({
    message: musicInfo.singer
      ? global.i18n.t('lists_dislike_music_singer_tip', {
          name: musicInfo.name,
          singer: musicInfo.singer,
        })
      : global.i18n.t('lists_dislike_music_tip', { name: musicInfo.name }),
    cancelButtonText: global.i18n.t('cancel_button_text_2'),
    confirmButtonText: global.i18n.t('confirm_button_text'),
    bgClose: false,
  })
  if (!confirm) return
  await addDislikeInfo([{ name: musicInfo.name, singer: musicInfo.singer }])
  toast(global.i18n.t('lists_dislike_music_add_tip'))
  if (hasDislike(playerState.playMusicInfo.musicInfo)) {
    void playNext(true)
  }
}

export const handleToggleSource = (
  listId: string,
  musicInfo: LX.Music.MusicInfo,
  toggleMusicInfo?: LX.Music.MusicInfoOnline | null
) => {
  const list = getListMusicSync(listId)
  const idx = list.findIndex((m) => m.id == musicInfo.id)
  if (idx < 0) return null
  musicInfo.meta.toggleMusicInfo = toggleMusicInfo
  const newInfo = {
    ...musicInfo,
    meta: {
      ...musicInfo.meta,
      toggleMusicInfo,
    },
  }
  void updateListMusics([
    {
      id: listId,
      musicInfo: newInfo as LX.Music.MusicInfo,
    },
  ])
  if (
    !!toggleMusicInfo ||
    (playerState.playMusicInfo.listId == listId &&
      playerState.playMusicInfo.musicInfo?.id == musicInfo.id)
  ) {
    void playList(listId, idx)
  }
  return newInfo as LX.Music.MusicInfo
}

export const handleDownload = async (musicInfo: LX.Music.MusicInfo, quality: LX.Quality) => {
  try {
    await requestStoragePermission()
    try {
      let url = await getMusicUrl({
        // @ts-ignore
        musicInfo,
        quality,
        isRefresh: true,
        prefer: 'api',
      })
      const extension = getFileExtension(quality)
      let fileName = settingState.setting['download.fileName']
        .replace('歌名', musicInfo.name)
        .replace('歌手', musicInfo.singer)

      fileName = filterFileName(fileName) // 过滤非法字符

      const downloadDir = settingState.setting['download.path'] || (RNFetchBlob.fs.dirs.MusicDir + '/LX-N Music')
      const path = `${downloadDir}/${fileName}.${extension}`

      const downloader = RNFetchBlob.config({
        fileCache: true,
        path: path,
        // addAndroidDownloads: {
        //   useDownloadManager: true,
        //   notification: true,
        //   path: path,
        //   title: `${musicInfo.name} - ${musicInfo.singer}`,
        //   description: '正在下载文件...',
        // },
      })
      const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.54',
          Referer: 'https://music.163.com/',
      }
      const data = await downloader.fetch('GET', url, headers)
      const filePath = data.path()

      toast(`${fileName} 下载成功! 正在写入元数据`, 'short')

      if (settingState.setting['download.writeMetadata']) {
        try {
          const metadata: {
            name: string
            singer: string
            albumName?: string
            year?: string
          } = {
            name: musicInfo.name,
            singer: musicInfo.singer,
            albumName: musicInfo.meta.albumName,
          }

          // 提取年份
          if (musicInfo.releaseDate) {
            const yearMatch = musicInfo.releaseDate.match(/^(\d{4})/)
            if (yearMatch) {
              metadata.year = yearMatch[1]
            }
          }

          await writeMetadata(filePath, <MusicMetadata>metadata, true)
          // --- 强制媒体库更新逻辑 ---
          try {
            const tempPath = filePath + '.tmp'
            // 1. 重命名为临时文件
            await RNFetchBlob.fs.mv(filePath, tempPath)
            // 2. 扫描原路径，让媒体库认为文件已删除
            await RNFetchBlob.fs.scanFile([{ path: filePath }])
            // 3. 立即改回原名
            await RNFetchBlob.fs.mv(tempPath, filePath)
            // 4. 再次扫描原路径，让媒体库作为新文件重新索引
            await RNFetchBlob.fs.scanFile([{ path: filePath }])
            console.log('Media store updated successfully.')
          } catch (err) {
            console.error('Failed to force update media store:', err)
            // 即使失败，也尝试一次普通扫描作为后备
            await RNFetchBlob.fs.scanFile([{ path: filePath }])
          }
          toast(`写入标签成功!`, 'short')
        } catch (err) {
          console.log(err)
          toast(`${fileName} 写入元数据失败!`, 'short')
        }
      }

      if (settingState.setting['download.writeLyric'] || settingState.setting['download.writeRomaLyric'] || settingState.setting['download.writeEmbedLyric']) {
        try {
          const lyrics = await getLyricInfo({
            musicInfo: musicInfo as LX.Music.MusicInfoOnline,
            isRefresh: true,
          })
          const tasks = []
          const baseFilePath = filePath.substring(0, filePath.lastIndexOf('.'))



          // 写入内嵌歌词
          if (settingState.setting['download.writeEmbedLyric']) {
            // 内嵌歌词通常不包含罗马音
            const embedLyricContent = mergeLyrics(lyrics.lyric, lyrics.tlyric, null)
            if (embedLyricContent) {
              tasks.push(writeLyric(filePath, embedLyricContent))
            }
          } else if (settingState.setting['download.writeLyric'] || settingState.setting['download.writeRomaLyric']) {
            const romaLyric = settingState.setting['download.writeRomaLyric'] ? lyrics.rlyric : null
            const finalLyricContent = mergeLyrics(lyrics.lyric, lyrics.tlyric, romaLyric)

            if (finalLyricContent) {
              tasks.push(writeFile(`${baseFilePath}.lrc`, finalLyricContent))
            }
          }


          if (tasks.length) {
            await Promise.all(tasks)
            toast('写入歌词成功!', 'short')
          }
        } catch (err) {
          console.log(err)
          toast(`${fileName} 写入歌词失败!`, 'short')
        }
      }

      if (settingState.setting['download.writePicture']) {
        try {
          const picUrl = await getPicUrl({
            // @ts-ignore
            musicInfo: musicInfo,
          })
          // console.log(picUrl)
          const extension = getFileExtensionFromUrl(picUrl)
          const picPath = `${downloadDir}/temp.${extension}`
          downloadFile(picUrl, picPath)
          await writePic(filePath, picPath)
          await RNFetchBlob.fs.unlink(picPath)
          toast(`写入封面成功!`, 'short')
        } catch (err) {
          console.log(err)
          toast(`${fileName} 写入封面失败!`, 'short')
        }
      }
      toast(`路径: ${filePath}`, 'long')
    } catch (e) {
      console.log(e)
      toast(`文件下载失败：${e}`)
    }
  } catch (e) {
    console.log(e)
    return await Promise.reject(e ?? '权限获取失败')
  }
}
