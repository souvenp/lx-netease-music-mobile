import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, FlatList, PermissionsAndroid, Platform, ScrollView, View } from 'react-native'
import RNFetchBlob from 'rn-fetch-blob'
import Text from '@/components/common/Text'
import FileSelect, { type FileSelectType } from '@/components/common/FileSelect'
import Button from '../Setting/components/Button'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import commonState from '@/store/common/state'
import downloadState from '@/store/download/state'
import { updateSetting } from '@/core/common'
import { normalizeLocalPath, parseLocalPaths, scanLocalMusic, type LocalMusicEntry } from '@/core/localMusic'
import { overwriteListMusics, setActiveList } from '@/core/list'
import listAction from '@/store/list/action'
import { playList } from '@/core/player/player'
import { clearPlayedList } from '@/core/player/playedList'
import { LIST_IDS } from '@/config/constant'
import { createStyle, getRowInfo, toast } from '@/utils/tools'
import MusicListItem from '../Mylist/MusicList/ListItem'
import { usePlayMusicInfo } from '@/store/player/hook'
import { type BadgeType } from '@/components/common/Badge'
import { useI18n } from '@/lang'

// 复用其他歌单的行布局，音质仅根据本地格式和实际码率展示。
const getQualityTag = (entry: LocalMusicEntry, t: ReturnType<typeof useI18n>): { type: BadgeType, text: string } | undefined => {
  const ext = entry.musicInfo.meta.ext.toLowerCase()
  // 与原歌单共用 SQ/HQ 文案和 Badge 类型，普通音质不额外显示码率标签。
  if (['flac', 'alac', 'ape', 'wav', 'aiff', 'aif'].includes(ext)) return { type: 'sq', text: t('quality_lossless') }
  if (entry.bitrate >= 320) return { type: 'hq', text: t('quality_high_quality') }
}

