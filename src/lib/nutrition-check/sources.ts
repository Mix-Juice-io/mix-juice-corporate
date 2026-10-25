// Primary sources behind the nutrition labeling check. Every rule in
// rules.ts cites one of these, and the tool page lists them under
// "参考情報". Re-check them when CHECKED_ON gets old or a source is revised.

export const CHECKED_ON = '2026-10-26'

export type SourceId =
  | 'guideline'
  | 'qa'
  | 'notice'
  | 'leaflet'
  | 'standard'
  | 'jcpra'
  | 'foodRecycling'
  | 'plastic'

export interface Source {
  title: string
  publisher: string
  url: string
  /** Pages or Q&A numbers the rules rely on. */
  sections: string
}

export const SOURCES: Record<SourceId, Source> = {
  guideline: {
    title: '食品表示法に基づく栄養成分表示のためのガイドライン 第6版',
    publisher: '消費者庁（令和8年10月）',
    url: 'https://www.caa.go.jp/policies/policy/food_labeling/nutrient_declearation/business/assets/food_labeling_cms206_261001_01.pdf',
    sections:
      '4〜6頁（省略できる場合・表示を要しない場合・栄養表示の範囲）、35頁（推定値）',
  },
  qa: {
    title: '食品表示基準Q&A',
    publisher: '消費者庁（令和8年10月版）',
    url: 'https://www.caa.go.jp/policies/policy/food_labeling/food_labeling_act/assets/food_labeling_cms201_261001_17.pdf',
    sections:
      '加工-167〜170（小規模の事業者）、加工-189〜191（製造した場所での販売）',
  },
  notice: {
    title: '食品表示基準について（通知）',
    publisher: '消費者庁',
    url: 'https://www.caa.go.jp/policies/policy/food_labeling/food_labeling_act/assets/food_labeling_cms201_261001_08.pdf',
    sections: '総則関係（「販売」の考え方、小規模企業者の判断基準）',
  },
  leaflet: {
    title: '小規模の事業者における栄養成分表示の省略',
    publisher: '消費者庁（平成31年1月）',
    url: 'https://www.caa.go.jp/policies/policy/food_labeling/health_promotion/business/pdf/food_labeling_cms206_20200401_05.pdf',
    sections: '例①〜③（卸す場合、場所を借りる場合、会計だけを任せる場合）',
  },
  standard: {
    title: '食品表示基準（平成27年内閣府令第10号）',
    publisher: 'e-Gov法令検索',
    url: 'https://laws.e-gov.go.jp/law/427M60000002010',
    sections: '第3条第3項（省略できる場合）、第5条（表示を要しない場合）',
  },
  jcpra: {
    title: '容器包装リサイクル法の特定事業者（小規模事業者の適用除外）',
    publisher: '日本容器包装リサイクル協会',
    url: 'https://www.jcpra.or.jp/law/duty/specified/',
    sections: '小規模事業者の基準、従業員数・売上高の数え方',
  },
  foodRecycling: {
    title: '食品リサイクル法に基づく定期報告制度',
    publisher: '農林水産省',
    url: 'https://www.maff.go.jp/j/shokusan/recycle/syokuhin/s_houkoku/seido_gaiyo.html',
    sections: '定期報告の対象（前年度の食品廃棄物等の発生量が100トン以上）',
  },
  plastic: {
    title: 'プラスチックに係る資源循環の促進等に関する法律（パンフレット）',
    publisher: '環境省・経済産業省',
    url: 'https://plastic-circulation.env.go.jp/wp-content/themes/plastic/assets/pdf/pamphlet.pdf',
    sections:
      '特定プラスチック使用製品、対象業種、多量提供事業者（年5トン以上）',
  },
}
