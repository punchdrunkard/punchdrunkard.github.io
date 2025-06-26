---
title: "[TroubleShooting] getRemoteAddr()이 실제 IP 주소를 가져오지 못하는 문제"
published: 2025-06-24
description: 프록시 환경에서 getRemoteAddr()가 실제 클라이언트 IP가 아닌 프록시 IP를 반환할 때, Spring Boot의 server.forward-headers-strategy 설정을 통해 문제를 해결하거나, 헤더에서 직접 IP 주소를 추출할 수 있다.
tags: ["Spring Boot", "Nginx", "IP"]
category: Spring Boot
draft: false
---

프로젝트에서 **IP 주소**를 기반으로 동작하는 Rate Limiter를 구현하고, 테스트를 수행하다가 **Nginx가 있는 배포 환경에서 IP 주소가 제대로 식별되지 않는 문제**가 발생하였다.

Rate Limiter에서는  `HttpServletRequest.getRemoteAddr()`를 사용하여 IP 주소를 얻어오고, 이 값을 key로 하여 카운터 map을 갱신시키는 방식을 사용한다.

그러나 Nginx를 사용하는 실제 배포 환경에서 `getRemoteAddr`에서 **실제 클라이언트의 IP 주소가 아닌 Nginx의 IP 주소만을 가져와서**, 카운팅이 제대로 동작하지 않는 문제가 발생했다.

## 문제 상황 재현

`HttpServletRequest.getRemoteAddr()`를 사용하여 IP 주소를 추출하고, 그대로 리턴하는 컨트롤러 메서드를 만들어주고, Docker를 이용하여 로컬에 컨테이너를 실행시켰다.

또한 `Nginx.conf` 의 location 설정을 아래와 같이 하여, Nginx로 들어온 요청의 소스 IP(`$remote_addr`)을 잡아서, 그 값을 `X-Real-IP` 및 `X-Forwarded-For` 라는 HTTP 헤더에 넣어 Spring Boot 애플리케이션으로 전달하도록 하였다.

`80`번 포트 (http) 로 api endpoint에 접근하면, **Nginx를 이용하여 (프록시를 경유하여)** Spring Boot 애플리케이션 서버로 포워딩되고, `8080`번 포트로 직접 접근하는 경우 Spring Boot 애플리케이션에 직접 접근하게 된다.

```nginx
http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile        on;
    keepalive_timeout  65;

    server {
        listen 80;
        server_name localhost;

        location / {
            proxy_pass http://spring-app:8080; # 컨테이너 DNS, docker-compose 에서 설정
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}

```

이 두 경우를 `curl`로 실행한 결과는 아래와 같다.

