---
title: 03. 홈 서버 - Tailscale과 GitHub Actions로 배포 자동화하기
published: 2025-03-30
description: Tailscale을 활용해 공인 IP 없이 안전하게 홈서버에 접근하고, GitHub Actions를 통해 배포 자동화를 구현하는 방법을 소개한다. ACL 설정, SSH 구성, CI/CD 연동을 다룬다.
tags: [Server, Infra, Home Server, VPN, Tailscale, GitHub Actions, CI-CD]
image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSFFOTuuxm9Jq6FzHtWQEvJNESFBtUNPCS5zQ&s"
category: 'Server'
draft: false
---


## 개요

개인 프로젝트를 홈서버에서 직접 호스팅하면서 가장 먼저 부딪힌 문제는 **"외부에서 어떻게 안전하게 접속하고, 배포까지 자동화할 것인가?"** 였다.

초기에는 단순히 SSH를 열고 비밀번호나 키 인증을 사용하는 방식을 고려했다. 하지만 SSH 포트를 공인 IP에 열어두는 것 자체가 보안상 큰 리스크였고, 키 관리 역시 번거로웠다.

Tailscale은 WireGuard 기반의 Zero-config VPN 솔루션으로, 마치 여러 디바이스가 같은 사설 네트워크에 연결된 것처럼 만들어준다. 즉, Tailscale을 도입하면 내 홈서버는 **공인 IP 없이도 외부에서 접근 가능한 "개인 전용 사설망"** 처럼 활용할 수 있다.

이 글에서는 Tailscale을 소개하고, 이를 GitHub Actions와 연동해 CI/CD 파이프라인을 구축하는 방법에 대해 다룬다.

## TailScale 동작 원리

- <https://tailscale.com/>

::github{repo="tailscale/tailscale"}

