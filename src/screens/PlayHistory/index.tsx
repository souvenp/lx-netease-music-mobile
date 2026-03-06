import { memo, useCallback, useEffect, useState, useMemo } from 'react';
import { View, SectionList } from 'react-native';
import PageContent from '@/components/PageContent';
import Header from './Header';
import ListItem, { ITEM_HEIGHT } from './ListItem';
import Text from '@/components/common/Text';
import { getPlayHistoryData, type PlayHistoryRecord } from '@/utils/data';
import { createStyle, type RowInfo } from '@/utils/tools';
import { setComponentId } from '@/core/common';
import { playList } from '@/core/player/player';
import { LIST_IDS, COMPONENT_IDS } from '@/config/constant';
import { useWindowSize } from '@/utils/hooks';
import { usePlayMusicInfo } from '@/store/player/hook';
import { useTheme } from '@/store/theme/hook';
import settingState from '@/store/setting/state';
import { addListMusics } from '@/core/list';
import { getListMusicSync } from '@/utils/listManage';

type SectionData = {
    title: string;
    data: PlayHistoryRecord[];
}

export default memo(({ componentId }: { componentId: string }) => {
    const [history, setHistory] = useState<PlayHistoryRecord[]>([]);
    const windowSize = useWindowSize();
    const playMusicInfo = usePlayMusicInfo();
    const theme = useTheme();

    useEffect(() => {
        setComponentId(COMPONENT_IDS.PLAY_HISTORY_SCREEN as any, componentId);
        void getPlayHistoryData().then(data => {
            setHistory(data);
        });
    }, [componentId]);

    const sections = useMemo(() => {
        const map = new Map<number, PlayHistoryRecord[]>();
        for (const record of history) {
            if (!map.has(record.playedAt)) map.set(record.playedAt, []);
            map.get(record.playedAt)!.push(record);
        }

        const result: SectionData[] = [];
        const sortedKeys = Array.from(map.keys()).sort((a, b) => b - a);

        // helper to format date
        const formatDate = (ts: number) => {
            const d = new Date(ts);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diff = today.getTime() - ts;
            if (diff === 0) return '今天';
            if (diff === 86400000) return '昨天';
            return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
        };

        for (const key of sortedKeys) {
            result.push({
                title: formatDate(key),
                data: map.get(key)!,
            });
        }

        return result;
    }, [history]);

    const handlePress = useCallback((item: LX.Music.MusicInfo, index: number) => {
        void addListMusics(LIST_IDS.DEFAULT, [item], settingState.setting['list.addMusicLocationType']).then(() => {
            const idx = getListMusicSync(LIST_IDS.DEFAULT).findIndex((m) => m.id === item.id)
            if (idx < 0) return
            void playList(LIST_IDS.DEFAULT, idx)
        })
    }, [settingState.setting]);

    const handleLongPress = useCallback(() => { }, []);
    const handleShowMenu = useCallback(() => { }, []);

    const rowInfo = useMemo<RowInfo>(() => ({
        rowNum: 1,
        rowWidth: windowSize.width as any,
    }), [windowSize]);

    return (
        <PageContent>
            <View style={styles.container}>
                <Header componentId={componentId} />
                {history.length === 0 ? (
                    <View style={styles.empty}>
                        <Text color={theme['c-500']} size={14}>暂无听歌历史</Text>
                    </View>
                ) : (
                    <SectionList
                        sections={sections}
                        keyExtractor={(item, index) => item.musicInfo.id + index}
                        renderItem={({ item, index }) => {
                            const activeIndex = (playMusicInfo.listId === item.musicInfo.id ? index : -1);
                            return (
                                <ListItem
                                    record={item}
                                    index={index}
                                    activeIndex={activeIndex}
                                    onPress={handlePress}
                                    onShowMenu={handleShowMenu}
                                    onLongPress={handleLongPress}
                                    rowInfo={rowInfo}
                                    isShowAlbumName={true}
                                    isShowInterval={true}
                                    showCover={true}
                                />
                            )
                        }}
                        renderSectionHeader={({ section: { title } }) => (
                            <View style={[styles.header, { backgroundColor: theme['c-content-background'] }]}>
                                <Text color={theme['c-600']} size={12}>{title}</Text>
                            </View>
                        )}
                        getItemLayout={(data, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                    />
                )}
            </View>
        </PageContent>
    );
});

const styles = createStyle({
    container: {
        flex: 1,
    },
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    }
});