- **Nginx를 이용한 프록시로 Spring Boot application 서버에 접근**

    ![Nginx를 이용한 프록시로 Spring Boot application 서버에 접근 결과 스크린샷](https://github.com/user-attachments/assets/5913e4fc-1754-4a81-9557-14529387d7d9)

- **Spring Boot application 서버에 바로 접근**

    ![Spring Boot application 서버에 바로 접근 결과 스크린샷](https://github.com/user-attachments/assets/c3e6226e-ae24-451c-a5c4-68ca9edbdd6c)

따라서 HttpServletRequest 의 `getRemoteAddr()` 메서드는 **항상 요청을 보낸 바로 직전**의 IP 주소를 추출하기 때문에 (직접적인 발신지의 IP를 가져오기 때문에) 프록시가 있는 환경에서는 실제 클라이언트 IP를 알 수 없다.

## 해결 방법

프록시 서버나 로드 밸런서가 요청을 다음 서버로 전달할 때, **원본 클라이언트의 IP 주소를 보존하기 위해 HTTP 헤더를 추가**한다.

가장 널리 사용되는 de-factor 표준헤더는 [`X-Forwarded-For` (XFF)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Forwarded-For) 이다.  (표준으로 [Forwarded](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Forwarded) 헤더도 존재하지만, 자주 사용되지는 않는다.)

:::note[`X-Forwarded-For` (XFF)]

- [X-Forwarded-For header - mdn web docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Forwarded-For)

요청이 여러 프록시 서버를 거쳐서 전달될 때, **각 프록시는 `X-Forwarded-For` 헤더에 원본 클라이언트의 IP 주소와 자신이 걸쳐온 프록시들의 IP 주소를 추가**한다.

따라서 `X-Forwarded-For: <client IP>, <proxy1 IP>, <proxy2 IP>` 와 같이 IP 주소 목록의 형태를 띄며, **가장 왼쪽의 IP 주소가 원본 클라이언트의 IP 주소** 이다.
:::

그 외에도 일부 시스템이나 특정 프록시 환경에서는 `Proxy-Client-IP`, `WL-Proxy-Client-IP`, `HTTP_CLIENT_IP`, `HTTP_X_FORWARDED_FOR` 헤더를 사용하기도 한다.

**Spring Boot에서는 `application.properties`의 설정 중 `server.forward-headers-strategy` 설정을 통해, 해당 설정을 변경할 수 있다.**

```yml
server:
  forward-headers-strategy: NATIVE
```

:::note[`forward-headers-strategy` 설정값]

- `FRAMEWORK` : 스프링 프레임워크가 처리한다. 내장 웹 서버를 거친 요청을 스프링 프레임워크의 `ForwardedHeaderFilter` 라는 필터가 처리한다.
- `NATIVE` : 내장 웹 서버에게 처리를 맡긴다. Nginx, Apache, HAProxy 등 일반적인 리버스 프록시 서버를 사용하는 경우 권장되는 방식이다. 즉 , `X-Forwarded-For` 이나 `X-Forwarded-Proto` 헤더를 사용하는 경우 해당 설저을 사용한다.
- `NONE` : 기본값, 바로 앞에 있는 IP 주소를 가져온다.

:::

`forward-headers-strategy` 설정 이후에 동작을 확인해보면, `getRemoteAddr`이 실제 클라이언트 IP를 받아오는 것을 확인할 수 있다.

- Nginx 프록시를 거치는 경우
![프록시를 거치는 경우 (설정 변경 후)](https://github.com/user-attachments/assets/cbda8038-5224-43a6-b5da-9f1d41a5f288)
- Nginx 프록시를 거치지 않는 경우
![프록시를 거치지 않는 경우 (설정 변경 후)](https://github.com/user-attachments/assets/7dea69ce-813d-40c2-a6bb-4ab1ff6fcb4b)

또는 헤더로 부터 주소를 추출하는 코드를 작성할 수도 있다.

```java
public static String getClientIpAddr(HttpServletRequest request) {
    String ip = request.getHeader("X-Forwarded-For");

    if(ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
        ip = request.getHeader("Proxy-Client-IP");
    }
    if(ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
        ip = request.getHeader("WL-Proxy-Client-IP");
    }
    if(ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
        ip = request.getHeader("HTTP_CLIENT_IP");
    }
    if(ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
        ip = request.getHeader("HTTP_X_FORWARDED_FOR");
    }
    if(ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
        ip = request.getRemoteAddr();
    }

    // X-Forwarded-For가 여러 IP를 포함할 경우 첫 번째 IP만 사용
    if (ip != null && ip.contains(",")) {
        ip = ip.split(",")[0].trim();
    }

    return ip;
}
```

## 참고 자료

- [request.getRemoteAddr()로도 정확한 클라이언트 IP가 추출이 되지 않을 때 해결 방법 - 스프링연구소(spring-lab):티스토리](https://nine01223.tistory.com/302)
- [X-Forwarded-For - mdn web docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Forwarded-For)
- [Forwarded - mdn web docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Forwarded)
- [Enum Class ServerProperties.ForwardHeadersStrategy - Spring 공식 문서](https://docs.spring.io/spring-boot/api/java/org/springframework/boot/autoconfigure/web/ServerProperties.ForwardHeadersStrategy.html)
- [Embedded Web Servers - Spring 공식 문서](https://docs.spring.io/spring-boot/how-to/webserver.html#howto.webserver.use-behind-a-proxy-server)
