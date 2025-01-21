---
title: 01. 홈 서버 구축 - 서버 컴퓨터 기본 설정
published: 2025-01-20
description: 홈 서버 구축을 위한 Ubuntu Server 설치, 네트워크 설정, SSH 원격 접속 구성 방법을 단계별로 간단히 정리한다. 포트포워딩, DDNS 설정과 같은 네트워크 기본 지식도 함께 다룬다. 
tags: [Server, Infra, Home Server, On-Premise, SSH, Port Forwarding, Network, DDNS, NAT]
image: "https://i.imgur.com/YNGFIii.png"
category: 'Server'
draft: false
---

## 개요

 서버 용도로 사용할 컴퓨터를 설정하고 네트워크 환경을 구성한다. 목표는 SSH를 통해 외부에서 홈 서버로 접속이 가능하도록 하는 것이다.
  SSH(Secure Shell)는 클라이언트와 서버 간의 통신을 암호화하여 안전한 원격 접속을 가능하게 하는 프로토콜이다. SSH는 클라이언트와 서버가 키 교환을 통해 암호화된 연결을 설정하며, 기본적으로 22번 포트를 사용한다. 이를 통해 원격 접속 시, 데이터는 네트워크를 통해 안전하게 전송될 수 있다.

글에서 다룰 내용을 요약하면 다음과 같다

- 서버 컴퓨터 설정
  - 운영체제 (`ubuntu`) 설치
  - wifi 연결
  - private IP 확인
- 공유기 설정 - 네트워크 설정
  - private IP 고정 (수동 설정)
  - 포트포워딩 설정
  - DDNS 설정

## 서버 컴퓨터 설정

### 운영체제 설치

 운영체제는 계획에서 언급한데로 `ubuntu server` 를 설치한다. `ubuntu server` 를 설치한 다음, 기본 설정 이후에는 `ssh` 로 원격 접속해서 사용할 예정이다.

1. 설치 준비하기

- **우분투 서버 다운로드**
  - 다운로드 링크 : <https://releases.ubuntu.com/>
