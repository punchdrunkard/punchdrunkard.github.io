---
title: CPU 스케줄링 - Multilevel Feedback Queue
published: 2024-01-03
category: Operating System
tags: ['CPU Scheduling', 'Virtualization (OS)']
draft: false
summary: CPU 스케줄링 알고리즘 중 Multilevel Feedback Queue 알고리즘에 대해서 정리해보았습니다.
---

## 개요

CPU 스케줄링 알고리즘은 turnaround time을 최적화하기 위해 SJF (Shortest Job First), STCF (Shortest Time Complete First)알고리즘이 고안되었고 response time을 최적화 하기 위해 RR (Round Robin) 알고리즘이 고안되었다.

SJF, STCF 알고리즘의 경우 **스케줄러에 들어오는 프로세스의 수행 동작을 미리 알고 있다는 가정하**에 수행한다. 하지만 현실 세계에서는 프로세스가 언제 완료될 지 알 수 없기 때문에 이와 같은 알고리즘은 현실적이지 못하다는 단점이 있다.

또한 RR의 경우, 각 프로세스들에 대한 동작을 미리 알 수는 없지만 **turnaround time이 매우 안좋기 때문에, 성능이 좋지 않다.**

따라서 과제는 **workload 에 대한 사전 정보가 없어도 어떻게 성능 (turnaround time) 을 최적화 하고, interactive job을 위해 response time을 최적화 할 수 있을 지** 이다.
다르게 말하면 가장 이상적인 상황은 **현실 세계에서도 SJF나 STCF와 비슷한 turnaround time을 가지면서 RR 처럼 fairness와 response time이 좋은 알고리즘을 수행하는 것**이다.

이를 위해 Multilevel Feedback Queue를 도입하였고, 이 방식에서는 **과거에 workload가 어떻게 수행되었냐를 분석하여 이 workload가 어떤 특성을 가지는지 예측**한다.

## Multilevel Feedback Queue (MLFQ)

MLFQ의 특징은 다음과 같다.

1. 서로 다른 우선 순위가 존재하는 여러 개의 큐가 존재한다. (multilevel)
2. 각 큐에는 프로세스가 들어있다.

기본적으로 우선 순위가 가장 높은 큐에서 다음에 수행할 프로세스를 선택하고, 하나의 큐 내부에서는 프로세스들을 round-robin 방식으로 수행한다.

우선 순위가 높은 큐에 있는 작업일 수록 더 빨리 CPU를 할당받아서 job을 실행할 수 있기 때문에 response time이 짧다.
따라서 우선 순위를 결정하기 위해, response time이 중요한 workload가 어떤 성격을 가지고 있는지 분류하여야 한다.

일반적으로 한 workload는 두 가지의 job 이 섞여 있는 동작을 한다.

1. **interactive job**

   - 계속 사람과 상호작용이 발생한다. (예를 들어 키보드로 입출력을 추고 받는 등의 동작을 생각해볼 수 있다)
   - 한 번에 실행되는 시간이 짧다.
   - **response time**이 중요한 성능 지표이다.
   - **우선 순위를 높게 유지**해야 한다.

2. **CPU-intensive job**
   - 사람과 상호작용이 거의 발생하지 않으며, 꾸준히 CPU를 사용한다.
     - 따라서 response time이 중요하지 않다.
   - 오랜 시간 동안 CPU를 집중적으로 사용한다.
   - **우선 순위가 높지 않아도 된다.**

따라서 I/O 가 자주 수행되는 Interative job 을 가장 높은 우선 순위의 큐로 배치한다.

## Change Priority

이 때, 현실 세계에서는 어떤 workload가 들어왔을 때, 해당 작업이 interactive job 인지 cpu intensive job인지 알 수 없다.

따라서 MLFQ에서는 **우선 해당 workload를 실행해보고, 그 workload가 어떻게 실행되느냐에 따라 다른 우선순위를 배치**한다.

즉, MLFQ에서는 다음과 같이 **우선 순위를 부여**한다.

