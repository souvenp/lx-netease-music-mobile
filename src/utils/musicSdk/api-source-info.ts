const sources: Array<{
  id: string
  name: string
  disabled: boolean
  supportQualitys: Partial<Record<LX.OnlineSource, LX.Quality[]>>
}> = [
  // {
  //   id: 'mobi',
  //   name: 'Mobi(酷我破解版用的接口)',
  //   disabled: false,
  //   supportQualitys: {
  //     kw: ['128k', '320k', 'flac', 'hires'],
  //   },
  // },
]

export default sources
