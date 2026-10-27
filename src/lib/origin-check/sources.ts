// Primary sources behind the origin labeling check. Every rule in rules.ts
// cites one of these, and the tool page lists them under "参考情報".
// Re-check them when CHECKED_ON gets old or a source is revised.

export const CHECKED_ON = '2026-10-27'

export type SourceId =
  'standard' | 'qaOrigin' | 'qaTable15' | 'qaProcessed' | 'notice' | 'manual'

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
      '第3条第2項（原料原産地名）・第3項（省略できる場合）、第5条（表示を要しない場合）、第10条（業務用加工食品）、別表第15（個別の品目）',
  },
  qaOrigin: {
    title: '食品表示基準Q&A 別添 新たな原料原産地表示制度',
    publisher: '消費者庁（令和8年10月版）',
    url: 'https://www.caa.go.jp/policies/policy/food_labeling/food_labeling_act/assets/food_labeling_cms201_261001_15.pdf',
    sections:
      '原原－1〜3（対象）、5〜18（対象原材料・表示の場所）、27〜41（又は表示・大括り表示・根拠書類）、42〜51（製造地表示）、55（業務用）、59〜61（個別の品目）',
  },
  qaTable15: {
    title: '食品表示基準Q&A 別添 原料原産地表示（別表15の1〜6）',
    publisher: '消費者庁',
    url: 'https://www.caa.go.jp/policies/policy/food_labeling/food_labeling_act/assets/food_labeling_cms201_260401_25.pdf',
    sections: '22食品群・個別の品目に当たるかの判断と表示方法',
  },
  qaProcessed: {
    title: '食品表示基準Q&A 第2章 加工食品',
    publisher: '消費者庁（令和8年10月版）',
    url: 'https://www.caa.go.jp/policies/policy/food_labeling/food_labeling_act/assets/food_labeling_cms201_261001_12.pdf',
    sections:
      '加工－57－1（重量の順）、150・151（輸入品）、190〜192（製造した場所での販売・量り売り）',
  },
  notice: {
    title: '食品表示基準について（通知）',
    publisher: '消費者庁（最終改正 令和8年10月1日）',
    url: 'https://www.caa.go.jp/policies/policy/food_labeling/food_labeling_act/assets/food_labeling_cms201_261001_06.pdf',
    sections: '原料原産地名（対象原材料、根拠書類の保管期間）',
  },
  manual: {
    title: '新しい原料原産地表示制度 －事業者向け活用マニュアル－',
    publisher: '農林水産省（令和4年3月修正版）',
    url: 'https://www.maff.go.jp/j/syouan/hyoji/attach/pdf/gengen_hyoji-6.pdf',
    sections:
      '判断のフローチャート（28〜29頁）、表示例、根拠書類の例（17〜21頁）、業務用の情報伝達（59〜66頁）',
  },
}
