---
title: '[HTTP 완벽 가이드] 16. 국제화'
published: 2023-03-08 23:45:54
description: HTTP `Content-Type charset 매개 변수`, `Content-Language`를 통해 엔터티 본문에 무엇이 들어있고, 어떻게 올바른 글자로 바꾸며, 텍스트가 어떤 언어에 해당되는지 해석한다.
tags: ['HTTP 완벽 가이드', '국제화']
category: Network
draft: false
---

:::note
HTTP `Content-Type charset 매개 변수`, `Content-Language`를 통해 엔터티 본문에 무엇이 들어있고, 어떻게 올바른 글자로 바꾸며, 텍스트가 어떤 언어에 해당되는지 해석한다.
:::

## 키워드

`charset`, `UTF-8` , `가변폭 길이 인코딩`, `고정폭 길이 인코딩`

## 메모 및 핵심 요점

- HTTP는 여러 언어와 문자로 된 국제 문서들의 처리 및 전송을 지원해야 한다.
  - 주요 국제화 이슈 : 문자집합 인코딩 (여러 언어의 문자로 텍스트를 보여주고 요청), 언어 태그(사용자가 이해할 수 있는 언어만으로 콘텐츠를 서술하기 위함)
- **국제적인 콘텐츠를 다루기 위해 필요한 HTTP 지원**
  - HTTP에서 엔터티 본문이란 그저 비트들로 가득 상자 → 이 내용을 클라이언트가 올바르게 문자들로 풀어나고 처리해서 사용자에게 제공해야 함.
  - HTTP `Content-Type charset 매개 변수`, `Content-Language` 헤더 (서버 → 클라이언트)
    - 엔터티 본문에 무엇이 들어있고, 어떻게 올바른 글자로 바꾸며, 텍스트가 어떤 언어에 해당되는지
  - Accept-Charset, Accept Language (클라이언트 → 서버)
    - 자신이 어떤 차셋 인코딩 알고리즘들과 언어들을 이해하고, 어떤걸 선호하는지
- **문자집합과 HTTP**
  - Charset - 어떻게 엔터티 콘텐츠 비트들을 특정 문자 체계의 글자들로 바꾸는지 말해준다. (비트 → 글자 변환 (역도 성립) 하는 알고리즘 명명)
  - 예시) `Content-Type: text/html; charset=iso-8859-6` 수신자에게 콘텐츠가 HTML 파일임을 말해주고, 엔터티 본문을 디코딩하기 위해서는 iso-8859-6 알고리즘을 사용해야 한다. (= 이 엔터티 본문은 iso-8859-6 알고리즘으로 인코딩 되어 있다.)
  - 비트 → 문자 변환 과정
    1. 비트를 문자 코드로 변환
    2. 문자 코드를 이용하여 문자 집합의 특정 요소 선택
  - MIME 차셋 : 특정 문자 인코딩과 특정 코딩된 문자집합의 결합
    - HTTP에서는 표준화된 MIME 차셋 태그를 Content-Type과 Accept-Charset 헤더에 사용함
      - `Content-type charset` : **서버 → 클라이언트**, 명시되어 있지 않으면 수신자는 **문서의 콘텐츠로 부터** (**HTTP의 meta 태그, `<META HTTP-EQUIV="Content-Type">` 태그에서 찾을 수 있다.**) 문자집합을 추측하려 시도함.
        - `Content-type charset`과 `META Content-Type`이 없거나, 문서가 HTML이 아닌 경우 → 실제 텍스트를 스캐닝하여 문자 인코딩을 추측함.
      - `Accept-Charset` : 클라이언트 → 서버, 클라이언트가 어떤 문자 체계를 지원하는지 알려줌.
- **다중언어 문자 인코딩에 대한 지침**
  - 용어 : 글리프(glyph), 코딩된 문자(coded character), 코드 공간(coding space), 코드 너비(code width), 사용 가능 문자 집합(character repertorie), 코딩된 문자 집합(coded character set), 문자 인코딩 구조(coded character set)
  - 글리프와 문자
    - 문자 : 유일하고 추상화된 언어의 요소, 글꼴이나 스타일에 독립적
    - 글리프 : 각 글자를 그리는 특정한 방법
      ⇒ **글리프 하나를 다른 것으로 바꾸었을 때 텍스트의 의미가 바뀐다면, 두 글리프들은 서로 다른 글자다.** 아니라면, 그것들은 모양만 다를 뿐 같은 글자다.
  - 코딩된 문자 집합
    - US-ASCII : 0-127의 값 사용, 전체를 표현하는데 7비트 필요. HTTP 메시지(헤더, URI등등)은 US-ASCII 사용
    - ios-8859 (단일 바이트 문자 집합) : 8비트 고정폭 아이덴티티 인코딩 사용, US-ASCII + 하이비트 (국제적인 글쓰기를 위해 필요한 글자들 추가), 지역에 따라 커스터마이징된 문자집합을 제공
    - JIS
    - UCS
  - 문자 인코딩 구조
    - 고정폭 : 각 코딩된 문자를 고정된 길이의 비트로 표현, 빠르게 처리할 수 있으나 공간 낭비 우려
    - 가변폭 : 다른 문자 코드 번호에 다른 길이의 비트를 사용, 고정폭에 비해 효율적이다.
      - **비모달 (Non-modal encoding)** : 모드를 표시하지 않는다. 현재 표준인 UTF-8이 비모달 방식이므로 가장 널리 사용된다.
        예시 - `UTF-8`
      - **모달 (Modal encoding)** : 특정 비트 패턴 (escape 패턴이라고 한다)를 사용하여 다른 모드를 표시한다. 모드를 전환하면 문자 집합이 바뀌기 때문에 다양한 문자 집합을 지원할 수 있다. (복잡하고 비효율적임)
        예시 - `ISO 2022-JP`
    - **몇 가지 인코딩 구조 예시**
      - 8비트
      - UTF-8 (UCS Transformation Format)
        - 비모달 가변길이 인코딩 사용,
        - **첫 바이트의 선두 비트들은 인코딩된 문자의 길이를 바이트 단위로** 나타내고, **그 이후의 바이트들은 각각 6비트의 코드 값**을 담음)
        - 아스키와의 호환성 확보 (iso 8859와는 호환되지 않음)
      - iso-2022-jp
        - 가변길이 모달 인코딩 사용
        - 이스케이프 문자열을 통하여 다른 문자 집합으로 전환
      - euc-kr
        - 한글 인터넷 문서를 위해 널리 사용되는 가변 길이 인코딩 (비모달)
        - KS X 1003 (1바이트로 인코딩), KS X 1001(2바이트로 인코딩, 한글을 표현하기 부족하므로 한글 채움 문자를 이용하여 한글을 표현함. → (채움: 0xA4, 0xD4) 초성 중성 종성 으로 표현) 지원
