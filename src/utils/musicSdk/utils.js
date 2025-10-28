import { stringMd5 } from 'react-native-quick-md5'
import { decodeName } from '../index'
import settingState from '@/store/setting/state';
import {logPlugin} from "@babel/preset-env/lib/debug";

/**
 * 获取音乐音质
 * @param {*} info
 * @param {*} type
 */

export const QUALITYS = ['master', 'atmos_plus', 'atmos', 'hires', 'flac', '320k', '192k', '128k']
export const getMusicType = (info, type) => {
  const list = global.lx.qualityList[info.source]
  if (!list) return '128k'
  if (!list.includes(type)) type = list[list.length - 1]
  const rangeType = QUALITYS.slice(QUALITYS.indexOf(type))
  for (const type of rangeType) {
    if (info._types[type]) return type
  }
  return '128k'
}

export const toMD5 = (str) => stringMd5(str)

/**
 * 格式化歌手
 * @param singers 歌手数组
 * @param nameKey 歌手名键值
 * @param join 歌手分割字符
 */
export const formatSingerName = (singers, nameKey = 'name', join = '、') => {
  if (Array.isArray(singers)) {
    const singer = []
    singers.forEach((item) => {
      let name = item[nameKey]
      if (!name) return
      singer.push(name)
    })
    return decodeName(singer.join(join))
  }
  return decodeName(String(singers ?? ''))
}

/**
 * 根据当前激活的自定义API配置，解析音质的别名。
 * 例如，如果应用请求 'hires'，但API配置只支持 'flac24bit'，则将其映射回去。
 * @param {LX.OnlineSource} source 音乐源ID, e.g., 'kw', 'wy'
 * @param {LX.Quality} type 应用请求的音质类型
 * @returns {LX.Quality} 应该传递给API的实际音质类型
 */
export const resolveQualityAlias = (source, type) => {
  const activeApiId = settingState.setting['common.apiSource'];
  // 此逻辑仅适用于用户自定义API
  if (!/^user_api/.test(activeApiId)) {
    console.log(`[LX Music SDK] No custom API detected (activeApiId: '${activeApiId}'), skipping quality alias resolution.`);
    return type;
  }
  const supportedQualities = global.lx.qualityList[source];
  // console.log(`[LX Music SDK] Supported qualities for source '${source}':`, supportedQualities);
  // 如果没有找到该源的音质配置，则不进行转换
  if (!supportedQualities) {
    console.log(`[LX Music SDK] No quality configuration found for source '${source}', skipping quality alias resolution.`);
    return type;
  }
  // 处理 'hires' 与 'flac24bit' 的别名情况
  if (
    type === 'hires' &&
    !supportedQualities.includes('hires')
  ) {
    console.log(`[LX Music SDK] Resolving quality alias for source '${source}': 'hires' -> 'flac24bit'`);
    return 'flac24bit';
  }

  return type; // 如果没有匹配的别名规则，返回原始类型
};
