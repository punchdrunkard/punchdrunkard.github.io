---
title: Swapping, Demand Page
published: 2024-02-07
category: Operating System
tags: ['Virtualization (OS)', 'Memory Management', 'Paging']
draft: false
summary: 실제로 컴퓨터를 사용할 때, 메모리 용량 보다 더 큰 주소 공간을 요구하는 프로세스 역시 실행할 수 있습니다. Swapping 기법을 사용하면 메모리에는 현재 필요한 페이지들만 존재하기 때문에 공간을 아낄 수 있고, 더 많은 프로세스를 동시에 사용할 수 있습니다.
---

## 도입 배경

어떤 프로그램을 실행할 때, **프로그램의 전체 주소 공간을 메모리에 올릴 필요는 없을 것이다.**

예를 들어, 어떤 비디오 파일을 재생하고 있을 때 비디오의 첫 부분을 보고 있다면 현재로써는 비디오의 엔딩 크레딧 부분을 가져올 필요가 없다.

**Demand Paging** 기법에서는 어떤 프로그램을 실행한다고 해서 그 프로그램의 이미지 전체를 메모리에 가져오는게 아니라, **필요할 때 마다 디스크(secondary storage)에서 메모리로 가져오는 기법을 사용한다.**

그리고 메모리의 공간이 부족하게 된다면, **메모리에 올라온 기존의 페이지를 디스크로 쫓아내어 (evict) 현재 필요한 페이지를 할당**한다.

이 기법을 쓰면 메모리에는 현재 필요한 페이지들만 존재하기 때문에 공간을 아낄 수 있고, 더 많은 프로세스를 동시에 사용할 수 있다.

그렇다면 Demand Paging 에서 다음과 같은 상황들을 고려해야 한다.

- **페이지를 사용할 때, 해당 페이지가 메모리에 존재하지 않고 디스크에 존재한다면?** (page fault)
- **기존의 페이지를 쫓아내게 된다면, 어떤 페이지부터 쫓아내야 할까?**

## Swapping

위와 같이, 메모리에는 필요한 부분만 올리고 더 이상 그 부분이 필요없어지면 secondary store로 내리는 기법을 **swapping**이라고 한다.

**page-level**에서의 swapping에서는 page 단위로 메모리와 디스크에 page 를 올리고 내린다.
이 때 memory 에서 secondary store 로 내리는 과정을 `swap-out` 이라고 하고, secondary store에서 memory로 올리는 과정을 `swap-in` 이라고 한다.

프로세스가 수행되는 동안 이러한 `swap-in`과 `swap-out`이 반복적으로 이루어진다.

### Swap space

swapping을 위하여 디스크의 일부를 swap의 용도를 reserve 해두는데 이 공간을 **swap space** 라고 한다. 이러한 swap space는 디스크에서 일반적인 파일 시스템과 분리되어있는 특정 partition을 이용한다.

swap space에서는 주소 공간에서 **현재 사용하지 않는 페이지를 임시로 저장**한다. **따라서 swap space에서의 block size는 page size와 같다.**

운영체제는 이 swap space 공간을 관리해야 한다.
따라서 **swap space의 크기가 얼마인지 알고 있어야 하며, 이 공간을 page 단위로 나누어서 관리**해야 한다.

이러한 swap space를 사용함으로써 **제한된 메모리를 더욱 효율적으로 사용할 수 있다.** 따라서 매우 큰 주소 공간을 가지고 있는 여러 개의 프로세스를 동시에 수행할 수 있는 것이다.

## Page Fault

### Present Bit

swap space를 이용함으로써, 가상 주소가 존재하는 페이지는 **메모리에 존재할 수도 있고, 디스크에 존재할 수도 있게 된다.**

즉, **페이지에 접근하기 위해서는 해당 page frame이 메모리에 있는지, 디스크에 있는지를 알려주는 정보**가 필요하다.

이러한 정보는 해당 VPN의 page table entry의 **present bit**로 나타낸다.

**present bit이 `1`이라면 현재 페이지가 메모리에 존재함**을 나타내고,
**present bit이 `0`이라면 현재 페이지가 메모리가 존재하지 않음**을 나타낸다.

