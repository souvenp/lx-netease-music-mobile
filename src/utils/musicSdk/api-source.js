import apiSourceInfo from './api-source-info'
// import api_mobi_kw from './kw/api-mobi'
import settingState from '@/store/setting/state'

const apiList = {
  // mobi_api_kw: api_mobi_kw,
}
const supportQuality = {}

for (const api of apiSourceInfo) {
  supportQuality[api.id] = api.supportQualitys
}

const getAPI = (source) => apiList[`${settingState.setting['common.apiSource']}_api_${source}`]

const apis = (source) => {
  if (/^user_api/.test(settingState.setting['common.apiSource'])) return global.lx.apis[source]
  const api = getAPI(source)
  if (api) return api
  throw new Error('Api is not found')
}

export { apis, supportQuality }