- **설치 미디어 생성**
  - [`Rufus` 프로그램](https://rufus.ie/ko/)을 사용해서 부팅 가능한 USB 장치를 생성한다.
  - 사용 방법
    - 사용할 Ubuntu ISO 를 선택하고 시작을 누른다.
    - 우분투를 설치할 컴퓨터에 해당 USB를 낀 후, 부팅한다.
    - 기존 PC에 운영체제가 설치되어 있다면, BIOS 설정에서 부팅 순서를 USB로 변경해야 한다.

2. 설치하기

- 홈 서버를 이용해야하므로 입력장치랑 모니터, 인터넷을 연결한 후 BIOS 에 진입한다.
- 보통 컴퓨터 켜면서 특정 키를 연타하면 되는데, 내 컴퓨터의 경우 `F2` 였다.
- 컴퓨터 제조사 별로 진입 방법이 다르기 때문에, 본인의 컴퓨터에 맞게 방법을 찾아봐야 한다. [브랜드 및 제조사별 바이오스(bios) 단축키와 실행](https://m.blog.naver.com/tmdcjfdl3/221366662549) 와 같이 모아놓은 포스팅도 있기 때문에, 검색해보면 쉽게 찾을 수 있다.

### 방화벽에서 22번 포트 허용

원격 접속이 가능하도록 방화벽에서 `22`번 포트로 **들어오는** 연결을 허용하자.
이를 위해 `iptables` 를 이용하여 방화벽을 설정할 수 있다.

`iptables` 의 정책은 `INPUT`, `OUTPUT`, `FORWARD` 가 있는데, 위에서 언급했듯이 **22번 포트로 들어오는** 연결에 대한 정책을 설정할 것이기 때문에 `INPUT` 체인을 설정해보자.

다음과 같이 설정할 수 있다

```bash
# 로컬에서 로컬로 (Loopback)의 모든 접속은 허용한다. 
sudo iptables -A INPUT -i lo -j ACCEPT

# ssh, http, https 포트를 개방한다.
sudo iptables -A INPUT -p tcp -m tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp -m tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp -m tcp --dport 443 -j ACCEPT

# 패키지 업데이트에 관한 패킷들을 허용한다.
sudo iptables -A INPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
# 허용되지 않은 모든 패킷은 폐기한다. 
sudo iptables -P INPUT DROP
# 서버를 거쳐 다른 곳으로 가는 모든 패킷도 폐기한다.
sudo iptables -P FORWARD DROP
```

`iptables`는 메모리에 규칙을 저장하므로 재부팅 후 유지되지 않는다. 이를 해결하려면 `iptables-persistent`를 사용해 규칙을 디스크에 저장하고, 부팅 시 자동으로 불러오도록 설정해야 한다.

```bash
# 패키지 설치
sudo apt install iptables-persistent
```

```bash
sudo netfilter-persistent save # 저장
sudo netfilter-persistent reload # 갱신
```

### Wifi 연결 (유선 연결 시, 생략 가능)

 `ubuntu`를 설치할 때는 우선 유선 LAN을 꼽고 설치해주었다. 집 `wifi` 를 사용하려면 와이파이 비밀번호 연결이 필요하였으므로, 운영체제 설치 후 따로 관련 설정을 작성해준다.

1. 네트워크 인터페이스 확인하기

```bash
ip addr show # ifconfig 로도 확인 가능 
```

- 랜 카드의 네트워크 인터페이스 이름을 확인한다.
- 보통 무선 네트워크(Wireless LAN)의 식별자는 `wlx` 로 시작하기 때문에, 해당 인터페이스 이름을 찾아서 복사해둔다.

2. `netplan` 파일 생성

- `/etc/netplan` 에서 수정해야 하는 파일을 찾는다.
  - `01-network-manager-all.yaml` 혹은 `50-cloud-init.yaml` 이라는 이름의 파일이 존재한다.
- 해당 파일의 `wifis` 블록의 내용을 작성한다.

```yaml
network:
    ethernets:
        enp2s0:
            dhcp4: true
    version: 2
    wifis:
      wlx002666499382:
        access-points:
          "공유기_SSID_NAME":
            password: "와이파이_비밀번호"
        dhcp4: true
```

3. 설정 적용

```bash
sudo netplan apply
```

### private IP (내부 IP) 확인하기

> `ubuntu` 설치 과정에서 `openssh-server` 를 설치하지 않았다면, 설치해줘야 한다.
>
> ```bash
>  sudo apt install openssh-server -y
> ```

이 후의 작업에 ssh 를 이용하기 위해,  private IP 를 확인한다.
`ifconfig` 나 `ip addr show` 명령어를 통해 현재 네트워크에 연결된 장치 (랜 카드나 ethernet) 를 확인하고 해당 장치에서 `inet` 을 확인하면 된다.

:::note[`inet`]
`inet`은 인터페이스의 IPv4 주소를 표시한다. 일반적으로 홈 네트워크에서는 아래의 Private IP 대역에 속한 주소를 사용한다.

> - 10.0.0.0 ~ 10.255.255.255(10.0.0.0/8)
> - 172.16.0.0 ~ 172.31.255.255(172.16.0.0/12)
> - 192.168.0.0 ~ 192.168.255.255(192.168.0.0/16)
>
:::

이제 **서버와 연결된 공유기와 같은 공유기에 연결된 컴퓨터에서 해당 private IP를 통해 원격 접속할 수 있다.**

:::note[같은 공유기에 연결된 기기끼리 사설망에서 통신이 가능한 이유]
 공유기는 DHCP 서버로서 ISP 가 할당한 public IP 주소를 할당받고, 연결된 기기에게 동일한 서브넷에 속하는 private IP 주소를 할당하여 기기들이 인터넷에 접속할 수 있도록 한다.
 이 과정에서 공유기는 연결된 모든 기기를 동일한 로컬 네트워크에 포함시키게 되는데, 포함되어 있는 기기들은 라우팅 없이 직접 통신이 가능하다.
:::

## 네트워크 설정

이제 사설망에 속한 기기 뿐만 아니라, 외부에서도 접속이 가능하게 하기 위해 포트포워딩 설정을 진행한다. 목적은 공유기에 부여된 public IP 를 통해서 홈 서버에 접속할 수 있도록 하는 것이다.
이를 위해 공유기 설정에서 특정 포트로 트래픽이 들어왔을 때, 해당 서버로 트래픽이 유입되도록 설정한다.

하지만 DHCP 프로토콜에서는 private IP 를 유동적으로 주게 된다. 따라서 **홈 서버의 IP 를 고정시키고, 해당 IP에 대한 포트 포워딩을 진행해야 한다.**

### 홈 서버 IP 고정시키기

- LG 공유기 기준으로  공유기 설정 페이지인 (`http://192.168.219.1/etc/intro.asp`) 에 접속한 후, 공유기 설정으로 접근한다. (설정 페이지와 비밀번호는 공유기를 확인해보면 된다.)
- 공유기 설정페이지의 **상태 정보 - DHCP 할당 정보** 에서 홈 서버의 private IP 주소에 연결되어 있는 하드웨어 주소(MAC 주소)를 확인한다. ![](https://i.imgur.com/84l2D74.png)

- DHCP 고정 할당을 추가한다.
 ![](https://i.imgur.com/rjdOzsQ.png)

### 포트 포워딩 설정

포트포워딩은 NAT(Network Address Translation)의 기능 중 하나로, 공유기의 공인 IP로 들어오는 특정 포트의 요청을 사설 IP 주소로 전딜한다. 이를 통해 외부에서 홈 서버에 접근할 수 있 있다.
 이제 공유기의 public IP 의 22번 포트를 홈 서버로 포워딩하게 한다. **네트워크 설정 - NAT 설정** 에 접속하여 원격 접속 (ssh, 22번 포트) 에 대한 **포트 포워딩을 추가한다.**

![](https://i.imgur.com/Rkp1GR2.png)

포트 포워딩 설정까지 완료하면, **공유기의 public IP 를 외부에서 홈 서버로의 접속이 가능해진다.**
아래 주소로 접속하면 public IP 를 확인할 수 있다.
<https://www.findip.kr>

### DDNS 설정하기

ISP에서 공유기에 할당하는 public IP 도 주기적으로 변경될 수 있기 때문에 DDNS (Dynamic Domain Name System)을 이용하여 public IP 주소가 변하더라도 동일한 도메인 이름으로 접근할 수 있도록 하자.

LG 공유기의 경우, 해당 설정을 공유기에서 관리할 수 있는데,  **네트워크 설정 - 세부 설정** 에 접속한 후, DDNS 설정을 진행하면 된다.

> 또는 DuckDNS와 같은 무료 DDNS 서비스도 사용할 수 있다.

## 마치며

이번 작업을 완료하고 구성을 간단하게 그림으로 나타내면 다음과 같다.

![](https://i.imgur.com/YNGFIii.png)

 하지만 현재 서버 구성에서는 네트워크 앞 단에 보안 구성이 없기 때문에 DDOS 등의 공격에 취약할 수 밖에 없다.
 따라서 다음 글에서는 홈 서버로 유입되는 외부 트래픽에 대한 보안을 위해 **홈 서버 내부의 방화벽, 침입 차단 설정** 과 **외부 리버스 프록시를 이용한 VPN** 을 설정한다.

## 참고 자료

- [Ubuntu 22.04: 명령줄에서 WiFi에 연결](https://ko.linux-console.net/?p=10329)
- [Ubuntu 22.04 Server(CLI) WIFI 연결 방법](https://pak-j.tistory.com/69)
- [제조사별 bios 단축키와 진입 및 바이오스 부팅순서 설정 방법 - 영상도 함께](https://m.blog.naver.com/tmdcjfdl3/221366662549)
- <https://velog.io/@chch1213/build-home-server-4>
