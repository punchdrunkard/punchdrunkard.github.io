---
title: '[HTTP 완벽 가이드] 07. 캐시'
published: 2023-01-24 23:40:32
description: 캐시를 통해서 두 가지 측면의 이득을 볼 수 있다. 1. 클라이언트와의 물리적인 거리를 극복하여 빠르게 데이터를 제공한다. 2. 원 서버에 대한 병목을 줄인다.
tags: ['HTTP 완벽 가이드', '캐시','Cache-Control']
category: Network
thumbnail: './images/thumbnail.png'
draft: false
---

## 키워드

`캐시`, `캐시 적중(cache hit)`, `If-Modified-Since`, `적중률`, `문서 적중률`, `바이트 적중률`, `304 Not Modified`, `Cache-Control`

## 메모 및 핵심 요점

- 캐시를 통해서 이득을 볼 수 있는 부분 : 불필요한 요청을 줄일 수 있다. 네트워크 대역폭의 병목을 줄일 수 있다. 갑작스런 요청쇄도에 대처할 수 있다. 거리로 인한 지연을 줄일 수 있다.
  - 요약하자면 캐시를 통해서 두 가지 측면의 이득을 볼 수 있다. **1. 클라이언트와의 물리적인 거리를 극복하여 빠르게 데이터를 제공한다.** **2. 원 서버에 대한 병목을 줄인다.**
- 캐시의 재검사 : 캐시는 그들이 가지고 있는 사본과 원 서버가 가지고 있는 원본이 같은지 비교하기 위해 (해당 데이터에 대한 신선도라고 표현한다) 재검사를 수행한다. 이 재검사는 캐시 서버에서 원본 서버에서 메시지를 보내는 방식으로 동작하는데, 이 메시지는 기존 HTTP 요청에 비해서 작은 메시지를 사용하기 때문에 클라이언트와 캐시 사이의 트랜잭션 속도에 비해서는 느리지만, 기존의 클라이언트와 서버의 트랜잭션 속도 보다는 빠르다.
  클라이언트에서 `If-Modified-Since` 헤더를 통하여, 캐시 재검증 요청을 할 수 있다.
  - 재검사를 할 때, 캐시가 가지고 있는 데이터와 원본이 달라진게 없다면 이를 **재검사 적중** (혹은 느린 적중) 이라고 하고 서버는 클라이언트에게 `HTTP 304 Not Modified` 응답을 보낸다.
  - 캐시가 가지고 있는 데이터와 원본이 달라졌다면 이를 **재검사 부적중**이라고 하고 서버는 클라이언트에게 `HTTP 200 OK` 응답을 보낸다.
  - 서버 객체가 삭제된 경우, 서버는 `404 Not Found` 응답을 돌려보내며, 캐시는 사본을 삭제한다.
- 캐시 적중률 : **1. 문서 적중률 2. 바이트 적중률**
  - 문서 적중률 : 캐시가 요청을 처리하는 비율 ⇒ 문서 적중률이 높다는 것은 캐시에서 요청을 대부분 처리했다는 의미이므로 원 서버까지의 지연이 줄어들었다는 의미이다.
  - 바이트 적중률: 캐시를 통해 제공된 모든 바이트의 비율 ⇒ 바이트 적중률이 높다는 것은 캐시를 통해 많은 용량이 제공되었다는 의미이므로 네트워크 대역폭에서 이득을 보았다는 의미이다.
- 캐시의 종류 : **1. 개인 전용 캐시 2. 공용 프락시 캐시**
  - 개인 전용 캐시 : 웹브라우저 사용. 컴퓨터의 메모리와 디스크에 캐시된 내용을 저장함.
  - 공용 프락시 캐시 : 캐시 프락시 서버를 이용
