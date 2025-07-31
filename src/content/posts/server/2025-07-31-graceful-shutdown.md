---
title: '[Server] Graceful Shutdown'
published: 2025-07-31
description: SIGTERM 명령을 보내는 Grateful Shutdown을 이용하여 무중단 배포에서 트래픽 전환을 (또는 프로세스 종료 시) 우아하게 처리할 수 있다.
tags: [Server, Graceful Shutdown, Spring Boot, Docker, Signal (Linux)]
category: 'Server'
draft: false
---

## 개요

[이전 글](https://punchdrunkard.github.io/posts/infra/1/)에서 Docker + Nginx 를 이용하여 단일 EC2 인스턴스 내에서 Blue-Green 배포를 구현하였다.

하지만 **배포 시점에 기존 서버에서 처리 중이던 요청은 어떻게 될까?**

Nginx가 트래픽을 Green(신규) 버전으로 전환할 때, Blue (기존) 버전 컨테이너에 남아있던 인플라이트(in-flight) 요청들은 어떻게 될까?

 애플리케이션 컨텍스트가 종료될 때, 유예 시간을 주고 그 시간 동안 기존 요청들은 처리되도록 하고, 새로운 요청은 허용하지 않도록 하는 방식을 **Graceful Shutdown** 이라고 한다.

## 시그널과 Graceful Shutdown (feat. SIGTERM vs SIGKILL)

Graceful Shutdown은 어떤 프로세스가 종료될 때, 유예 시간을 주고 이 시간 동안 진행 중인 작업을 완료하고 안전하게 종료하는 과정을 의미한다.

Linux 커널의 관점에서 생각해보자. Graceful Shutdown을 위해서 시스템은 프로세스에 `SIGTERM` (Signal 15) 시그널을 보낸다. 해당 시그널을 받으면 **프로세스는 이를 catch 해서 처리할 수 있다.**

1. 시스템이 프로세스에 `SIGTERM` 시그널을 보낸다.
2. 프로세스는 이 시그널을 감지하고, “종료 준비” 상태로 진입한다.
3. 프로세스는 새로운 작업 요청을 더 이상 받지 않는다.
4. 프로세스는 현재 진행 중인 작업을 마저 처리한다.
5. 프로세스는 사용한 리소스를 안전하게 해제하고 스스로 종료한다.

따라서 **현재 진행 중인 작업을 처리하고 리소스를 해제하기 때문에** 데이터 정합성이 보장되며, 사용자에게 서비스의 연속성을 보장할 수 있다.

이와 반대되는 개념으로 **Forceful Shutdown**이 있다. 이는 프로세스를 곧바로 종료하는 것을 의미하며 시스템이 프로세스에 `SIGKILL` (Signal 9)을 보낸다. 해당 시그널을 받으면 프로세스는 다음과 같이 동작한다.

1. 시스템이 프로세스에 `SIGKILL` 시그널을 보낸다.
2. 프로세스는 시그널을 받는 즉시 강제로 종료된다.

따라서 진행 중이던 작업이나 메모리에 있던 데이터가 그 자리에서 사라지게 된다. 따라서 Forceful Shutdown을 사용하는 경우 처리 중이던 작업이 중단되어 데이터가 유실되거나 손상될 수 있다.

**그렇다면 우리가 배포할 애플리케이션에서 Graceful Shutdown을 적용하려면 어떻게 해야 할까?**

1. 애플리케이션 프로세스 (컨테이너) 를 관리하는 Docker 가 `SIGTERM` 시그널을 이용해 애플리케이션을 종료해야 하며,
2. `SIGTERM` 을 받은 우리의 Spring Boot 애플리케이션이 해당 시그널을 잡아 **처리** 해야 한다.

따라서 **Graceful Shutdown을 관리하는 지점은 Docker와 Spring Boot이다.**

### Docker에서의 Graceful Shutdown (`docker stop` vs. `docker kill`)

그렇다면 이를 Docker 입장에서 생각해보자.

Docker에서 프로세스를 종료하는 방법은 `docker stop` 과 `docker kill` 이 있다.

`docker stop` 은 다음과 같이 동작한다.

1. `SIGTERM` 전송 : 컨테이너에 `SIGTERM` 시그널을 보낸다.
2. `SIGKILL` 전송 : `SIGTERM` 을 보내고 기본 값으로 **10초** 동안 기다린다. 만약 10초가 지나도 프로세스가 종료되지 않으면, `SIGKILL` 을 보내 프로세스를 강제 종료한다.

따라서 Docker를 사용하여 프로세스를 관리할 때 Graceful Shutdown이 동작하도록 하려면 `docker stop`을 사용해야 한다.

### Spring Boot에서의 Graceful Shutdown

**Spring Boot 2.3 이상에서는 Graceful Shutdown이 기본적으로 활성화되어 있다.** 애플리케이션 서버에서의 Graceful Shutdown의 동작은 유예 시간 동안 기존 요청들은 처리되도록 하고, 새로운 요청은 허용하지 않는 것이다.

수동으로 설정하기 위해서는 아래와 같이 설정한다.

```yaml
server:
  shutdown: graceful
spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s # 종료 대기 시간 설정 (기본값 30초)
```

여기서 `timeout-per-shutdown-phase`는 종료 대기 시간을 의미한다. SIGNAL을 받고도 유예 시간 동안 요청이 처리되지 않는다면 해당 요청은 실패한 것으로 처리해야 하기 때문이다.

Spring Boot의 Graceful Shutdown의 기본 동작은 내장 웹 서버(Tomcat 등)의 동작을 제어하여 남아있는 HTTP 요청을 처리하는데 중점을 둔다. 그러나 만약 사용자가 Graceful Shutdown 도중에 다른 작업을 하고 싶다면 `@PreDestroy` 애너테이션을 사용하거나 `SmartLifeCycle` 인터페이스를 구현할 수 있다.

## 정리

- Graceful Shutdown은 기본적으로 Linux의 `SIGTERM` 시그널을 catch 하여 구현한다.
- Docker 에서 SIGTERM 명령을 보내기 위해서는 `docker stop`, SIGKILL 명령을 보내기 위해서는 `docker kill`을 이용한다.
- Spring Boot의 application.yml 에서 Graceful Shutdown에 대한 설정을 제어할 수 있다.

## 참고: Linux의 Signal

시그널은 운영체제나 다른 프로세스가 특정 프로세스에게 비동기적으로 이벤트가 발생했음을 알리는 간단한 메시지를 의미한다.
시그널은 상수 (정수) 로 정의되어 있으며, 해당 시그널에 대한 핸들러 함수를 정의할 수 있다.
**프로세스는 시그널을 받으면 다음과 같은 방식으로 반응한다.**

1. 운영체제의 기본 동작 실행
2. 시그널 무시
3. 핸들러 함수 실행

즉 Graceful Shutdown을 처리한다는 것의 의미는 `SIGTERM` 시그널에 대한 핸들러 함수를 정의하여 처리한다는 의미이다!

## 참고 자료

- [Graceful Shutdown과 SIGINT/SIGTERM/SIGKILL - 티스토리, 2kindsofcs](https://2kindsofcs.tistory.com/53)
- [Spring 공식 문서 - Grateful Shutdown](https://docs.spring.io/spring-boot/reference/web/graceful-shutdown.html)
