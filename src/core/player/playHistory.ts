import playerState from '@/store/player/state'
import listState from '@/store/list/state'
import { LIST_IDS } from '@/config/constant'
import { getPlayHistoryData, savePlayHistoryData, type PlayHistoryRecord } from '@/utils/data'

export let historyInfo: {
    musicInfo: LX.Music.MusicInfo | null
    totalTime: number
    accumulatedPlayedTime: number
    lastReportedTime: number
    sourceContext: PlayHistoryRecord['sourceContext']
    platform: string
} | null = null

export const recordLastHistory = async () => {
    if (!historyInfo || !historyInfo.musicInfo) return
    const { musicInfo, totalTime, accumulatedPlayedTime, sourceContext, platform } = historyInfo
    const playedTime = Math.floor(accumulatedPlayedTime)
    historyInfo = null

    if (playedTime < 1 || (totalTime > 0 && playedTime < 120 && (playedTime / totalTime) < 0.5)) {
        return
    }

    const historyList = await getPlayHistoryData()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const playedAt = todayStart.getTime()

    const existingIndex = historyList.findIndex(item =>
        item.playedAt === playedAt && item.musicInfo.id === musicInfo.id
    )

    if (existingIndex !== -1) {
        historyList[existingIndex].listenCount = (historyList[existingIndex].listenCount || 1) + 1
    } else {
        historyList.unshift({
            musicInfo,
            playedAt,
            sourceContext,
            platform,
            listenCount: 1
        })
    }

    await savePlayHistoryData(historyList)
}

export const updatePlayHistoryInfo = () => {
    const musicInfo = playerState.playMusicInfo.musicInfo
    const listId = playerState.playMusicInfo.listId
    if (!musicInfo) {
        historyInfo = null
        return
    }

    let sourceContext: PlayHistoryRecord['sourceContext'] = 'unknown'
    const sourceListId = listId === LIST_IDS.TEMP ? listState.tempListMeta.id : listId

    if (sourceListId) {
        if (sourceListId.startsWith('album_')) {
            sourceContext = 'album'
        } else if (sourceListId === 'nav_daily_rec' || sourceListId.startsWith('similar_')) {
            sourceContext = 'daily_recommend'
        } else if (sourceListId.startsWith('artist_')) {
            sourceContext = 'artist'
        } else if (sourceListId === 'search') {
            sourceContext = 'search'
        } else {
            sourceContext = 'playlist'
        }
    }

    // 平台缩写就是 source 例如 'wy', 'tx', 'kg'
    const platform = 'source' in musicInfo ? musicInfo.source : 'local'

    historyInfo = {
        musicInfo: musicInfo as LX.Music.MusicInfo,
        totalTime: 0,
        accumulatedPlayedTime: 0,
        lastReportedTime: 0,
        sourceContext,
        platform
    }
}

export const updatePlayHistoryPlayTime = (currentTime: number) => {
    if (!historyInfo || !playerState.isPlay) return

    const deltaTime = currentTime - historyInfo.lastReportedTime
    if (deltaTime > 0 && deltaTime < 2) {
        historyInfo.accumulatedPlayedTime += deltaTime
    }
    historyInfo.lastReportedTime = currentTime
}

export const updatePlayHistoryTotalTime = (time: number) => {
    if (historyInfo) {
        historyInfo.totalTime = time
    }
}