따라서 present bit이 `0`이라면 page frame이 메모리에 있지 않기 때문에 디스크에서 메모리로 읽어오는 과정이 필요하다. 이러한 상황에 발생하는 예외(exception)을 **page fault**라고 하고, 이를 처리하기 위해 수행하는 코드가 **page-fault handler**이다.

### Page Fault

**현재 페이지가 메모리에 존재하지 않는 다는 것**은 다음과 같은 세 가지 상황이 가능하다.

1. Major Page Fault
   - 원하는 페이지를 디스크에서 읽어와야 하는 경우 (디스크 I/O 작업이 필요한 경우)
2. Minor Page Fault
   - 디스크 I/O 없이 처리가 가능한 경우
   - 원하는 페이지가 이미 메모리에 올라온 경우 (예: shared library)
   - 페이지가 prefetch 되어 있는 경우
   - _주로 페이지가 이미 메모리에 존재하지만, 특정 프로세스의 페이지 테이블에는 매핑되지 않은 경우를 의미힌다._
3. Invalid Page Fault
   - 접근하면 안되는 / 접근 권한이 없는 address space 에 접근한 경우

### Page Fault Control Flow

Page fault는 다음과 같은 과정으로 처리된다.

1. page table에 접근
2. page table의 present bit를 확인하여, present bit 이 0이라면 (해당 페이지가 메모리에 없다면) trap 발생 (page fault)
3. OS가 trap을 감지하고 page fault handler를 호출
4. 3.에 의해 원하는 페이지를 secondary store에서 읽어옴
5. page table 갱신
6. 실패했던 연산을 재시도

## Page Replacement Policy

메모리 공간이 부족하다면, 메모리에 있는 페이지를 swap-out 하여 빈 공간을 확보해야 한다.
이러한 과정을 **page replacement policy라고 한다.**

### When To Swap

메모리가 실제로 빈 공간이 없어질 때까지 기다리고, 꽉 찰때마다 페이지를 교체하는 작업은 비효율적이다. 따라서 **운영체제는 메모리의 빈 공간을 일정 크기로 유지한다.**

이를 위해 운영체제는 **Swap daemon (Page daemon)을 이용**한다. 이는 page replacement를 시작해야 할 기준 점인 LW (Low Watermark)에서 작업을 시작하고, 비어있는 페이지의 갯수가 HW (High Watermark) 가 될 때까지 작업을 수행한다.

### What to Swap

페이지 프레임의 타입에 따라 swap 할지, 메모리에 상주할지, 혹은 swap space에도 저장하지 않을지가 결정된다.

주로 **os와 관련된 커널 코드**는 항상 메모리에 상주하고,
**user program에 의해 생성된 데이터**의 경우, 이미 디스크에 있는 내용(혹은 디스크에서 읽어온 후 변하지 않은 내용) 이라면 drop,disk에 존재하지 않거나, disk에서 읽어온 **데이터가 달라진 경우**에는 swap 된다.
그리고 **file system 을 위한** 매모리 매핑 파일 (files mapped) 의 경우 이 페이지들은 이미 디스크에 존재하는 파일의 일부이기 때문에 drop 하거나 변화가 있다면 file system에 기록한다.
page cache pages 시 파일 시스템 데이터이므로 디스크에 존재하는 파일의 일부이기 때문에 drop 하거나 file system에 기록한다.

각 유형별로 정리하면 다음과 같다.

- kernel code → not swapped (메모리에 항상 상주)
- kernel data → not swapped (메모리에 항상 상주)
- page tables for user processes → not swapped (메모리에 항상 상주)
- kernel stack for user processes → not swapped (메모리에 항상 상주)
- user code pages → dropped
- user data pages → dropped (데이터가 수정되지 않은 경우) or swapped (데이터가 수정된 경우)
- user heap/stack pages → swapped
- files mmaped (memory-mapped file) → dropped or file system
- page cache pages → drop or go to the file system

> Files Mmaped (Memory-mapped files)
>
> - 파일의 일부 또는 전체를 메모리 주소 공간에 매핑하여, 파일 접근을 메모리 접근처럼 빠르고 효율적으로 할 수 있도록 한다.
> - 파일에 대한 변경은 메모리에 반영되고, 이 변경 사항은 나중에 파일 시스템에도 반영된다.
>
> Page Caches Pages
>
> - 디스크 기반의 파일 시스템 데이터를 메모리에 캐싱한다. 이는 파일 입출력 작업의 성능을 향상 시키기 위해 사용한다.
> - 파일에서 읽거나 쓴 데이터는 페이지 캐시에 저장된다. 이 후 동일한 데이터에 대한 접근이 있을 때, 운영 체제는 해당 데이터를 메모리 접근에 의해 제공할 수 있다.

