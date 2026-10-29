// Primary sources behind the packaging positive list ledger. Every note in
// rules.ts cites one of these, and the tool page lists them under "参考情報".
// Re-check them when CHECKED_ON gets old or a source is revised.

export const CHECKED_ON = '2026-10-30'

export type SourceId = 'act' | 'regulation' | 'notice' | 'qa' | 'qaDelay'

export interface Source {
  title: string
  publisher: string
  url: string
  /** Articles or Q&A numbers the notes rely on. */
  sections: string
}

export const SOURCES: Record<SourceId, Source> = {
  act: {
    title: '食品衛生法（昭和22年法律第233号）',
    publisher: 'e-Gov法令検索',
    url: 'https://laws.e-gov.go.jp/law/322AC0000000233',
    sections:
      '第18条第2項・第3項（規格に合わない容器包装の使用禁止、ポジティブリスト制度）、第53条（販売の相手方への説明）',
  },
  regulation: {
    title: '食品衛生法施行規則（昭和23年厚生省令第23号）',
    publisher: 'e-Gov法令検索',
    url: 'https://laws.e-gov.go.jp/law/323M40000100023',
    sections: '第66条の6（情報伝達の方法）',
  },
  notice: {
    title:
      '食品衛生法等の一部を改正する法律の施行に伴う関係政省令の制定について（生食発1107第1号）',
    publisher: '厚生労働省（最終改正 令和6年3月28日、消費者庁掲載）',
    url: 'https://www.caa.go.jp/policies/policy/standards_evaluation/appliance/notice/assets/standards_cms101_250529_008.pdf',
    sections:
      '別添 第1の5 ロ(2)ⅱ（販売先に伝える使用条件）、ハ（情報伝達：伝える内容、記録・保存、使える書類）',
  },
  qa: {
    title: '器具及び容器包装のポジティブリスト制度に関するＱ＆Ａ',
    publisher: '消費者庁（令和8年6月5日 事務連絡）',
    url: 'https://www.caa.go.jp/policies/policy/standards_evaluation/appliance/notice/assets/standards_cms101_260605_03.pdf',
    sections:
      '問1・問2（対象となる材質）、問10（複数の層）、問12（食品に触れない部分）、問17（着色料）、問43・問43の2（経過措置）',
  },
  qaDelay: {
    title: '食品用器具及び容器包装のポジティブリスト制度に関するＱ＆Ａ',
    publisher: '消費者庁・厚生労働省（令和7年5月23日 事務連絡）',
    url: 'https://www.caa.go.jp/policies/policy/standards_evaluation/appliance/positive_list_new/assets/standards_cms101_250526_001.pdf',
    sections: '確認が令和7年6月1日までに間に合わない場合',
  },
}
