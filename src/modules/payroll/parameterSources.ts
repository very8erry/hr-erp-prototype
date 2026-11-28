import type {ParameterCandidate,ParameterSource} from './payrollParameters'
const source=(title:string,url:string,keyword:string,location:string):ParameterSource=>({title,url,keyword,location,checkedAt:'2026-11-27'})
const labor=source('근로기준법 제56조','https://law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1034323029','연장·야간 50% 가산, 휴일 8시간 초과 100% 가산','제56조 제1~3항')
const pension=source('국민연금공단 2026 사업장 실무안내','https://www.nps.or.kr/fileDown.do?atchFileId=FL26000086&atchFileSn=1','보험료율·사업장가입자 부담·기준소득월액','PDF 53쪽(책자 47쪽) · 연금보험료 / 기준소득월액')
pension.sha256='97c9f4c7dd06c3224df23d98c520621ee6d41f3117af169fdbe55c29b39a34d3'
const pensionJuly=source('국민연금공단 기준소득월액 상·하한','https://www.nps.or.kr/eng/ntnlpnsplan/cntb/getOHAI0013M0.do?menuId=MN24001366','2026년 7월~2027년 6월 하한 410,000원, 상한 6,590,000원','Standard Monthly Income')
const health=source('국민건강보험공단 2026 제도 안내','https://www.nhis.or.kr/renewal_popup/poster/20260204_poster_longdesc_1.html','건강보험료율 7.19%, 장기요양 소득 대비 0.9448%','2026년 달라지는 건강·장기요양제도 I')
const employment=source('고용노동부 고용보험 제도 안내','https://www.moel.go.kr/info/astmgmt/employ/employList.do','실업급여 근로자 부담 0.9%, 월평균보수에 요율 적용','고용보험료율 / 보험료 부과')
export const parameterCandidates:ParameterCandidate[]=[
 ...([{key:'overtime',value:1.5},{key:'night',value:.5},{key:'holiday',value:1.5},{key:'holidayExtra',value:.5}] as const).map(p=>({...p,from:'2025-01-01',to:'2026-12-31',source:labor})),
 {key:'pension',value:.0475,from:'2026-01-01',to:'2026-12-31',source:pension},
 {key:'pensionMin',value:400000,from:'2026-01-01',to:'2026-06-30',source:pension},
 {key:'pensionMax',value:6370000,from:'2026-01-01',to:'2026-06-30',source:pension},
 {key:'pensionMin',value:410000,from:'2026-07-01',to:'2026-12-31',source:pensionJuly},
 {key:'pensionMax',value:6590000,from:'2026-07-01',to:'2026-12-31',source:pensionJuly},
 {key:'health',value:.0719,from:'2026-01-01',to:'2026-12-31',source:health},
 {key:'care',value:.009448/.0719,from:'2026-01-01',to:'2026-12-31',source:{...health,keyword:'건강보험료 × (0.9448 ÷ 7.19)'}},
 {key:'employment',value:.009,from:'2026-01-01',to:'2026-12-31',source:employment},
]
export const insuranceManuals=[
 pension,
 source('국민건강보험 EDI 보수총액통보서 작성 도움말','https://edi.nhis.or.kr/webedi/help/html/appli/ap_12.html','공단 자료 조회, 전년도 보수총액·근무월수 신고 후 정산','직장가입자 보수총액통보서'),
 source('근로복지공단 보수총액 신고 안내 (고용노동부 게시)','https://moel.go.kr/news/enews/report/enewsView.do?news_seq=19013','전년도 보수총액 신고로 전년도 보험료 정산 및 당해 보험료 부과','2026년 보수총액 신고 안내'),
]
