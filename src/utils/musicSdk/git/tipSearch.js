import { loadDatabase, extractNameFromFile } from './util'

export default {
  requestObj: null,

  async tipSearchByKeyword(str) {
    this.cancelTipSearch()

    // 创建一个可取消的Promise
    let canceled = false
    const promise = new Promise(async (resolve, reject) => {
      try {
        if (canceled) {
          reject(new Error('请求已取消'))
          return
        }

        // 加载数据库
        const database = await loadDatabase()

        if (canceled) {
          reject(new Error('请求已取消'))
          return
        }

        if (!database || database.length === 0) {
          reject(new Error('数据库为空'))
          return
        }

        // 根据关键词过滤（如果需要）或者随机返回
        const filtered = str
          ? database.filter((item) => {
              const title = item.title || extractNameFromFile(item.filename)
              return title.toLowerCase().includes(str.toLowerCase())
            })
          : database

        // 随机打乱并取前5个
        const shuffled = [...filtered].sort(() => Math.random() - 0.5)
        const results = shuffled.slice(0, 5)

        resolve(results)
      } catch (error) {
        reject(error)
      }
    })

    this.requestObj = {
      promise,
      cancelHttp: () => {
        canceled = true
      },
    }

    return this.requestObj.promise
  },

  handleResult(rawData) {
    return rawData.map((item) => ({
      keyword: item.title || extractNameFromFile(item.filename),
      type: 'git',
    }))
  },

  cancelTipSearch() {
    if (this.requestObj && this.requestObj.cancelHttp) {
      this.requestObj.cancelHttp()
    }
  },

  async search(str) {
    return this.tipSearchByKeyword(str).then((result) => this.handleResult(result))
  },
}
