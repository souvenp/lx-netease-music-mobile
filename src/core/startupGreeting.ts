// 问候语在初始化时发布，首页稍后挂载也能读取；不创建系统 Toast 窗口。
let message = ''
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

// 外部快照供首页同步订阅，聚焦搜索时无需等待键盘动画或事件。
export const getStartupGreeting = () => message
export const subscribeStartupGreeting = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

// 立即清除文本及自动隐藏任务，失焦后不会重新出现。
export const hideStartupGreeting = () => {
  clearTimeout(timer)
  timer = undefined
  if (!message) return
  message = ''
  listeners.forEach(listener => listener())
}

// 沿用长提示的约 3.5 秒展示时长，新提示不会被旧计时器提前关闭。
export const showStartupGreeting = (text: string) => {
  clearTimeout(timer)
  message = text
  timer = text ? setTimeout(hideStartupGreeting, 3500) : undefined
  listeners.forEach(listener => listener())
}
