---
title: '[HTTP 완벽 가이드] 11. 클라이언트 식별과 쿠키'
published: 2023-02-07 23:11:23
description: 쿠키는 stateless한 HTTP 트랜잭션에서 클라이언트를 식별할 수 있는 방법이다.
tags: ['HTTP 완벽 가이드', '클라이언트 식별', '쿠키']
category: Network
draft: false
---

:::note
쿠키는 stateless한 HTTP 트랜잭션에서 클라이언트를 식별할 수 있는 방법이다.
:::

## 키워드

`클라이언트 식별`, `authorization 헤더`, `세션 쿠키`, `지속 쿠키`, `쿠키의 속성`,
`sameSite`

## 메모 및 핵심 요점

- **HTTP 트랜잭션은 상태가 없다**의 의미
  → 연결 자체에 대한 정보를 가지지 않으며, 각 요청 및 응답이 독립적으로 일어난다.
- 상태가 없는 HTTP 트랜잭션에서 **클라이언트를 식별할 수 있는 방법**
  - HTTP 헤더, 클라이언트 IP 주소 추적, 로그인 인증, fat URL, 쿠키
- 웹 사이트 로그인을 위해서 서버는 사용자에게 식별 요청을 하고, HTTP는 이 정보를 `WWW-Authenticate` (🌧️ 서버에서 클라이언트로 보내는 듯)와 `Authorization` 헤더(🌧️ 클라이언트에서 서버로 보내는 듯)에 기술한다.
- 쿠키는 캐시와 충돌할 수 있어서, 대부분의 캐시나 브라우저는 쿠키에 있는 내용을 캐싱하지 않는다.
- 쿠키의 타입 ⇒ **파기되는 시점에 따라** 나누어진다. (`Discard` 파라미터가 설정되어 있거나, `Expires`, `Max-Age` 파라미터가 없으면 세션 쿠키가 된다)

  - 세션 쿠키 : 사용자가 사이트를 탐색할 때, 관련된 설정과 선호 사항들을 저장하는 임시 쿠키, **브라우저를 닫으면 삭제**
  - 지속 쿠키 : **디스크에 저장**되어, 브라우저를 닫더라도 삭제되지 않고 더 길게 유지되는 쿠키
    🌧️ 쿠키 삭제하는 방법 : 값에 `deleted`를 넣고, `Max-age=0`을 설정한다.
    (예시) `ACCESS_TOKEN=deleted; Max-Age=0`

- 쿠키의 기본적인 발상 : 브라우저가 서버 관련 정보를 저장하고, 사용자가 해당 서버에 접근할 때 마다 그 정보를 함께 전송하게 하는 것
  - 브라우저는 보통 **쿠키를 생성한 서버에게만 쿠키에 담긴 정보를 전달한다.**
- 쿠키의 속성
  - `Domain` : 서버는 쿠키를 생성할 때 Set-Cookie 응답 헤더에 Domain 속성을 기술해서 **어떤 사이트가 그 쿠키를 읽을 수 있는지** 제어할 수 있다. (🌧️ 헤더에 기술된 domain 이 아닌 브라우저의 경우, 이 서버가 보낸 쿠키를 읽을 수 없다.)
  - `Path` : 웹 사이트 일부에만 쿠키를 적용할 수 있다. URL 경로의 앞부분을 가리키는 Path 속성을 기술해서 **해당 경로에 속하는 페이지에만 쿠키를 전달**한다. (🌧️ 모든 페이지 경로에서 쿠키를 전달하기 위해서는 `path: '/'` 와 같은 속성을 이용한다.)
  - `SameSite`: **서로 다른 도메인간의** 쿠키 전송에 대한 보안 설정. 값이 `None` 인 경우에는 동일 사이트와 크로스 사이트에 모두 쿠키 전송이 가능하다. 값이 `Strict` 인 경우 서로 다른 도메인에서는 쿠키의 전송이 불가능해지며, `Lax` 인 경우 `Strict`에 일부 예외 (`HTTP get`, `a href`, `link href`) 를 두어 적용된다.

## 스터디에서 배운 내용

### 현재 사용하는 쿠키 스펙

- 책에 나와있는 넷스케이프 쿠키와 RFC2109, RFC2965는 2011년 이후로 RFC6265로 대체됨. (물론 현재도 넷스케이프 쿠키를 많이 사용하고 있다)

- RFC6265는 새로운 기능을 축라하기 보다는 사용화 되어있던 브라우저와 웹 서버들의 관행을 문서화