### How To Swap

Replacement Policy 의 목표는 성능 향상을 위해 **cache miss의 횟수를 최소화 하는 것**이다.
여기서 **cache**의 의미는 CPU cache가 아니라 memory가 아래 계층의 secondary disk에 대한 일종의 cache 역할을 수행하기 때문에 해당 용어를 사용한다.

즉, **목표는 어떤 페이지에 접근할 때, disk 까지 내려가지 않고 최대한 memory에서 접근할 수 있도록 하는 것이다.**

따라서 cache hit는 page를 memory에서 읽음을 의미하고, cache miss는 disk에서 읽음을 의미한다.

> **현재 말하는 cache는 CPU Cache가 아님에 주의한다!**

#### Least Recently Used (LRU)

페이지를 효율적으로 교체하기 위하여 **과거의 페이지 접근 방식을 통하여 다음에 교체할 페이지를 결정**해야한다. LRU (Least Recently Used) 방식에서는 **과거의 패턴 중 recency (얼마나 최근에 접근되었는가?) 를 기반으로 한다.** 즉, **가장 오랜 시간 동안 사용하지 않은 페이지를 쫓아내낸다.**

**장점**

- locality 에 기반하기 때문에 최적의 경우에 근접하다.
- stack 알고리즘의 일종으로써, Belady's Anomaly가 없다.

**단점**

- **모든 페이지를 언제 접근했는지를 기록해야 하기 때문에 구현이 어렵다.**
- 지역성 중 frequency 는 고려하지 않기 때문에 **공간 지역성을 가지는 workload의 경우 (ex: loopiing sequntial)에 매우 취약하다.**

### LRU in Real World

위에서 언급한 LRU의 단점 때문에 실제로 LRU를 구현 할 때, 그대로 구현하지 않고 이와 비슷하게 동작하는 **LRU apprioximation을 주로 구현한다.**

#### Use bit

페이지가 언제 접근했는지 모두 기록해야 하는 오버헤드를 최소화 하기 위해 **하드웨어를 이용하여 `use bit` 를 사용한다.** 이는 페이지가 **언제 접근되었는지를 모두 기록하는게 아니라 페이지가 접근 되었는지 / 접근 되지 않았는지 에 대한 정보만 기록**한다.

`use bit` 가 `1` 이라면 **페이지가 접근 되었다**를 의미하고,
`use bit`가 `0`이라면 **페이지가 접근되지 않았다**를 의미한다.

### Clock Algorithm

![](https://i.imgur.com/AS29l3O.png)

대표적인 LRU approximation 중 하나이다.
Clock Algorithm에서는 모든 페이지가 원형 리스트를 이룬다고 보고, 특정 페이지를 가리키는 Clock hand를 둔다.

이 때, Page Fault 가 일어나면 Clock hand가 돌아가면서 **`use bit` 가 `0` 인 페이지를 찾아 그 페이지를 교체**한다.
use bit가 0인 페이지를 찾기까지 **만나는 페이지의 `use bit` 가 `1`이면 그 값을 clear (0으로 set) 한다.**

## Prefetching

성능 향상을 위해 OS가 미래에 어떤 페이지가 사용될지 예측해서 **페이지를 미리 메모리로 올리는 동작을 수행할 수도 있다.** 이 동작을 **prefetching**이라고 부른다.

가장 대표적으로 **순차적인 접근** 의 workload에서 사용될 수 있다.

## Thrashing

실제 메모리에 비해 메모리 요구양이 너무 큰 경우를 의미한다.
이 경우 page replacement 동작이 연쇄적으로 일어나게 되면서 (page replacement를 하자마자 또 메모리가 부족해지기 때문에) 실제 프로세스를 위한 동작을 할 수 없게 되므로 CPU utilization 이 낮아진다.

이를 해결하기 위해 linux에서는 메모리 요구가 너무 많거나, 일정 이상을 초과하면 out of memory killer라는 daemon을 수행시켜 해당 process를 강제로 kill한다.
