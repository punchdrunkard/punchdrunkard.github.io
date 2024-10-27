---
title: 'User Agent'
published: 2023-03-28 20:37:52
category: Network
description: User Agent 를 통해 클라이언트를 식별하여 클라이언트에 따라 적절한 콘텐츠를 제공할 수 있다.
tags: ['UA (User Agent)', 'HTTP']
draft: false
---

## User Agent

- 자기 자신에 대한 식별 정보를 의미한다. 식별 정보에는 예를 들어 `브라우저 이름`, `버전`, `호스트 OS`, `기기 종류` 등이 있다.
- 이 정보를 통하여 클라이언트를 식별하여 클라이언트에 따라 적절한 콘텐츠를 제공할 수 있다.

## HTTP 요청 헤더에서의 User-Agent

- 클라이언트가 서버에 요청을 보낼 때 포함되는 정보이다.
- 이 정보를 통해 서버는 클라이언트의 정보에 맞게 최적화 된 정보를 제공할 수 있다.

### 사용 예제

- `toss/slash`
  - **[slash](https://github.com/toss/slash)/[packages](https://github.com/toss/slash/tree/main/packages)/[common](https://github.com/toss/slash/tree/main/packages/common)/[utils](https://github.com/toss/slash/tree/main/packages/common/utils)/[src](https://github.com/toss/slash/tree/main/packages/common/utils/src)/[device](https://github.com/toss/slash/tree/main/packages/common/utils/src/device)/getOSByUserAgent.ts**
    - `userAgent` 값을 통하여, 현재 OS가 IOS 인지, Android 인지 확인한다.
  - [toss/slash@`main`/packages/common/utils/src/device/isMobileWeb.ts](https://github.com/toss/slash/blob/main/packages/common/utils/src/device/isMobileWeb.ts?rgh-link-date=2023-03-28T01%3A37%3A06Z)
    - `userAgent` 값을 통하여, 현재 접속 환경이 모바일 환경인지 판단한다.

## Navigator.userAgent

- 브라우저 API (Client Side에서만 사용할 수 있음을 주의하라) 이며, 현재 브라우저의 user agent 문자열을 반한한다.
- 다음과 같은 정보를 가진다 (출처 : `Nagicator.userAgent | mdn web docs`)

```
userAgent = appCodeName/appVersion number (Platform; Security; OS-or-CPU;
Localization; rv: revision-version-number) product/productSub
Application-Name Application-Name-version
```

## 보안 취약점

- 이 필드에 가능한 적은 정보를 제공하여야 한다. 단순히 `userAgent` 에 접근함으로서 클라이언트의 정보를 알 수 있기 때문이다. (`Sniffing` 기법)
  - 이를 악용하여 현재 **구글 검색 시 결과에서 스팸사이트가 발생하는 현상** 이 있다.
    - 이는 스팸 사이트가 구글 웹 로봇을 겨냥하여, **접속한 user agent가 구글봇인 경우 정상적인 사이트를 보여주고, 그 외에는 스팸 사이트로 리다이렉션 시키는 방식**으로 동작한다.
    - 참고 : [[정보] 구글 검색 결과에서 스팸 사이트가 발생하는 원인 및 해결법](https://www.fmkorea.com/5557736987)
- 또한 브라우저 사용자 역시 원하는 경우 이 필드의 값을 변경할 수 있다. (`UA spoofing`)

## 참고 자료

- [https://github.com/toss/slash](https://github.com/toss/slash)
- **[Navigator.userAgent](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/userAgent)**
- **[User-Agent](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/User-Agent)**
- [[정보] 구글 검색 결과에서 스팸 사이트가 발생하는 원인 및 해결법](https://www.fmkorea.com/5557736987)
