// src/screens/Home/Views/Mylist/MusicList/download/lrcTool.ts

const timeTagRegex = /\[(\d{2}:\d{2}\.\d{2,3})\]/g

/**
 * 将LRC字符串解析为 Map<时间戳, 歌词行[]> 的结构
 * @param lrcString 原始LRC字符串
 * @returns Map<string, string[]>
 */
const parseLrcToMap = (lrcString: string | null | undefined): Map<string, string[]> => {
  const map = new Map<string, string[]>()
  if (!lrcString) return map

  const lines = lrcString.split(/\r\n|\n|\r/)
  for (const line of lines) {
    const timeTags = line.match(timeTagRegex)
    if (!timeTags) continue

    const text = line.replace(timeTagRegex, '').trim()
    if (!text) continue

    for (const tag of timeTags) {
      if (!map.has(tag)) {
        map.set(tag, [])
      }
      map.get(tag)!.push(text)
    }
  }
  return map
}

/**
 * 逐行合并多个LRC字符串
 * @param lrc 主歌词
 * @param tlrc 翻译歌词 (可选)
 * @param rlrc 罗马音歌词 (可选)
 * @returns 合并后的LRC字符串
 */
export const mergeLyrics = (
  lrc: string,
  tlrc: string | null | undefined,
  rlrc: string | null | undefined
): string => {
  if (!lrc || (!tlrc && !rlrc)) return lrc

  const mainLrcMap = parseLrcToMap(lrc)
  const transLrcMap = parseLrcToMap(tlrc)
  const romaLrcMap = parseLrcToMap(rlrc)

  const allTimestamps = Array.from(mainLrcMap.keys())
  allTimestamps.sort()

  const resultLines: string[] = []

  // 保留LRC文件头部的元数据标签 (如 [ti:], [ar:])
  const metadataLines = lrc.split(/\r\n|\n|\r/).filter(line => !line.match(timeTagRegex) && line.startsWith('['))
  if (metadataLines.length) {
    resultLines.push(...metadataLines, '')
  }

  for (const timestamp of allTimestamps) {
    const mainLines = mainLrcMap.get(timestamp) || []
    const transLines = transLrcMap.get(timestamp) || []
    const romaLines = romaLrcMap.get(timestamp) || []

    for (const line of mainLines) {
      resultLines.push(`${timestamp}${line}`)
    }
    for (const line of transLines) {
      resultLines.push(`${timestamp}${line}`)
    }
    for (const line of romaLines) {
      resultLines.push(`${timestamp}${line}`)
    }
  }

  return resultLines.join('\n')
}