- 캐시 처리 단계 : 1. 요청 받기 → 2. 파싱 → 3. 검색 → 4. 신선도 검사 → 5. 응답 생성 → 6. 발송 → (7. 로깅)
- 캐시 유효기간을 나타내는 헤더

  - ~~HTTP/1.0+ Expires : 절대 유효기간을 명시. → 컴퓨터의 시간이 올바르게 맞춰져 있어야 함.~~

    이 헤더는 사용하지 않기를 권함 (**Deprecated됨**)

  - **`HTTP/1.1 Cache-Control`** : 문서의 최대 나이 명시, `Cache-control: max-age` 헤더를 통해, `Cache-control: max-age=3600`과 같은 형태로 사용한다. max-age에 명시된 시간이 지나면 신선도 검사를 수행하도록 한다. **이 값을 0으로 설정한다면, 캐시가 매 접근마다 문서를 캐시하지 않거나 리프레시 하도록 요청할 수 있다.**

- 효율적인 재검사를 위하여 조건부 메서드(`If-Modified-Since` 와 `If-None-Match` )를 사용한다.
- 캐시 제어 (`Cache Control`)

  - `no-store`: 캐시에 해당 객체를 저장할 수 없도록 한다. (절대 캐시하면 안되는 리소스일 때 사용한다. 즉 브라우저는 이 값이 있다면 해당 리소스를 캐시 저장소에 절대로 저장하지 않는다.)
  - `no-cache` : 응답이 캐시 저장소에 저장될 수 있으나, 먼저 서버와 재검사를 하지 않으면 캐시에서 클라이언트로 제공될 수 없다. (`max-age=0`과 동일한 의미를 가진다. 캐시는 저장하지만 사용할 때 마다 서버에 재검증 요청을 보내야 한다.)
  - `max-age`
  - `expires`
  - `must-revalidate` : 캐시가 이 객체의 신선하지 않은 사본을 원 서버와의 최초의 재검사 없이는 재공해서는 안된다. (🌧️ 성능을 위하여 캐시가 만료 정보를 따르지 않고 제공하는 경우가 있는데, 이러한 경우를 방지한다. 즉, 캐시가 만료 정보에 해당된다면 무조건 재검사를 시키는 방식이다.)
  - `public`: 모든 사람과 중간 서버가 캐시를 저장할 수 있음
  - `private` : 가장 끝의 사용자 브라우저에서만 캐시를 저장할 수 있음

## 스터디에서 배운 내용

### 프론트엔드에서 캐시 사용하기

