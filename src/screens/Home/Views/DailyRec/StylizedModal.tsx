import { memo, useState, useEffect } from 'react'
import { View, ScrollView, TouchableOpacity, Modal } from 'react-native'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { createStyle, toast } from '@/utils/tools'
import { getData, saveData } from '@/plugins/storage'

export const CATEGORIES = {
  "曲风": {
    "categoryId": 1000,
    "tags": {
      "嘻哈/说唱": 10005, "电音": 10004, "民谣": 10010, "华语流行": 10001,
      "轻音乐": 10017, "国风": 10016, "欧美流行": 10002, "R&B": 10013,
      "二次元": 10015, "DJ慢摇": 10018, "韩系流行": 10019, "日系流行": 10020,
      "摇滚": 10021, "金属": 10022, "爵士": 10008, "古典": 10009,
      "雷鬼": 10023, "蓝调": 10024, "乡村": 10011, "新世纪": 10007, "独立": 10012
    }
  },
  "语种": {
    "categoryId": 2000,
    "tags": {
      "华语": 20001, "英语": 20002, "日语": 20003, "韩语": 20004,
      "粤语": 20005, "纯音乐": 20006, "西班牙语": 20007, "俄语": 20008,
      "法语": 20009, "泰语": 20010, "闽南语": 20011
    }
  },
  "情感": {
    "categoryId": 3000,
    "tags": {
      "伤感": 30001, "放松": 30002, "抒情": 30008, "欢快": 30004,
      "浪漫": 30005, "兴奋": 30009, "思念": 30010, "治愈": 30011
    }
  },
  "主题": {
    "categoryId": 4000,
    "tags": {
      "偶像": 40001, "草原": 40002, "成熟": 40003, "慢摇": 40004
    }
  },
  "场景": {
    "categoryId": 5000,
    "tags": {
      "学习": 50001, "助眠": 50002, "运动": 50003, "KTV": 50004,
      "咖啡厅": 50005, "夜店": 50006, "微醺": 50007
    }
  }
}

export type StylizedSelection = { categoryId: number, tagIds: number[] } | null;

export const loadStylizedSelection = async (): Promise<StylizedSelection> => {
  return await getData('stylizedRecSettings');
}

export const saveStylizedSelection = async (data: StylizedSelection) => {
  await saveData('stylizedRecSettings', data);
}

interface StylizedModalProps {
  visible: boolean
  onClose: () => void
  onConfirm: (selection: NonNullable<StylizedSelection>) => void
}

export default memo(({ visible, onClose, onConfirm }: StylizedModalProps) => {
  const theme = useTheme()
  const [selectedCategoryName, setSelectedCategoryName] = useState<keyof typeof CATEGORIES>('曲风')
  const [selectedTags, setSelectedTags] = useState<number[]>([])

  useEffect(() => {
    if (visible) {
      loadStylizedSelection().then(data => {
        if (data && data.categoryId && data.tagIds) {
          const categoryName = Object.keys(CATEGORIES).find(
            k => CATEGORIES[k as keyof typeof CATEGORIES].categoryId === data.categoryId
          ) as keyof typeof CATEGORIES
          if (categoryName) {
            setSelectedCategoryName(categoryName)
            setSelectedTags(data.tagIds || [])
            return
          }
        }
        setSelectedCategoryName('曲风')
        setSelectedTags([])
      })
    }
  }, [visible])

  const handleSelectCategory = (name: keyof typeof CATEGORIES) => {
    setSelectedCategoryName(name)
    setSelectedTags([])
  }

  const handleSelectTag = (tagId: number) => {
    const isEmotion = selectedCategoryName === '情感'
    
    if (selectedTags.includes(tagId)) {
      setSelectedTags(prev => prev.filter(id => id !== tagId))
    } else {
      if (isEmotion) {
        setSelectedTags([tagId])
      } else {
        if (selectedTags.length >= 5) {
          toast('最多只能选择5个标签')
          return
        }
        setSelectedTags(prev => [...prev, tagId])
      }
    }
  }

  const handleConfirm = () => {
    if (selectedTags.length === 0) {
      toast('请至少选择一个标签')
      return
    }
    const cat = CATEGORIES[selectedCategoryName]
    const selection = { categoryId: cat.categoryId, tagIds: selectedTags }
    saveStylizedSelection(selection).then(() => {
      onConfirm(selection)
    })
  }

  const currentTags = CATEGORIES[selectedCategoryName].tags

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <TouchableOpacity activeOpacity={1} style={[styles.container, { backgroundColor: theme['c-content-background'] }]}>
          <View style={[styles.header, { borderBottomColor: theme['c-border-background'] }]}>
            <Text size={18} style={{ fontWeight: 'bold', color: theme['c-font'] }}>选择风格标签</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text size={16} color={theme['c-font-label']}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.content}>
            {/* 左侧分类 */}
            <View style={[styles.categoryList, { borderRightColor: theme['c-border-background'] }]}>
              {Object.keys(CATEGORIES).map(name => {
                const isSelected = selectedCategoryName === name
                const isThemeSupported = Object.keys(theme).includes('c-button-background');
                return (
                  <TouchableOpacity
                    key={name}
                    style={[
                      styles.categoryItem,
                      isSelected && { backgroundColor: isThemeSupported ? theme['c-button-background'] : 'rgba(0,0,0,0.1)' }
                    ]}
                    onPress={() => handleSelectCategory(name as keyof typeof CATEGORIES)}
                  >
                    <Text
                      size={14}
                      color={isSelected ? theme['c-button-font'] : theme['c-font']}
                      style={isSelected ? { fontWeight: 'bold' } : {}}
                    >
                      {name}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            
            {/* 右侧标签 */}
            <ScrollView style={styles.tagList}>
              <Text size={12} color={theme['c-font-label']} style={{ marginBottom: 10 }}>
                {selectedCategoryName === '情感' ? '最多可选择 1 个标签' : '最多可选择 5 个标签'}
              </Text>
              <View style={styles.tagsContainer}>
                {Object.entries(currentTags).map(([tagName, tagId]) => {
                  const isSelected = selectedTags.includes(tagId as number)
                  const isThemeSupported = Object.keys(theme).includes('c-button-background');
                  return (
                    <TouchableOpacity
                      key={tagId.toString()}
                      style={[
                        styles.tagItem,
                        { borderColor: Object.keys(theme).includes('c-border-background') ? theme['c-border-background'] : '#ddd' },
                        isSelected && { borderColor: theme['c-button-background'], backgroundColor: isThemeSupported ? theme['c-button-background'] : 'rgba(0,0,0,0.1)' }
                      ]}
                      onPress={() => handleSelectTag(tagId as number)}
                    >
                      <Text
                        size={14}
                        color={isSelected ? theme['c-button-font'] : theme['c-font']}
                      >
                        {tagName}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </ScrollView>
          </View>
          
          <View style={[styles.footer, { borderTopColor: theme['c-border-background'] }]}>
            <TouchableOpacity style={styles.btn} onPress={onClose}>
              <Text color={theme['c-font-label']}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.btn, 
                { backgroundColor: Object.keys(theme).includes('c-button-background') ? theme['c-button-background'] : '#f0f0f0' }
              ]} 
              onPress={handleConfirm}
            >
              <Text color={theme['c-button-font']}>确定</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
})

const styles = createStyle({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    height: '70%',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 5,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  categoryList: {
    width: 100,
    borderRightWidth: 1,
  },
  categoryItem: {
    padding: 15,
    alignItems: 'center',
  },
  tagList: {
    flex: 1,
    padding: 15,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 15,
    borderTopWidth: 1,
  },
  btn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 10,
  },
})
