import { redirect } from 'next/navigation';

export default function CareerIndex() {
  // 사용자가 대메뉴 "커리어 관리(/career)"를 누르면 자동으로 기본 탭인 "타임라인(/career/experiences)"으로 이동.
  redirect('/career/experiences');
}
