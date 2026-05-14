# PhotoBook

개인용 A4 포토북 편집기입니다. 브라우저에서 사진을 페이지별 레이아웃에 배치하고, 캡션과 텍스트, 스탬프를 더한 뒤 전체 페이지를 PNG 또는 JPEG로 저장할 수 있습니다. 작업 내용은 브라우저에 자동 저장되며, `.photobook` 작업 파일로 저장해 다른 환경에서 이어서 편집할 수 있습니다.

## 스크린샷

추가 예정입니다.

## 주요 기능

- 표지, 본문, 타이틀, 콜로폰, 양면 펼침면 레이아웃 지원
- 기본 레이아웃과 428개 가져온 A4 레이아웃 제공
- 535개 스탬프 데이터 제공 및 드래그 배치
- 클릭 업로드와 드래그 앤 드롭 사진 추가
- 사진별 캡션, 필터, 꽉 채우기 / 원본 비율 맞춤 설정
- 레이아웃 텍스트 입력과 폰트, 언어, 글자 크기 설정
- 한국어 / 일본어 UI 전환
- 본문 페이지 수 선택, 페이지 순서 변경, 전체 페이지 보기
- 전체 배경색 변경과 인쇄 보증 외 가이드 표시 전환
- 브라우저 로컬 저장소 자동 저장
- 실행 취소 / 다시 실행 및 단축키 지원
- 작업 파일(`.photobook`) 저장과 불러오기
- 전체 페이지 PNG/JPEG 저장
- 개별 파일 다운로드 또는 ZIP 묶음 저장

## 실행 방법

의존성을 설치합니다.

```bash
npm install
```

개발 서버를 실행합니다.

```bash
npm run dev
```

프로덕션 빌드를 확인합니다.

```bash
npm run build
```

빌드 결과를 로컬에서 미리 봅니다.

```bash
npm run preview
```

## 개발 및 검증 명령

```bash
npm run lint
npm run test
npm run test:e2e
npm run sync:stamps
```

- `npm run lint`: ESLint 검사
- `npm run test`: Vitest 단위 테스트 실행
- `npm run test:e2e`: 프로덕션 빌드 후 Playwright E2E 테스트 실행
- `npm run sync:stamps`: 스탬프 데이터를 동기화하는 스크립트 실행

## 프로젝트 구조

- `src/components`: 편집기 화면, 사이드바, A4 페이지, 모달 UI
- `src/store`: Zustand 기반 프로젝트 상태와 페이지/사진/스탬프 조작 로직
- `src/hooks`: 내보내기, 단축키, 페이지 스케일, 텍스트 선택 훅
- `src/utils`: 레이아웃, 이미지 저장/리사이즈, 작업 파일, 스탬프 유틸리티
- `src/workers`: ZIP 내보내기용 Web Worker와 메시지 프로토콜
- `public/data`: 가져온 A4 레이아웃과 스탬프 매니페스트/이미지 자산
- `tests/e2e`: Playwright 기반 주요 화면 흐름 테스트

## 데이터 저장 방식

- 사진 데이터와 프로젝트 설정은 브라우저 로컬 저장소에 저장됩니다.
- 다른 브라우저나 다른 기기에서는 저장된 프로젝트가 자동으로 공유되지 않습니다.
- 다른 환경으로 옮길 때는 작업 파일로 저장한 뒤 해당 파일을 불러오세요.
- `.photobook` 파일은 프로젝트 메타데이터와 이미지 데이터를 담는 ZIP 기반 작업 파일입니다.
- 사진 업로드 크기 제한과 사용하지 않는 사진 데이터 정리는 앱 설정에서 조정할 수 있습니다.

## 기술 스택

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Zustand / zundo
- dnd-kit
- html-to-image
- JSZip
- Vitest
- Playwright
- vite-plugin-pwa
