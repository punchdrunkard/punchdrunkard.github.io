---
title: 02. 홈 서버 구축 - 보안
published: 2025-01-21
description: 홈 서버에서 발생할 수 있는 비밀번호 기반 인증의 취약점을 해결하기 위해 fail2ban, OTP, 그리고 SSH 키 인증 방식을 설정하는 방법을 다룬다.
tags: [Server, Infra, Home Server, On-Premise, SSH]
image: "https://i.imgur.com/PMa3iNp.png"
category: 'Server'
draft: false
---

## 개요

SSH 가 안전한 연결을 보장한다고 해도, 포트를 열어두는 순간 외부에서 수많은 침입 시도가 들어온다!

```bash
sudo last -f /var/log/btmp
```

위의 명령어를 통해, 실패 로그를 확인해보면 아주 다양한 경로로 서버에 침입하고자 하는 것을 확인할 수 있다.
이 글에서는 SSH 연결의 보안에 대한 설정을 한다.

## 비밀번호를 이용한 인증

 초기에 ubuntu 를 설치했던 비밀번호를 통해 인증하는 방식이다. 하지만 이 방식의 경우, 보안에 좋지 않은데 비밀번호가 너무나도 쉽게 유출이 가능하기 때문이다.
비밀번호 인증을 사용한다면, brute-force 공격, 키보드 입력을 가로채는 키로깅이나 가짜 ssh 서버를 이용한 피싱 공격에 노출될 수도 있다. 따라서 **비밀번호 인증을 사용하는 경우, `fail2ban` 이나 OTP 와 같은 추가적인 인증 수단을 사용하는 것이 필수**적이다.

### fail2ban

::github{repo="fail2ban/fail2ban"}

 비밀번호 인증의 취약점인 **brute-force (무작위 대입)** 을 막기 위해 `fail2ban` 을 사용하면 똑같은 IP로 일정 횟수 이상 로그인 실패를 하면 해당 IP에 접속 제한을 설정할 수 있다.

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### OTP 설정

서버에 `Google Authenticator` 를 설치하고 자신의 스마트폰에서 `Google Autenticator` 를 설치하고 터미널에

```bash
google-authenticator
```

위의 명령어를 통해 설정할 수 있다.

## SSH Key 를 이용한 인증

EC2 를 이용하여 배포를 해본 사람이라면, 원격 접속을 위한 key 를 다운받아 사용한 적이 있을 것이다. 우리의 홈서버에서도 이러한 key 를 사용해보자. SSH 키 인증 방식은 **공개 키 암호화 (public key cryptography)** 를 기반으로 작동한다.

:::note[SSH Key 인증 방식의 원리]

- SSH  키는 public key (공개 키) 와 private key (개인 키) 로 구성된다. 여기서 **private key는 사용자만 보관하고, public key 는 서버에 저장된다.**
- 클라이언트가 서버에 접속 요청을 하면 서버는 랜덤 메시지를 생성하여 클라이언트에게 전송한다.
- 클라이언트는 랜덤 메시지를 자신이 가지고 있는 private key로 암호화 하고, 서버에게 전송한다.
- 서버는 암호화된 메시지를 서버의 key로 복호화한다. 복호화한 메시지가 원래의 메시지와 같다면 인증이 성공한다.
- ![](https://i.imgur.com/bfV3qUF.png)

:::

SSH Key 인증 방식을 사용하는 경우, 네트워크를 통해 Key가 전달되지 않기 때문에 이전의 비밀번호 기반 인증 방식보다 훨씬 안전하다.

### SSH Key 생성

먼저 **클라이언트 PC에서** ssh 키를 생성한다.

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

- 옵션
  - `-t` : 키 타입 (RSA, ESDSA 등), 일반적으로 `rsa` 또는 `ed25519` 를 사용한다
  - `-b` : 키 길이 (비트), RSA 의 경우 최소 2048 비트를 권장한다.
  - `-C` : 키에 대한 설명 (주석)

명령어를 입력하면 bash 에서 키를 저장할 위치와 암호를 지정할 수 있다.

![](https://i.imgur.com/KNYHUzj.png)

이제 위에서 지정한 디렉터리를 확인해보면 private key `id_ed25519` 파일과 public key `id_ed25519_pub` 파일을 확인할 수 있다.

### 서버에 공개 키 등록

위에서 언급했듯이, 서버는 public key 를 가지게 되기 때문에 **public key를 원격 서버에 복사한다.**

```bash
ssh-copy-id user@your_server_ip
```

이 후 원격 서버에서는 `~/.ssh/authorized_keys` 에서 키의 내용을 확인할 수 있다.

### SSH 클라이언트 설정

클라이언트에서 키를 자동으로 사용할 수 있도록 `~/.ssh` 디렉토리에 `config`파일에 다음과 같이 추가하자. (없다면 생성)

```
Host your_server
    HostName your_server_ip
    User your_user
    IdentityFile ~/.ssh/생성한_privte_key
```

위와 같이 설정하면

```bash
ssh your_server
```

명령어를 통해 편리하게 서버에 접근할 수 있다.

## 마치며

이번 글에서는 홈 서버의 SSH 보안을 강화하는 방법을 다뤘다. **비밀번호 인증**의 취약점을 보완하기 위해 `fail2ban`과 OTP 설정을 추가했고, 보다 안전한 접근 방식을 위해 **SSH 키 인증**을 구성하는 과정을 정리했다.

하지만 현재 구성에는 몇 가지 한계점이 존재한다.

1. **22번 포트의 개방**:
    - SSH 접근을 위해 여전히 포트를 열어둬야 하며, 이는 외부 공격에 노출될 가능성을 남겨둔다.
2. **공격 시나리오 제한**:
    - 포트 스캔과 DDOS 공격 등의 위협은 완전히 방어할 수 없다.

::github{repo="tailscale/tailscale"}

이러한 문제를 해결하기 위해 **VPN**을 도입하려고 한다.
특히, **TailScale**과 같은 P2P 기반의 VPN은 NAT 및 방화벽 설정을 간소화하고, **22번 포트를 열 필요 없이** 안전한 원격 접속 환경을 제공한다!

따라서 다음 글에서는 **TailScale**을 사용하여 외부 포트 노출 없이도 안전하게 서버를 관리할 수 있는 환경을 구축할 예정이다.

## Reference

- [🏠홈서버 만들기🏠 보안 - Velog, 새양](https://velog.io/@chch1213/build-home-server-4)
- [4. AWS 운영환경 구축하기 - GitHub, jojoldu](https://github.com/jojoldu/springboot-webservice/blob/master/tutorial/4_AWS%EC%9A%B4%EC%98%81%ED%99%98%EA%B2%BD%EA%B5%AC%EC%B6%95.md)
