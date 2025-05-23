---
title: 00. 홈 서버 구축 - 시작하며
published: 2025-01-12
description: 홈 서버 구축의 목적과 구현 계획을 정리하고, 예상되는 네트워크 구조를 설명한다.
tags: [Server, Infra, Home Server, On-Premise]
image: "https://i.imgur.com/Uc7HDVB.png"
category: 'Server'
draft: false
---

## 개요

최근 클라우드 서비스 비용 증가와 AWS 프리티어(free-tier) 계정 관리의 번거로움으로 인해, 홈 서버를 직접 구축해 운영해 보기로 결정했다.

이 글에서는 홈 서버 구축의 목적과 구현 계획을 정리하고, 예상되는 네트워크 구조를 설명한다.

## 홈서버를 구축하는 이유

1. 클라우드 서비스에 대한 비용 절감

- 트래픽이 많은 서비스를 운영할 계획이 아니기 때문에, 고성능 클라우드 서비스가 굳이 필요하지 않다.
- 기존에 주로 사용하던 프리티어(free-tier)는 제한된 컴퓨팅 자원으로 인해 성능이 부족했다.
- 프리티어 계정을 자주 변경해야 하는 번거로움도 해결하고 싶다.

2. 학습

- 직접 온프레미스로 서버 운영하면서 네트워크, 인프라에 대한 학습을 하면 좋을 것 같다.

아마 다음과 같은 용도로 주로 사용할 것 같다.

- 개인 사이드 프로젝트 배포
- 개인용 클라우드 서비스, 이미지 호스팅(+최적화) 등

## 컴퓨터 스펙

홈서버로 사용할 컴퓨터는 약 10년 전에 사용했던 구형 데스크탑이다.
 (오래된 데스크탑이므로 전력 소모와 성능 관리에 신경 쓸 필요가 있다. 이후 실제 운영에서 부족함을 느낀다면 업그레이드를 고려할 예정이다.)

 서버로 이용할 컴퓨터의 스펙은 다음과 같다.

- **CPU**: Intel(R)Core(TM) i7 CPU
- **RAM 용량**: 16GB
- **저장 장치 (SSD/HDD)**: SSD 222.99GB, HDD 120GB 2개

## 단계별 구성 계획

 가정용 네트워크를 이용하여, 홈 서버를 구축 후 보안과 관리의 효율성을 고려하여 Cloudflare를 활용한 중계 서버 설정과 Docker 컨테이너 기반의 애플리케이션 배포 구조를 목표로 한다.

대략적으로 홈 서버를 구축하는 방법을 정리하면 다음과 같다.

1. **서버용 운영체제 (`ubuntu`) 설치**

- PC를 서버용으로만 사용할 것이기 때문에 데스크탑에 설치되어있는 Windows 대신 서버용 운영체제 (ubuntu) 를 설치하여 사용한다.
  특히 Windows 운영체제의 경우, GUI와 사용자 애플리케이션에 맞춰져있기 때문에, 서버용으로는 적합하지 않다.
- 본인의 경우, 서버용 운영체제로 `ubuntu` 를 선택하였다. 학부 시절 가장 많이 다뤘던 운영체제라 익숙하기도 하고, 그 만큼 많은 사람들이 사용하며 자료도 풍부하기 때문이다.

2. **운영체제 기본 설정**

- `ubuntu` 를 설치한 후, 파일 시스템과 SSH 관련 설정을 한다. 처음으로 서버를 구축해보는 것이라, 간단한 설정을 위해 RAID 구성은 생략하고 단일 디스크로 운영하려고 한다.

3. **네트워크 구성**
   홈서버에 인터넷을 통해 접근하려면, 외부에서 내부 IP로 접근하는 경로를 설정해야 한다. 이를 포트포워딩이라고 하는데, 다음과 같은 작업이 필요하다.
 3-1. **홈 서버의 IP 고정**
 집의 데스크톱(홈서버)은 공유기를 통해 인터넷에 연결된다. 공유기는 내부 네트워크(LAN)을 구성하고, 외부 인터넷(WAN)과의 연결을 중계한다.
 공유기는 DHCP 서버로서, 연결된 장치에 동적 IP 주소를 자동으로 할당하게 된다.
 하지만 IP 주소를 동적으로 할당하게 되면, 포트포워딩이 제대로 동작하지 않으므로 홈서버의 IP를 고정해주는 과정이 필요하다.
 3-2. **포트 포워딩**
 3-3. **DDNS**
   공인 IP가 동적으로 변경되는 문제를 해결하기 위해 DDNS 서비스를 활용할 계획이다. 이를 통해 도메인 기반의 안정적인 접근을 제공한다.
4. **보안 설정**
  주로 SSH를 이용한 원격 제어로 홈 서버를 다룰 것이기 때문에 방화벽을 이용한 설정과 침입 차단, 2단계 인증을 통해 보안 설정을 한다.
  4-1. **방화벽 설정**
   방화벽의 경우, ubuntu의 기본 방화벽인 `ufw` 로 `iptables`에 `80 (HTTP)`, `443 (HTTPS)`, `53 (DNS)` 를 제외하고는 전부 내 PC IP에서만 연결을 허용하도록 설정한다.
 4-2. **추가 보안 설정**
   `ubuntu`는 사용자 계정 기반의 운영체제이므로, 비밀번호 보안 설정과 접근 제어가 중요하다. 따라서 `fail2ban` 을 이용해 비밀번호 무작위 대입을 막아주고, OTP를 이용한 2단계 인증을 됩한다.
5. **중계 서버 설정**
   내 서버의 IP를 숨기고, 그 외에 DDOS 방어나 트래픽 정보 제공, 모니터링 등을 사용하기 위해 중계 서버를 설정한다. 이렇게 함으로써 사용자가 홈 서버에 접근한다면 다음과 같은 형태의 구조를 만든다.
6. **Docker 컨테이너 및 Nginx 설정**
 Docker와 Nginx를 활용하여 컨테이너 기반의 배포 환경을 구성한다.

- **Nginx**는 리버스 프록시 역할을 수행하여 외부 트래픽을 다양한 내부 서비스로 분배하고, SSL/TLS 암호화를 제공해 보안을 강화한다.
- **Docker 컨테이너**는 애플리케이션을 독립적으로 구동시켜 관리와 확장이 용이하도록 한다.

### 네트워크 구조도

![](https://i.imgur.com/Uc7HDVB.png)

![](https://i.imgur.com/8hi7mLG.png)

홈 서버의 주요 구성은 아래와 같은 흐름을 따른다.

1. 외부 클라이언트의 요청은 **Cloudflare**를 통해 서버로 유입된다.
2. 홈 서버 내부에서는 **Nginx**가 **리버스 프록시**로 동작하여 요청을 Docker 컨테이너로 전달한다.

## 마무리

먼저 간단한 네트워크 구성을 목표로 시작한 뒤, 구축 과정에서 발생하는 문제나 요구사항을 반영해 점진적으로 개선해 나갈 계획이다.