**[참고자료 : 웹 서비스 캐시 똑똑하게 다루기 | toss tech](https://toss.tech/article/smart-web-service-cache)**

- `max-age:0` 을 설정하였을 떄, 리소스를 요청할 때마다 서버에 재검증 요청을 하는 동작을 기대하지만, 실제로 일부 브라우저의 경우 **웹 브라우저를 껐다 켜기 전까지 리소스가 만료되지 않도록 하는 경우가 있다.**
- Cache-Control `no-cache` 와 `no-store`의 차이 점
  - `no-cache` : `max-age:0`과 같은 의미를 가진다. 브라우저는 해당 리소스를 캐시하되, **사용할 때 마다 재검증 요청을 보내야 한다.**
  - `no-store` : 절대로 캐시해서는 안되는 리소스에 사용한다. 이 값이 있다면 브라우저는 해당 리소스를 **어떤 경우에도 캐시 저장소에 저장하지 않는다.**
- 한 번 저장된 캐시를 지우기 어려운 이유
  캐시는 여러 레이어에 저장될 수 있고, 각 레이어는 독립적이기 때문에 전체 캐시를 지우기 위해서는 레이어 각각에 대해서 캐시를 지워줘야 한다. 예를 든다면, 브라우저와 중간 서버, CDN이 여러개 있는 경우 각각에 대해서 캐시가 따로 저장되는데 이 따로 저장된 캐시를 지우는 작업이 필요하다. **(이렇게 중간 서버의 캐시를 지우는 작업을 CDN Invalidatation 이라고 함)**
- Cache-Control: `private`, `public`
  - `public` : 모든 사람과 중간 서버가 캐시를 저장할 수 있음
  - `private` : 가장 끝의 사용자 브라우저에서만 캐시를 저장할 수 있음
- `s-maxage` : 중간 서버에서만 적용되는 max-age 값을 설정함
- **토스에서 Cache-control 설정하기**
  - `HTML 파일` : HTML 리소스는 새로 배포가 이루어질 때 마다 값이 바뀔 수 있으므로 **브라우저는 항상 HTML파일을 불러올 때 새로운 배포가 있는지 확인해야 한다.**
    ⇒ `max-age=0, s-maxage=31536000` : 브라우저는 HTML 파일을 가져올 때 마다 서버에 재검증 요청을 보내고, CDN (중간 서버)는 계속하여 HTML 파일에 대한 캐시를 가지고 있되 배포가 이루어질때 마다 CDN에 있는 캐시를 지우는 작업을 함.
  - `JS, CSS 파일` : 빌드 할 때 마다 새로운 파일이 새로 생기므로, 같은 URL에 대해서는 항상 같은 파일 (내용이 바뀔 수 있는 경우가 없음)
    ⇒ `max-age=31536000` (최댓값) 으로 설정하여 새로 배포가 일어나지 않는 한, 브라우저는 캣에 저장된 JS 파일을 그대로 사용함

🌧️ 즉, 자바스크립트나 CSS 파일이 변경될 수 있는 여지는 “빌드가 새로 일어날 때”를 제외하면 없다는 의미이다. 그리고 이 “빌드가 새로 일어날 때”의 경우, 브라우저의 HTML 파일에 대한 `max-age` 설정을 통하여 빌드가 새로 일어난 HTML 파일을 항상 감지할 수 있다.

## 인용

> 많은 네트워크가 원격 서버보다 로컬 네트워크 클라이언트에 더 넓은 대역폭을 제공한다(그림 7-1). 클라이언트들이 서버에 접근할 때의 속도는, 그 경로에 있는 가장 느린 네트워크의 속도와 같다. (186p)

> 문서 적중률과 바이트 단위 적중률은 둘 다 캐시 성능에 대한 유용한 지표다. 문서 적중률은 얼마나 많은 웹 트랜잭션을 외부로 내보내지 않았는지 보여준다. 트랜잭션은 고정된 소요 시간을 포함하게 되는데, 이것은 종종 길 수도 있기 때문에(예를 들어 TCP 커넥션을 맺는 경우), 문서 적중률을 개선하면 전체 대기시간(지연)이 줄어든다. 바이트 단위 적중률은 얼마나 많은 바이트가 인터넷으로 나가지 않았는지 보여준다. 바이트 단위 적중률의 개선은 대역폭 절약을 최적화 한다. (193p)

> 클라이언트가 응답이 캐시에서 왔는지 알아내는 한 가지 방법은 Date 헤더를 이용하는 것이다. 응답의 Date 헤더 값을 현재 시각과 비교하여, 응답의 생성일이 더 오래되었다면 클라이언트는 응답이 캐시된 것임을 알아낼 수 있다. (193p)

> HTTP는 캐시가 일정 기간 동안 서버 문서의 사본을 보유할 수 있도록 해준다. 이 기간 동안, 문서는 ‘신선’한 것으로 간주되고 캐시는 서버와의 접촉 없이 이 문서를 제공할 수 있다. 그러나 일단 캐시된 사본을 신선도 한계를 넘을 정도로 너무 오래 갖고 있었다면 그 객체는 ‘신선하지 않은’ 것으로 간주되며, 캐시는 그 문서를 제공하기 전에 문서에 어떤 변경이 있었는지 검사하기 위해 서버와 재검사를 해야 한다. (199p)

## 참고자료

**[If-Modified-Since - HTTP | MDN](https://www.notion.so/07-f48b0105e0f64dfca26445157c93a096)**

**[웹 서비스 캐시 똑똑하게 다루기 | toss tech](https://toss.tech/article/smart-web-service-cache)**