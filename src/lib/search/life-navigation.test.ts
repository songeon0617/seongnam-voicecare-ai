import test from 'node:test';
import assert from 'node:assert/strict';
import {LIFE_CATEGORIES} from '@/lib/life-navigation';
import {officialHandoff,freeOfficialNavigation} from '@/lib/public-information/official-handoff';
import {createExpandedPublicInformationResponse as run} from './expanded-public-information';
import {readSearchAnswer} from './read-search-answer';

for(const category of LIFE_CATEGORIES)for(const item of category.items)test(`생활정보 메뉴 무료 경로: ${item.label}`,async()=>{
 const result=await run({query:item.query},{search:async()=>assert.fail('menu must not require a paid search')});
 assert.equal(result.status,200);assert.ok(readSearchAnswer(result.body));
 assert.ok('answer' in result.body);
 assert.ok(['answer','clarification','guidance'].includes(result.body.kind ?? ''));
 if(result.body.kind==='guidance'){const handoff=officialHandoff(item.query);assert.ok(handoff?.links.length);assert.equal(result.body.answer.plainLanguageSummary,handoff.summary);}
});
test('공식 연결은 외부 지역을 성남 기관으로 바꾸지 않고 상세 정책 검색을 대체하지 않는다',()=>{
 assert.equal(officialHandoff('수원시 여권 발급'),undefined);
 assert.equal(freeOfficialNavigation('성남시 여권 발급 서류와 비용'),undefined);
 assert.equal(freeOfficialNavigation('방문건강관리 오늘 예약 가능해?'),undefined);
 assert.equal(officialHandoff('정부 민원 상담')?.phone,'110');
 assert.ok(!officialHandoff('성남 도서관 이용 안내')?.links.some(l=>/110|gov.kr/.test(l.url)));
});