> Tailscale is a mesh VPN (Virtual Private Network) service that streamlines connecting devices and services securely across different networks. It enables encrypted point-to-point connections using the open source [WireGuard](https://www.wireguard.com/) protocol, which means only devices on your private network can communicate with each other.
>
> Unlike traditional VPNs, which tunnel all network traffic through a central gateway server, Tailscale creates a peer-to-peer mesh network (known as a tailnet). However, you can still use Tailscale like a traditional VPN by routing all traffic through an [exit node](https://tailscale.com/kb/1103/exit-node).

**Tailscale 공식 문서의 What is Tailscale? 섹션**을 참고하면 위와 같이 설명하고 있다.

요약하자면, Tailscale은 **WireGuard 프로토콜**을 기반으로 동작하여, VPN처럼 **개인 사설망(TailNet)** 을 구성해준다.  

기존의 VPN은 모든 트래픽을 **중앙 게이트웨이 서버로 터널링**하기 때문에, 해당 서버에 병목이 생기거나 장애가 발생하면 전체 네트워크에 영향을 줄 수 있다. 반면 Tailscale은 **P2P(Peer-to-Peer)** 통신을 적극 활용하여, 각 노드가 서로 직접 통신하는 **Mesh 구조**를 지향한다.

이러한 구조의 가장 큰 장점은 다음과 같다:

- 중앙 서버에 의존하지 않기 때문에 **단일 장애 지점(Single Point of Failure)** 이 사라진다.
- 하나의 노드가 죽더라도, **다른 노드 간의 통신은 계속 유지**될 수 있다.
- 대부분의 경우 **직접 연결(P2P)** 이기 때문에 **지연 시간도 줄어들고**, 네트워크 성능도 향상된다.

## 사용방법

Tailscale을 사용하려면, 연결할 각 기기에 Tailscale을 설치하고 로그인하면 된다.

```bash
curl -fsSL https://tailscale.com/install.sh| sh
```

설치 후 `tailscale up` 명령을 실행하면,  
해당 기기는 WireGuard 기반으로 암호화된 TailNet에 합류하게 된다.

![](https://i.imgur.com/4v0lAbv.png)

TailNet 내의 노드들은 고유한 이름과 IP 주소를 부여받고,  **같은 공유기에 연결된 디바이스처럼 서로 통신**할 수 있게 된다.

## Taliscale + GitHub Actions 으로 CI/CD 구축하는 방법

Tailscale의 활용 범위는 매우 넓지만, 이 글에서는  
**GitHub Actions를 통해 Tailscale 기반 홈서버에 SSH로 애플리케이션을 배포하는 흐름**을 다룬다.

### Tailscale-ssh

- <https://tailscale.com/tailscale-ssh>

홈서버에서 Tailscale을 실행할 때 다음 옵션을 사용한다:

```
tailscale up --ssh
```

이렇게 하면 Tailscale 관리 콘솔에서 해당 노드에 `SSH` 권한이 부여된다. (태그로 확인할 수 있다.)

![](https://i.imgur.com/xbhrfuR.png)

### ACL 설정

<https://tailscale.com/kb/1018/acls>

ACL(Access Control List)은 네트워크 수준에서 누가, 어디에, 어떤 방식으로 접근할 수 있는지 JSON 으로 정의할 수 있는 기능이다.
현재 글에서는 **`tag:ci`를 부여받은 노드(GitHub Actions Runner)** 가  
**`tag:server`가 부여된 홈서버**에 **SSH 접근만 허용**하도록 설정하였다.

```
// Example/default ACLs for unrestricted connections.
{
 // Define the tags which can be applied to devices and by which users.
 "tagOwners": {
  "tag:server": ["autogroup:admin"],
  "tag:ci":     ["autogroup:admin"],
  "tag:admin":  ["autogroup:admin"],
 },

 // Define access control lists for users, groups, autogroups, tags,
 // Tailscale IP addresses, and subnet ranges.
 "acls": [
  // Allow all connections.
  // Comment this section out if you want to define specific restrictions.
  {"action": "accept", "src": ["*"], "dst": ["*:*"]},
 ],
 
 // Define users and devices that can use Tailscale SSH.
 "ssh": [
  // Allow all users to SSH into their own devices in check mode.
  // Comment this section out if you want to define specific restrictions.
  {
   "action": "check",
   "src":    ["autogroup:member"],
   "dst":    ["autogroup:self"],
   "users":  ["autogroup:nonroot", "root", "homeserverusername"],
  },
  {
   "action": "accept",
   "src":    ["tag:ci", "tag:admin"],
   "dst":    ["tag:server"],
   "users":  ["autogroup:nonroot", "homeserverusername"],
  },
 ],
}
```

아래의

```json
{
 "action": "accept",
 "src":    ["tag:ci", "tag:admin"],
 "dst":    ["tag:server"],
 "users":  ["autogroup:nonroot", "homeserverusername"],
  },
```

에 주목하자.
이 정책은 다음과 같은 의미를 가진다.

- **`src`**: `tag:ci`, `tag:admin`이 붙은 노드만
- **`dst`**: `tag:server`가 붙은 노드에
- **`users`**: 지정된 사용자(`nonroot`, `homeserverusername`)로만 SSH 접속 가능

### `cd.yml` 작성

이제 action script 에서는 **Tailscale Github Action** 을 이용한다.

- <https://github.com/marketplace/actions/connect-tailscale>

::github{repo="tailscale/github-action"}

이를 사용한 `cd.yml` 은 다음과 같다.

```yml
name: Deploy to VPS via Tailscale

on:
  push:
    branches: ["main"]

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Connect Tailscale
        uses: tailscale/github-action@v3
        with:
          oauth-client-id: ${{ secrets.TS_OAUTH_CLIENT_ID }}
          oauth-secret: ${{ secrets.TS_OAUTH_SECRET }}
          tags: tag:ci
          version: latest

      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.ACTION_TOKEN }}
          submodules: true

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: "17"
          distribution: "temurin"

      - name: Build with Gradle
        run: ./gradlew bootJar

      - name: Build and Push Docker Image
        run: |
          docker login -u ${{ secrets.DOCKER_USERNAME }} -p ${{ secrets.DOCKER_PASSWORD }}
          docker build -t ${{ secrets.DOCKER_REPO }}/docker-container-name .
          docker push ${{ secrets.DOCKER_REPO }}/docker-container-name

      - name: Deploy to Dev
        run: |
          ssh -o "StrictHostKeyChecking no" ${{ secrets.HOME_SERVER_USER }}@${{ secrets.HOME_SERVER_IP }} " 
            docker stop docker-container-name || true
            docker rm docker-container-name || true

            # Pull the latest image
            docker pull ${{ secrets.DOCKER_REPO }}/docker-container-name

            # Run the container with the 'prod' profile and volume connection
            docker run -d \
              --name docker-container-name \
              --network="host" \
              -e SPRING_PROFILES_ACTIVE=prod \
              -p 8080:8080 \
              -v ${{ secrets.VOLUME_PATH }}:/app/data \
              ${{ secrets.DOCKER_REPO }}/docker-container-name
          "
```

요약하면 SSH 를 이용해 Tailscale 을 사용하는 서버에 접속한 후, 서버에서 도커 컨테이너를 실행시키는 방식이다.

- `tailscale/github-action`
  - 해당 GitHub Actions Runner (임시 인스턴스) 에 Tailscale 이 설치되고, OAuth 인증을 통해 TailNet 에 `tag:ci` 가 붙은 노드로 일시적으로 연결된다.
  - 이 GitHub Actions Runner 은 워크 플로우가 끝나면 자동으로 폐기된다.
- `StrictHostKeyChecking no` 옵션
  - SSH 접속 시, 최초 연결이라 호스트 키를 확인하지 않으면 오류가 발생할 수 있기 때문에 해당 체크를 건너뛰는 설정을 작성하였다.

정리하자면, 이 방식은 GitHub Actions에서 Tailscale을 통해 홈서버에 자동으로 연결하고,  ACL 정책에 따라 SSH 접근을 허용한 뒤, 서버에서 Docker 기반으로 애플리케이션을 배포하는 흐름이다.

## 마치며

Tailscale을 사용하면서 홈서버 운영의 난이도가 눈에 띄게 쉬워졌다.

물론 실제 서비스를 외부에 배포하려면 여전히 포트 포워딩이나 리버스 프록시 설정이 필요할 수 있지만,  가장 중요한 SSH 구성과 배포 자동화는 **Tailscale + GitHub Actions 조합으로 간단하고 안전하게 해결**할 수 있었다.

## 참고 자료

- <https://www.youtube.com/watch?v=OQJAX-Ce1YY&ab_channel=Tailscale>
- <https://tailscale.com/kb/1276/tailscale-github-action>
- <https://svrforum.com/svr/940760>
