// Primary sources behind the salt equivalent converter. The tool page lists
// them under "参考情報". Re-check them when CHECKED_ON gets old or a source
// is revised.

export const CHECKED_ON = '2026-11-03'

export type SourceId = 'standard' | 'guideline' | 'notice'

export interface Source {
  title: string
  publisher: string
  url: string
  /** Articles or pages the tool relies on. */
  sections: string
}

export const SOURCES: Record<SourceId, Source> = {
  standard: {
    title: '食品表示基準（平成27年内閣府令第10号）',
    publisher: 'e-Gov法令検索',
    url: 'https://laws.e-gov.go.jp/law/427M60000002010',
    sections:
      '第3条第1項（食塩相当量はナトリウムの量に2.54を乗じたもの）、第7条（ナトリウム塩を添加していない食品でのナトリウムの量の表示）',
  },
  guideline: {
    title: '食品表示法に基づく栄養成分表示のためのガイドライン 第6版',
    publisher: '消費者庁（令和8年10月）',
    url: 'https://www.caa.go.jp/policies/policy/food_labeling/nutrient_declearation/business/assets/food_labeling_cms206_261001_01.pdf',
    sections: '表示値の丸め方、0と表示できる量の考え方',
  },
  notice: {
    title: '食品表示基準について（通知）',
    publisher: '消費者庁（最終改正 令和8年10月1日）',
    url: 'https://www.caa.go.jp/policies/policy/food_labeling/food_labeling_act/assets/food_labeling_cms201_261001_06.pdf',
    sections: '最小表示の位（33〜34頁）',
  },
}
