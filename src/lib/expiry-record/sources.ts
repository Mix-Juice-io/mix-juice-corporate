// Primary sources behind the expiry date record. Every rule in rules.ts
// cites one of these, and the tool page lists them under "参考情報".
// Re-check them when CHECKED_ON gets old or a source is revised.

export const CHECKED_ON = '2026-10-28'

export type SourceId = 'guideline' | 'revision' | 'standard' | 'qaProcessed'

export interface Source {
  title: string
  publisher: string
  url: string
  /** Pages or Q&A numbers the rules rely on. */
  sections: string
}

export const SOURCES: Record<SourceId, Source> = {
  guideline: {
    title:
      '食品期限表示の設定のためのガイドライン（期限表示に関するQ&Aを含む）',
    publisher: '消費者庁（令和7年3月、令和8年4月掲載版）',
    url: 'https://www.caa.go.jp/policies/policy/food_labeling/food_labeling_act/assets/food_labeling_cms201_260401_30.pdf',
    sections:
      '2(1)〜(5)（期限の設定、指標と基準、安全係数、類似食品、根拠資料）、Q&A 期限（事）－2・5・10・12',
  },
  revision: {
    title: '食品表示基準Q&A 第20次改正 新旧対照表',
    publisher: '消費者庁（令和7年3月28日）',
    url: 'https://www.caa.go.jp/policies/policy/food_labeling/food_labeling_act/assets/food_labeling_cms201_250328_1032.pdf',
    sections: '旧 加工－22（安全係数「0.8以上を目安」の削除）',
  },
  standard: {
    title: '食品表示基準（平成27年内閣府令第10号）',
    publisher: 'e-Gov法令検索',
    url: 'https://laws.e-gov.go.jp/law/427M60000002010',
    sections:
      '第2条（消費期限・賞味期限の定義）、第3条第3項（期限表示を省略できる品目）、第5条（表示を要しない場合）',
  },
  qaProcessed: {
    title: '食品表示基準Q&A 第2章 加工食品',
    publisher: '消費者庁（令和8年10月版）',
    url: 'https://www.caa.go.jp/policies/policy/food_labeling/food_labeling_act/assets/food_labeling_cms201_261001_12.pdf',
    sections: '加工－161（省略できる品目に原材料を混ぜた場合）',
  },
}