- **언어 태그와 HTTP**
  - 언어 태그 : 언어에 이름을 붙이기 위한 짧고 표준화된 문자열
  - Content-Language 헤더
    - 엔터티가 어떤 언어 사용자를 대상으로 하고 있는지 서술
    - 텍스트 문서 뿐만 아니라, 다양한 타입의 애플리케이션에 사용됨 (어떤 종류의 미디어라도)
  - Accept-Language 헤더
    - 클라이언트 요청에 사용, 이 헤더를 통해 웹 서버는 우리가 선호하는 언어로된 콘텐츠를 줄 수 있다.
- **대소문자의 구분 및 표현**
  - 모든 태그는 대소문자가 구분되지 않는다. 그러나 관영적으로 언어를 나타낼 때는 소문자를 사용하고, 국가를 나타낼 때는 대문자를 사용한다
- **국제화된 URI**
  - 에약된 문자들은 많은 URI에서 특별한 의미를 가지며, 일반적으로 사용할 수는 없다.
    - `;`, `/`, `?`, `:`, `@`, `&`, `=`, `+`, `$`, `,`
  - 이스케이핑과 역 이스케이핑
    - URI 이스케이프 : 예약된 문자나 다른 지원하지 않는 글자들을 안전하게 URI에 삽입할 수 있는 방법 제공

## 스터디에서 배운 내용

- `encodeURI()` : URI에서 특별한 뜻을 가진 문자(예약 문자)는 인코딩 하지 않습니다. (encodeURI() 혼자서는 XMLHttpRequest 등이 사용할, 적합한 HTTP GET과 POST 요청을 구성할 수 없습니다)
- `encodeURIComponent()` : encodeURIComponent()를 사용해, 서버에 POST로 요청할 양식 필드를 인코딩 하세요. 입력 중 의도치 않게 생성될 수 있는 HTML 특수 개체 등의 "&" 문자를 처리할 수 있습니다.

> encodeURI() 혼자서는 XMLHttpRequest 등이 사용할, 적합한 HTTP GET과 POST 요청을 구성할 수 없습니다. GET과 POST에서 특별한 문자로 취급하는 "&", "+", "="를 인코딩 하지 않기 때문입니다. 그러나 encodeURIComponent()는 저 세 문자도 인코딩 대상에 포함합니다.

참고 : [https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/encodeURI](https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/encodeURI)

## 인용

> 국제화된 문자 시스템의 핵심 목표는 표현(시각적인 표현 방식)에서 의미(글자들)을 분리하는 것이다. HTTP는 문자 데이터 및 그와 관련한 언어와 차셋 라벨의 전송에만 관심을 갖는다. 그림 16-2c와 같이, 글자의 모양을 어떻게 표현할 것인가 하는 것은 사용자의 그래픽 디스플레이 소프트웨어(브라우저, 운영체제, 글꼴)가 결정한다. (431p)

> 엄밀히 말해, MIME 차셋 태그 (Content-Type charset 매개변수와 Accept-Charset 헤더에서 쓰이는)는 문자집합을 의미한느 것이 결코 아니다. MIME 차셋 값은 데이터 비트를 고유한 문자의 코드로 매핑하는 알고리즘의 이름이다. 이것은 문자 인코딩 구조와 코딩된 문자집합의 개념을 합친 것이다. (435p)

> (옮긴이) 오늘날 URI에 대한 최신 명세인 RFC 3986은 URI에 UTF-8 문자를 사용할 수 있는 방법을 명시적으로 제시하고 있으므로, 다양한 문자들을 별 문제 없이 사용할 수 있다. (450p)

> 내부적으로 HTTP 애플리케이션은 URI를 데이터가 필요할 때만 언이스케이핑 해야 한다. 그리고 더 중요한 것은, 애플리케이션은 어떤 URI도 결코 두 번 언이스케이핑 되지 않도록 해야 한다. 왜냐하면 이스케이핑된 퍼센트 기호를 포함한 URI를 언이스케이핑하면 퍼센트 기호가 포함된 URI가 만들어지게 될 것인데, 여기서 잘못하여 한 번 더 언이스케이핑을 하게 되면 이 퍼센트 기호 뒤에 있는 문자들이 이스케이프의 일부인 것 처럼 처리되어 데이터의 손실을 유발할 수도 있기 때문이다. (452p)