1. 처음으로 job이 시스템에 들어오면, 가장 높은 우선순위를 부여하여 먼저 실행되게 하고 해당 job이 어떻게 수행되는지 관찰한다.
2. 만약 해당 job이 주어진 time slice를 모두 소진할 때까지 CPU를 사용한다면, CPU-intensive job에 가깝다고 판단할 수 있다.
3. 주어진 time-slice를 다 쓰지 않고 context-switch가 발생한다면 interactive job으로 판단하여 우선 순위를 그대로 유지 한다. (interative job의 경우, I/O에 의하여 중간에 interrupt 가 발생하여 주어진 time slice 이전에 context-switch 가 일어날 가능성이 높다.)

위와 같이 우선 순위를 조정하게 된다면, 결국 **실행시간이 짧은 interactive job이 우선적으로 실행될 것이고, 이는 결국 SJF(Shortest Job First)와 비슷하게 동작시킬 수 있다.**

## Priority Boost

그러나 위와 같은 방식에서는 **계속 interative job만이 큐에 들어온다면 낮은 우선순위 큐에 들어있는 job들에 대해 starvation이 발생**하게 된다. 따라서 낮은 우선순위에 있는 job들도 강제적으로나마 실행시켜줄 방법이 필요하다.

또한 현재는 시간에 따른 workload 의 동작을 반영하지 못한다. 하나의 workload에서 어떤 부분은 interactive job 일 수도, cpu intensive job 일 수도 있다. 따라서, 각 **workload 들을 수행하면서 현재 수행하는 동작이 어떤 동작이냐에 따라 우선순위를 바꿔주는 동작이 필요**하다.

따라서 **일정 주기마다 모든 job들을 가장 우선 순위가 높은 큐로 올려준다.** (priority boost)
이를 통해 **일정 주기마다 모든 job들이 round-robin으로 실행될 수 있다는 것을 보장할 수 있기 때문에** 낮은 우선순위의 job의 실행을 보장하며, 시간에 따라 달라지는 job들의 성격을 반영할 수 있다.

이러한 **일정 주기**를 결정하는 방법은 시스템에 따라 다르며, **해당 값이 너무 크면 cpu intensive job 에 starvatoin이 발생할 수 있으며, 너무 작으면 interactive job의 response time을 보장할 수 없다**.

## 시간에 대한 조정

MLFQ는 **현재 고정된 time slice과 CPU를 할당 받았을 때의 수행 시간을 기준으로** 해당 작업이 interactive 인지, cpu-intensive 인지 판단하기 때문에 의도적으로 time slice 를 거의 다 쓸 쯤에 I/O 를 수행하여 해당 job의 우선순위를 의도적으로 높게 유지할 수 있다.

이러한 일을 방지하기 위해 **현재 프로세스가 CPU를 사용한 시간을 계속 누적하고, 이를 context switch에 반영한다.**

예를 들어, 현재 time slice 가 10 ms 라고 생각해보자.
어떤 작업에서 9ms까지 수행하다가 I/O가 발생한다고 가정하자.

이전의 방식으로는 9ms 를 사용하고 I/O를 해도 해당 작업이 interactive job으로 간주되어, 다음에도 같은 우선순위의 큐에 존재하게 된다. 따라서 해당 큐 내부에 있는 작업들과 동일한 time slice인 10ms를 다시 부여 받게 된다.

그러나 CPU를 사용한 시간을 누적하게 된다면, 우선 작업이 9 ms 수행된 후, 해당 작업이 다시 스케줄링 되었을 때 1 ms를 더 사용하면 time slice인 10 ms를 모두 소진하게 되고, 이는 수행 시간이 긴 작업으로 판단되어 우선순위를 강등한다.

## Time Slice의 조정

**Interactive job은 수행시간이 짧은 편이고, CPU intensive job은 수행시간이 긴 편이라는 특성을 이용하여 각 우선 순위 큐에 따라 다른 time slice를 부여하여 MLFQ를 더욱 최적화 할 수 있다.**

## 참고 자료

[운영체제 아주 쉬운 세 가지 이야기](https://m.yes24.com/Goods/Detail/38092578)