- 레거시 쿠키vs TFC6265 쿠키
  <img width="960" alt="image" src="https://user-images.githubusercontent.com/74234333/217214528-6e28e0fb-8135-445b-b479-bdcace89ef8d.png">
  (출처 : <https://meetup.nhncloud.com/posts/209>)

### 쿠키의 SameSite 헤더

> 참고 자료 : [Cookie SameSite 설정하기 (Chrome 80 쿠키 이슈)](https://ifuwanna.tistory.com/223)

- 구글 크롬 80버전(2020년 4월 이후) 부터 새로운 쿠키 정책이 발표외었다.

  - 쿠키의 `SameSite` 기본값이 `None`에서 `Lax`로 변경되었다.
  - 또한, `SameSite`의 값을 `None`으로 지정하기 위해서는 `Secure` 쿠키의 사용이 강제된다.
  - 🌧️ 최근 프로젝트에서, refresh token을 발급할 때 서버에서 클라이언트 도메인에 직접 `set-cookie`를 하는 방식을 사용하였는데 클라이언트와 서버의 도메인이 달라서 cookie가 set되지 않는 일이 있었다. (credential 옵션이 있었음에도) 또한 이를 위해 `Samesite` 값을 `none`으로 하였음에도 쿠키가 정상적으로 들어오지 않았는데, 이는 개발 환경에서는 http를 사용하기 때문에 secure 쿠키가 전송되지 않아서 그런 것이였다.

  따라서, 서버 단에서 클라이언트 단에 `set-cookie`를 사용하기 위해서는 같은 도메인을 사용하거나, `samesite : none`일 때는 https 개발 환경을 따로 설정하여야 했다.

### `<a />` 태그의 `noopener`과 `noreferrer`

- 보통 `a` 태그의 url을 새 창에서 열기 위하여 `target=_blank`를 사용하는데, 이는 보안적인 문제를 가지고 있음.
- 새 페이지에서 `window.open.location`을 변경하여, 기존 페이지를 피싱 페이지로 변경하여 사용자 정보를 탈취할 수 있음. (**기본적으로 새 탭을 열면 현재 탭을 열었던 탭의 참조를 반환하기 때문**) → 이를 **`Tabnabbing`**
- 이러한 참조를 없애기 위해서 `rel="noopener noreferrer"`를 추가할 수 있음.

<figure>
<img src="https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdn%2FbrJAUB%2FbtqJjvpy1d5%2FVH0K2asom1k7xQ4DQgKKbK%2Fimg.png
" alt=""/>
<figcaption class="caption">출처 : https://blog.jxck.io/</figcaption>
</figure>

- `noopener` : 현재 열었던 탭의 참조를 없앰. 즉, 새 탭에서 window.opener 속성이 null 값을 반환
- `noreferrer` : 마찬가지로 window.opener 속성이 null 값을 반환함. 또한 다른 페이지로 이동할 때 브라우저가 HTTP 헤더에 referer로 이 페이지 주소 또는 다른 값을 전송하지 못하도록 차단함. (따라서 새 탭을 요청한 이전 탭이 무엇인지 알 수 없게 됨.)
  - 🌧️ 즉 noreferrer의 경우, noopener의 동작과 동시에 페이지로 이동할 때 브라우저가 서버에 값을 전송할 때 referer으로 값을 보내지 않음.

## 인용

> HTTP 트랜잭션은 상태가 없다. 각 요청 및 응답은 독립적으로 일어난다. 많은 웹사이트에서 사용자가 사이트와 상호작용할 수 있게 사용자의 상태를 남긴다(예를 들어 온라인 쇼핑 사이트의 장바구니 기능). 이렇게 상태를 유지하려면, 웹 사이트는 각 사용자에게서 오는 HTTP 트랜잭션을 식별할 방법이 필요하다. (298p)

> IP 주소로 사용자를 식별하려는 수동적인 방식보다, 웹 서버는 사용자 이름과 비밀번호로 인증(로그인)할 것을 요구해서 사용자에게 명시적으로 식별 요청을 할 수 있다.
> 웹 사이트 로그인이 더 쉽도록 HTTP는 WWW-Authenticate와 Authorization 헤더를 사용해 웹 사이트에 사용자 이름을 전달하는 자체적인 체계를 가지고 있다. (301p)

> 쿠키는 서버가 사용자에게 “안녕, 내 이름은..”라고 적어서 붙이는 스티커와 같다. 사용자가 웹 사이트에 방문하면, 웹 사이트는 서버가 사용자에게 붙인 모든 스티커를 읽을 수 있다. (305p)

> 쿠키의 기본적인 발상은 브라우저가 서버 관련 정보를 저장하고, 사용자가 해당 서버에 접근할 때마다 그 정보를 함께 전송하게 하는 것이다. (307p)

> 사실, 원격 데이터베이스에 개인 정보를 저장하고 해당 데이터의 키 값을 쿠키에 저장하는 방식을 푣준으로 사용하면, 클라이언트와 서버 사이에 예민한 데이터가 오가는 것을 줄일 수 있다. (319p)

🌧️ https 쿠키에 세션 아이디를 담은 후, 해당 아이디를 통해서 인증을 하는 방식을 생각하면 될 것 같다.

## 참고 자료

- [브라우저 싸움에 등 터지는 개발자들을 위한 HTTP쿠키와 톰캣 쿠키 프로세서 이야기](https://meetup.nhncloud.com/posts/209)
- [Cookie SameSite 설정하기 (Chrome 80 쿠키 이슈) - 티스토리 블로그 (IfUwanna IT)](https://ifuwanna.tistory.com/223)
- [Chrome 브라우저에서 SameSite 쿠키 변경 내용 처리 - Microsoft](https://learn.microsoft.com/ko-kr/azure/active-directory/develop/howto-handle-samesite-cookie-changes-chrome-browser?tabs=dotnet)
- [target="\_blank"를 아무생각 없이 쓰면 안되는 이유 - 티스토리 블로그 (빠른손김참치)](https://hogni.tistory.com/150)
