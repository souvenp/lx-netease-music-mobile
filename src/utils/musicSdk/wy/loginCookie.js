// 将请求 Cookie 转成名称和值，保留值中的等号。
export const parseCookie = (cookie) => new Map(cookie.split(';').flatMap((pair) => {
  // 第一个等号才是名称与值的分隔符。
  const index = pair.indexOf('=')
  return index > 0 ? [[pair.slice(0, index).trim(), pair.slice(index + 1).trim()]] : []
}))

// 合并续期响应，兼容多个响应头及包含 Expires 逗号的折叠响应头。
export const mergeLoginCookies = (cookie, headers = {}) => {
  // 只读取服务器的 Set-Cookie，不把 Path、Expires 等属性当作凭据。
  const cookies = parseCookie(cookie)
  const entries = Object.entries(headers).filter(([name]) => name.toLowerCase() === 'set-cookie')
  let renewed = false
  for (const [, value] of entries) {
    for (const line of (Array.isArray(value) ? value : [value])) {
      if (typeof line !== 'string') continue
      for (const item of line.split(/,(?=\s*[^\s;,=]+\s*=)/)) {
        // 每条响应 Cookie 的第一段为名称和值，后续段用于判断删除。
        const [pair, ...attributes] = item.split(';')
        const parsed = [...parseCookie(pair)][0]
        if (!parsed) continue
        const [name, content] = parsed
        const maxAge = attributes.find(attribute => /^\s*max-age=/i.test(attribute))
        const expires = attributes.find(attribute => /^\s*expires=/i.test(attribute))
        const expired = maxAge
          ? Number(maxAge.slice(maxAge.indexOf('=') + 1)) <= 0
          : !!expires && Date.parse(expires.slice(expires.indexOf('=') + 1)) <= Date.now()
        if (!content || expired) cookies.delete(name)
        else cookies.set(name, content)
        if (name === 'MUSIC_U') renewed = !!content && !expired
      }
    }
  }
  if (!renewed || !cookies.get('MUSIC_U')) throw new Error('续期未返回有效登录凭据')
  return [...cookies].map(([name, value]) => `${name}=${value}`).join('; ')
}
