<p align="center"><a href="https://github.com/lyswhut/lx-music-mobile"><img width="200" src="https://github.com/lyswhut/lx-music-mobile/blob/master/doc/images/icon.png" alt="lx-music logo"></a></p>

<h1 align="center">LX-N Music 移动版</h1>

<p align="center">
  <a href="https://github.com/souvenp/lx-netease-music-mobile/releases"><img src="https://img.shields.io/github/release/lyswhut/lx-music-mobile" alt="Release version"></a>
  <a href="https://github.com/souvenp/lx-netease-music-mobile/actions/workflows/release.yml"><img src="https://github.com/lyswhut/lx-music-mobile/workflows/Build/badge.svg" alt="Build status"></a>
  <a href="https://github.com/souvenp/lx-netease-music-mobile/actions/workflows/beta-pack.yml"><img src="https://github.com/lyswhut/lx-music-mobile/workflows/Build%20Beta/badge.svg" alt="Build status"></a>
  <a href="https://github.com/facebook/react-native"><img src="https://img.shields.io/github/package-json/dependency-version/lyswhut/lx-music-mobile/react-native/master" alt="React native version"></a>
</p>

<p align="center">一个基于 React Native 开发的音乐软件</p>

这个库在lx-music-mobile和ikun-music基础上继续改造，以满足个人需求
- https://github.com/lyswhut/lx-music-mobile
- https://github.com/ikunshare/ikun-music-mobile

---

### 1.8.75

##### 新增
- 日推缓存增加
#### 修复、优化
- 解决歌单详情的背景问题
---
### 1.8.74
#### 新增
- 播放url增加wy vip判断
#### 修复、优化
- 修复横屏下菜单、详情的展示
- 修复一个多页面嵌套问题
---
### 1.8.73
#### 新增
- 略微增加详情的封面大小
#### 修复、优化
- cookie获取vip歌曲url直接返回而不是重试
---
### 1.8.72
#### 新增
- 我的wy歌单操作增加（新建、编辑可能有问题）
- wy MV播放
- 更多菜单的显隐
- 下载元信息别名设置
#### 修复、优化
- 打点触发，修改为播放2分钟或50%以上
---
### 1.8.70 更新

#### 新增
- 搜索类型：歌手、专辑，仅支持wy源
- wy歌曲听歌打点：以助于个性化推荐
- 日推：歌单增加，相似歌曲增加，入口在日推底部
- 批量下载：仅支持wy cookie
- wy源翻唱cover标识增加

#### 优化
- 底部播放器，上滑可以打开当前播放列表，左右滑可以打开菜单，顶部增加一个进度条
- 现在我的歌单里面封面序号显示可切换
- 播放详情顶部歌手可点击跳到歌手详情、底部更多按钮添加
- 统一我关注的歌手、收藏的专辑、歌单的展示效果
- 歌手详情内部专辑列表可以切换网格、列表显示
---
### 1.8.60 更新
- webdav支持（歌单支持自动同步，设置和音源手动同步）
- 下载管理器
- 顶部滑动可以弹出菜单抽屉
---
### 1.8.60以下版本
  #### 新增（仅支持wy）
  - 菜单增加：每日推荐
  - 菜单增加：我的歌单
  - 菜单增加：我关注的歌手
  - 菜单增加：我收藏的专辑
  - 歌曲下拉菜单增加：歌手详情
  - 歌曲下拉菜单增加：专辑详情
  - 收藏歌曲/歌手/专辑
  - 歌曲列表显示歌曲封面
  - 歌曲列表显示歌曲别名
  - 歌曲列表显示VIP标签
  - 自动保存日推歌单(最多15个，多的会自动删除)
  #### 其他
  - 全局顶部搜索栏增加
  - 播放详情内迷你歌词显示
  - 播放详情内可设置圆形旋转封面
  - 播放详情内歌词点击即可跳转，替换原有的跳转方式
  - 播放详情顶部的名称过长滚动显示
  - 底部播放器删除时间条及点击跳转
  - 底部播放器增加按钮，点击显示当前播放列表
  - 背景模糊度、背景图片设置
  - 左侧菜单可设置显示/隐藏
  - 退出程序的二次确认
  - 默认设置值修改
