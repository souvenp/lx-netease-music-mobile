import Content from './Content'
import PlayerBar from '@/components/player/PlayerBar'
import commonState from '@/store/common/state'

export default ({ componentId }: { componentId: string }) => {
  return (
    <>
      <Content />
      <PlayerBar componentId={componentId} componentId={commonState.componentIds[commonState.componentIds.length - 1]?.id!} isHome />
    </>
  )
}
