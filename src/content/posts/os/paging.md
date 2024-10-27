---
title: Paging
published: 2024-02-07
category: Operating System
tags: ['Virtualization (OS)', 'Memory Management', 'Paging']
draft: false
description: 가상 메모리를 관리하는 기법 중 Paging 기법은 주소 공간을 고정 크기의 페이지로 나누어 메모리에 할당합니다.
---

## 도입 배경

### 기존 Segmentation 방식의 문제점

Segmentation 방식에서는 Address space를 **가변 크기의 Segment로 나누어서 분할**한다. 이렇게 다양한 크기의 Segment를 메모리에 할당하게 되면 다음과 같은 문제점이 있다.

- Address Space를 다양한 크기로 나누기 때문에, Segment를 할당할 때 마다 메모리에 **다양한 크기의 빈 공간이 생기는** fragmentation (단편화) 문제가 있다.
- 이는 메모리를 사용하면 사용할 수록 심해져서, 할당이 점점 어려워진다.

이를 그림으로 나타내면 다음과 같다.
![](https://i.imgur.com/D5XRZkk.png)
메모리의 빈 공간의 크기가 다양하기 때문에, 다음에 할당할 메모리의 연속적인 빈 공간을 찾기 어려워지고
주기적으로 빈 공간을 모아주는 compaction 과 같은 작업을 수행하여야 한다.

따라서 Address Space를 **동일한 크기의 조각으로 나누어서 분할하는** Paging 방법이 고안되었다.
여기서 Address space에서 나뉜 동일한 크기의 조각을 **page (페이지)** 라고 하며,
이에 상응하여 페이지가 할당되게 되는 페이지와 동일한 크기의 **물리 메모리에서의 조각을 frame (프레임)** 이라고 한다.

따라서 paging 방식에서는 가상 메모리의 page 를 물리 메모리의 frame으로 매핑하는 table이 필요하게 되고, 이 table을 **page table**이라고 한다.

## Paging 동작 방식

![](https://i.imgur.com/arnwRaS.png)

> 대략적인 Paging 의 동작 방식은 다음과 같다.
>
> - 가상 메모리 (address space) 를 똑같은 크기의 page 로 나눈다.
> - 물리 메모리를 똑같은 크기의 frame 으로 나눈다.
> - _각 프로세스 별로 관리되는_ page table을 통하여 이 둘을 매핑한다.

- paging 에서 물리 메모리와 가상 메모리를 이미 똑같은 크기로 나눠서 관리하기 때문에 **메모리 연속 할당 방식이나 segmentation 방식 처럼 연속된 공간이 필요하지 않다.** 즉 이전처럼 운영체제가 빈 공간 리스트를 계속해서 관리할 필요가 없으므로 **더욱 메모리를 유연하게 사용할 수 있다.**

> 참고 : 관례상 page (또는 frame) 의 크기 `2의 제곱`의 형태로 설정된다.
> 보편적으로 `512 B` ~ `8 KB`의 크기를 가지며 일반적인 linux 시스템에서는 `4 KB` 를 사용한다.

## Address Translation

paging 기법에서 virtual address는 다음의 두 부분으로 나누어진다.

- `VPN` : **V**irtual **P**age **N**umber (page table index)
- `offset` : 해당 주소가 속해있는 페이지 안에서의 위치

예를 들어, **`64 byte`의 address space를 사용**하고, **page의 크기**는 `16 byte` 라고 하자.
여기서 VPN 과 offset은 몇 bit가 필요할까?

address space가 `64 byte`는 `2 ^ 6` 이므로, **전체 virtual address 는 `6 bit` 를 사용**하게 된다.
page의 크기가 `16 byte` 이므로 addreess space에는 `4 (64 byte/16 byte = 4)` 개의 페이지가 존재한다.
이 4개의 페이지를 나타내기 위해서는 `2^2 = 4` 이므로 `2`비트가 필요하다.
따라서 **VPN은 `2 bit`를 사용**한다.

그리고 페이지 내부에서의 위치를 나타내기 위해서는 페이지가 `16 byte`이므로 `2^4 bit` 가 필요하다.
따라서 16 byte 안에서 위치를 기록하기 위하여 **offset은 `4 bit`를 사용**한다.

```
| VPN (2비트)|     Offset (4비트)     |
|-----|-----|-----|-----|-----|-----|
|  V  |  V  |  O  |  O  |  O  |  O  |
```

이 내용을 통해 page table을 이용하여 virtual address를 physical memory에 매핑하는 과정을 살펴보자.

### Virtual Address → Physical Address

- VPN을 `p`, physical space에서의 page frame number (이하 PFN) 을 `f` 라고 하고,
- offset을 `d` 라고 하자.

VPN은 page table에 의하여 PFN으로 변환되고,
offset은 페이지 안에서의 위치를 나타내고 frame과 page의 크기는 같기 때문에 그 값이 변하지 않는다.

![](https://i.imgur.com/pyXUJRp.png)
따라서

```
| VPN (2비트)|     Offset (4비트)     |
|-----|-----|-----|-----|-----|-----|
|  V  |  V  |  O  |  O  |  O  |  O  |
```

위와 같은 형태의 virtual address가 있고

```
| VPN | PPN |
|-----|-----|
|  00 |  01 |
|  01 |  10 |
|  10 |  11 |
|  11 |  00 |

```

페이지 테이블이 위와 같다면

가상 주소 `10 1100` 은 페이지 테이블을 조회하여 물리 주소 `11 1100` 으로 변환된다.

## Paging의 문제점

### 1. "공간"의 관점

위의 예제의 상황으로 생각해보자.
현재 address space에서 4개의 페이지가 존재하기 때문에 page table entry 역시 2^2개가 존재한다.

그러나 페이지가 더 많이 존재하면 어떻게 될까? 예를 들어 VPN이 10 bit를 차지하고 있다고 하면 page가 2^10개 존재하게 되고 page table 역시 2^10개의 entry를 가지게 된다.

게다가 이러한 페이지 테이블은 **각 address space마다, 즉 각 프로세스 단위로 가지게 되고** 이러한 프로세스들은 운영체제가 관리하기 때문에 **커널에 page table 을 위한 정보를 저장하게 된다.**
즉, **커널은 항상 메모리에 상주하므로, 페이지 테이블도 항상 차지**하게 된다.

> 이를 해결하기 위해 **Paging 과 Segment를 융합한 방식(hybrid approach)를 사용** 하여 각 segment를 위한 page table을 만들고, virtual address에 해당 주소가 어떤 페이지 테이블에 속해있는지에 대한 정보를 추가로 저장하는 방식을 사용할 수 있다.
> 또한 hybrid approach에서 발생할 수 있는 external fragmentation 문제를 해결하기 위하여 (segment 별로 page table을 저장하기 때문에 이들의 크기 역시 다양해진다.) 기존의 linear page table을 tree 형태로 바꿔 저장하는 **multi-level page table** 기법을 사용할 수 있다.

> **Multi-Level Page Table**
>
> - 기존의 연속된 모양의 page table을 tree 형태로 바꾼다.
> - 즉, 페이지 테이블을 메모리에 연속된 공간으로 할당하는게 아니라, 이를 **페이지 크기로 다시 잘라 메모리에 할당한다.**
> - 그리고 이 페이지 테이블의 위치를 기억하기 위하여 이를 기록하고 있는 테이블인 **page directory** 를 상위에 둔다.

## 2. "시간"의 관점

virtual address에서 physical address로 변환하기 위해 **page table을 접근하는 과정에서** 무조건 **메모리로의 접근**이 발생한다.

즉, virtual address → physical address로 접근하는 과정에서 메모리를 **두 번** 접근하게 된다.

1. 메모리에서 page table을 읽어온다.
2. 1.에서 읽어온 정보를 통해 주소 변환 후, 해당 메모리의 해당 주소로 접근한다.

메모리에 접근하는 과정은 CPU에 비해 아주 느리기 때문에, 시스템이 매우 느려질 수 있다.

> 이를 해결하기 위해 TLB (Translation Lookaside Buffer) 를 사용하여 cache 와 유사한 기법을 사용하여 MMU에 지역성을 가지는 주소 변환 정보를 저장해두고 사용할 수 있다.
