import { redirect } from 'next/navigation';

export default function CareerIndex() {
  // 사용자가 대메뉴 "커리어 관리(/career)"를 누르면 기본 탭인 프로젝트 보관함으로 이동.
  redirect('/career/projects');
}