export default memo(() => {
  const theme = useTheme()
  const t = useI18n()
  // 跟随播放歌曲与歌单显示设置，切歌时更新当前行高亮。
  const playMusicInfo = usePlayMusicInfo()
  const isShowAlbumName = useSettingValue('list.isShowAlbumName')
  const isShowInterval = useSettingValue('list.isShowInterval')
  const downloadPath = useSettingValue('download.path')
  const savedPaths = useSettingValue('localMusic.paths')
  const extraPaths = useMemo(() => parseLocalPaths(savedPaths), [savedPaths])
  const defaultPath = normalizeLocalPath(downloadPath || `${RNFetchBlob.fs.dirs.MusicDir}/LX-N Music`)
  const paths = useMemo(() => [...new Set([defaultPath, ...extraPaths])], [defaultPath, extraPaths])
  const fileSelect = useRef<FileSelectType>(null)
  const generation = useRef(0)
  const [active, setActive] = useState(commonState.navActiveId === 'nav_local_music')
  const [entries, setEntries] = useState<LocalMusicEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [managePaths, setManagePaths] = useState(false)
  const [playing, setPlaying] = useState(false)

  const scan = useCallback(async () => {
    const current = ++generation.current
    const cancelled = () => current !== generation.current
    setLoading(true)
    try {
      // 系统授权目录由文件选择器负责；普通路径按 Android 版本申请读取权限。
      if (Platform.OS === 'android' && paths.some(path => !path.startsWith('content://'))) {
        const legacyPermission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        // 当前应用目标版本仍使用旧存储权限，升级目标版本后回退到媒体权限。
        if (!await PermissionsAndroid.check(legacyPermission)) {
          const result = await PermissionsAndroid.request(legacyPermission)
          if (result !== PermissionsAndroid.RESULTS.GRANTED && Number(Platform.Version) >= 33) {
            await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO)
          }
        }
      }
      if (cancelled()) return
      const excluded = new Set(downloadState.tasks.filter(task => !task.isRemoteSynced && task.target !== 'onedrive' && task.status !== 'completed').map(task => normalizeLocalPath(task.filePath)))
      const result = await scanLocalMusic(paths, excluded, cancelled)
      if (cancelled()) return
      setEntries(result.entries)
      setErrors(result.errors)
    } catch (error) {
      if (!cancelled()) {
        setErrors(paths)
        toast(error instanceof Error ? error.message : '本地音乐扫描失败')
      }
    } finally {
      if (!cancelled()) setLoading(false)
    }
  }, [paths])

  useEffect(() => {
    const onNav = (id: typeof commonState.navActiveId) => setActive(id === 'nav_local_music')
    global.state_event.on('navActiveIdUpdated', onNav)
    return () => { global.state_event.off('navActiveIdUpdated', onNav) }
  }, [])

  useEffect(() => {
    if (!active) return
    void scan()
    const onStatus = ({ status }: { status: LX.Download.DownloadTask['status'] }) => {
      if (status === 'completed') void scan()
    }
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void scan() })
    global.app_event.on('download_status_update', onStatus)
    return () => {
      generation.current++
      subscription.remove()
      global.app_event.off('download_status_update', onStatus)
    }
  }, [active, scan])

  const addPath = () => fileSelect.current?.show({ title: '添加本地音乐扫描目录', dirOnly: true }, path => {
    if (!path) return
    const normalized = normalizeLocalPath(path)
    if (paths.includes(normalized)) { toast('此目录已在扫描列表中'); return }
    updateSetting({ 'localMusic.paths': JSON.stringify([...extraPaths, normalized]) })
  })

  // 使用临时播放列表保留本地音源类型，支持按扫描顺序连续播放。
  const play = async (index: number) => {
    if (playing || !entries.length) return
    setPlaying(true)
    try {
      await overwriteListMusics(LIST_IDS.TEMP, entries.map(entry => entry.musicInfo))
      listAction.setTempListMeta({ id: 'local_music' })
      clearPlayedList()
      setActiveList(LIST_IDS.TEMP)
      await playList(LIST_IDS.TEMP, index)
    } catch (error) {
      toast(error instanceof Error ? error.message : '本地音乐播放失败')
    } finally {
      setPlaying(false)
    }
  }

  return <View style={styles.container}>
    <View style={styles.toolbar}>
      <Text>本地音乐 · {entries.length} 首</Text>
      <Button disabled={loading} onPress={() => { void scan() }}>{loading ? '扫描中…' : '重新扫描'}</Button>
      <Button onPress={() => setManagePaths(!managePaths)}>{managePaths ? '收起目录' : `管理目录 (${paths.length})`}</Button>
    </View>
    {managePaths && <ScrollView style={styles.paths}>
      {paths.map(path => <View key={path} style={styles.pathRow}>
        <Text selectable size={12} style={styles.pathText}>{path === defaultPath ? '下载目录：' : ''}{path}</Text>
        {path !== defaultPath && <Button onPress={() => updateSetting({ 'localMusic.paths': JSON.stringify(extraPaths.filter(item => item !== path)) })}>移出扫描</Button>}
      </View>)}
      <Button onPress={addPath}>添加目录</Button>
      <Text size={12} style={styles.hint}>包含子目录；移出扫描仅修改列表，不会删除文件。</Text>
    </ScrollView>}
    {!!errors.length && <Text size={12} style={styles.hint} color={theme['c-600']} numberOfLines={3}>
      {errors.length} 个目录无法读取，请检查路径或存储权限：{errors.join('；')}
    </Text>}
    <FlatList data={entries} keyExtractor={entry => entry.musicInfo.id}
      refreshing={loading} onRefresh={() => { void scan() }}
      ListEmptyComponent={<Text style={styles.empty}>{loading ? '正在扫描本地音乐…' : '暂无本地音乐，可在管理目录中添加音乐文件夹'}</Text>}
      renderItem={({ item, index }) => <MusicListItem
        item={item.musicInfo} index={index}
        activeIndex={playMusicInfo.musicInfo?.id === item.musicInfo.id ? index : -1}
        onPress={(_musicInfo, itemIndex) => { void play(itemIndex) }}
        selectedList={[]} rowInfo={getRowInfo('single')}
        isShowAlbumName={isShowAlbumName} isShowInterval={isShowInterval}
        showCover hideMenu showSource={false} qualityTag={getQualityTag(item, t)}
      />} />
    <FileSelect ref={fileSelect} />
  </View>
})

const styles = createStyle({
  container: { flex: 1 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: 10 },
  hint: { paddingHorizontal: 12, paddingVertical: 6 },
  paths: { maxHeight: 220, paddingHorizontal: 12 },
  pathRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  pathText: { flex: 1, marginRight: 8 },
  empty: { padding: 24, textAlign: 'center' },
})
