// Primary sources behind the food label maker. Every note in rules.ts cites
// one of these, and the tool page lists them under "参考情報".
// Re-check them when CHECKED_ON gets old or a source is revised.

export const CHECKED_ON = '2026-10-30'

export type SourceId =
  | 'standard'
  | 'forms'
  | 'notice'
  | 'allergenNotice'
  | 'qaProcessed'
  | 'qaAllergen'
  | 'qaOrigin'
  | 'guidebook'

export interface Source {
  title: string
  publisher: string
  url: string
  /** Pages or Q&A numbers the rules rely on. */
  sections: string
}

export const SOURCES: Record<SourceId, Source> = {
  standard: {
    title: '食品表示基準（平成27年内閣府令第10号）',
    publisher: 'e-Gov法令検索',
    url: 'https://laws.e-gov.go.jp/law/427M60000002010',
    sections:
      '第3条第1項（原材料名・添加物・内容量・期限・保存の方法・食品関連事業者・製造所・栄養成分）、第3条第3項（省略できる場合）、第8条（表示の方式・文字の大きさ）、別表第十四（特定原材料）',
  },
  forms: {
    title: '食品表示基準 別記様式一〜四',
    publisher: '消費者庁',
    url: 'https://www.caa.go.jp/policies/policy/food_labeling/food_labeling_act/assets/food_labeling_cms201_240823_7.pdf',
    sections:
      '別記様式一と備考2・3・5・6・7（一括表示の項目と順序、枠外への表示）、別記様式二（栄養成分表示）',
  },
  notice: {
    title: '食品表示基準について（通知）',
    publisher: '消費者庁（最終改正 令和8年10月1日）',
    url: 'https://www.caa.go.jp/policies/policy/food_labeling/food_labeling_act/assets/food_labeling_cms201_261001_06.pdf',
    sections:
      '期限の書き方（4〜5頁）、栄養成分の推定値と根拠資料（8〜10頁）、食品関連事業者の氏名・住所（11〜12頁）、最小表示の位（33〜34頁）',
  },
  allergenNotice: {
    title: '食品表示基準について 別添 アレルゲンを含む食品に関する表示',
    publisher: '消費者庁（令和8年10月版）',
    url: 'https://www.caa.go.jp/policies/policy/food_labeling/food_labeling_act/assets/food_labeling_cms201_261001_07.pdf',
    sections: '2（表示の対象）、3(1)（個別表示）、3(3)（一括表示）',
  },
  qaProcessed: {
    title: '食品表示基準Q&A 第2章 加工食品',
    publisher: '消費者庁（令和8年10月版）',
    url: 'https://www.caa.go.jp/policies/policy/food_labeling/food_labeling_act/assets/food_labeling_cms201_261001_12.pdf',
    sections:
      '加工－12・160（保存方法の省略）、51・54（複合原材料）、57－1（重量の順）、74・248（原材料と添加物の区分）、102（推定値と強調表示）、114・115・252（製造者・販売者と製造所）、239（枠外への表示）',
  },
  qaAllergen: {
    title: '食品表示基準Q&A 別添 アレルゲンを含む食品に関する表示',
    publisher: '消費者庁（令和8年10月版）',
    url: 'https://www.caa.go.jp/policies/policy/food_labeling/food_labeling_act/assets/food_labeling_cms201_261001_14.pdf',
    sections: 'B－2（対象品目の見直し）、E－6〜9（一括表示）',
  },
  qaOrigin: {
    title: '食品表示基準Q&A 別添 新たな原料原産地表示制度',
    publisher: '消費者庁（令和8年10月版）',
    url: 'https://www.caa.go.jp/policies/policy/food_labeling/food_labeling_act/assets/food_labeling_cms201_261001_15.pdf',
    sections: '原原－5（水の扱い）',
  },
  guidebook: {
    title: 'インターネット販売における食品表示の情報提供に関するガイドブック',
    publisher: '消費者庁（令和4年6月）',
    url: 'https://www.caa.go.jp/policies/policy/food_labeling/information/guideline/assets/food_labeling_cms202_221202_01.pdf',
    sections:
      '本書の目的（2頁）、食品表示基準について（5頁）、正確な情報伝達（8〜9頁）、掲載する情報の概要（11頁）',
  },
}
