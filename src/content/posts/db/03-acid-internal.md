---

title: "[Database] ACID 보장을 위한 DBMS 동작 방식 (MySQL 위주)"
published: 2025-06-19
description: 트랜잭션의 ACID를 보장하기 위한 DBMS의 내부 동작에 대해 알아보자.
tags: ["Database", "Transaction", "ACID", "MySQL", "InnoDB"]
category: Database
draft: false
---  

## Introduction

데이터베이스 시스템은 트랜잭션의 안전한 수행을 위해 ACID 속성을 보장한다.

:::important[ACID]

- **Atomicity** : all or nothing, 트랜잭션의 내부의 모든 연산이 성공하거나 모두 취소되어야 한다. 따라서 트랜잭션이 중간에 실패한다면 롤백되어야 한다.
- **Consistency** : 데이터의 일관성이 보장되어야 한다. 예를 들어, 트랜잭션 전후로 데이터베이스의 제약 조건이 유지되어야 한다.
- **Isolation** : 여러 트랜잭션이 동시에 실행될 때, 서로의 작업에 영향을 미치지 않고 독립적으로 실행되는 것처럼 보여야 한다.
- **Durability** : 데이터베이스는 디스크에 트랜잭션의 결과가 기록됨을 보장해야 한다. 성공적으로 완료된(커밋된) 트랜잭션의 결과는 영구적으로 저장되어야 하며, 시스템에 장애(예: 정전, 서버 다운)가 발생하더라도 절대 사라지지 않아야 한다.

:::

이러한 ACID 속성은 DBMS의 Storage Engine이 담당한다.
트랜잭션의 ACID 보장을 위해 DBMS가 어떻게 동작하는지 알아보자.

## `fsync()`

데이터베이스의 `COMMIT` 연산이 **디스크에 기록된다**는 것을 DBMS 는 어떻게 보장할까? DBMS는 Durability를 위해 데이터를 쓸 때 `write()` 뿐만 아니라 `fsync()` 를 사용한다.

`fsync()` 함수는 `fd` 로 지정된 파일과 관련된 변경 내역을 디스크와 동기화 하는 함수이다. 일반적으로 `write()` 와 같은 디스크 I/O 연산은 커널 안의 버퍼 캐시나 페이지 캐시를 거치게 되기 때문에, 해당 연산이 수행되었다고 해도 실제로 디스크에 쓰기 연산이 수행됨을 보장할 수 없다. 하지만 `fsync()` 를 사용하면 **모든 버퍼 내용을 디스크와 동기화**하게 되므로 디스크 상의 파일 시스템과 버퍼 캐시의 내용의 불일치 문제를 해결한다.

하나의 트랜잭션이 커밋될 때 `fsync()`를 통해 변경사항이 디스크에 기록되므로, 각 트랜잭션의 Durability 속성을 보장할 수 있다.

:::note[`fsync()`의 오버헤드]

`fsync()` 는 동기적(Synchronous) 연산이므로 **성능 상 오버헤드**가 있다. DBMS에서 `fsync()`의 오버헤드를 줄이기 위해 그룹 커밋이나 (MySQL InnoDB 스토리지 엔진 기준) `innodb_flush_log_at_trx_commit` 과 같은 옵션을 사용하여 동기화 주기를 설정한다.

:::

## 로그를 이용한 복구

데이터베이스 시점에서 **복구**가 필요하다는 건 어떤걸 의미할까?

우선 **트랜잭션 단위로 생각한다면, 트랜잭션이 실패했다면 데이터 일관성을 위해 트랜잭션 수행 전으로 복구하는 작업이 필요**하다.

또한 **만약 시스템에 장애가 생겨서, 데이터베이스에서 수행된 연산들이 디스크에 모두 기록되지 않았을 때, 해당 연산의 결과들을 디스크에 동기화해야 한다.** 왜냐하면 데이터베이스에서 Durability를 보장한다는 것은 사용자 입장에서 연산의 결과가 디스크에 저장되었음으로 간주하는 것이기 때문에 DBMS는 이러한 동기화를 처리해주어야 한다.

이러한 복구 작업을 위해 MySQL과 같은 DBMS에서는 **로그를 이용**한다.

**로그**는 `LSN (Log Sequence Number)`을 가지며, 로그가 기록될 때 마다 LSN은 단조 증가한다. 또한 MySQL (InnoDB 스토리지 엔진)은 주기적으로 체크포인트 이벤트를 발생시켜 특정 시점까지의 모든 내용이 디스크에 영구적으로 저장되었음을 보장하는 기준점을 갱신한다.

### UNDO 로그

트랜잭션 단위의 복구를 생각해보자. 해당 복구의 목적은 **데이터의 상태를 트랜잭션 이전의 상태로 되돌리는 것이다. 즉 Undo 로그의 목표는 트랜잭션의 Atomicity를 보장하는 것이다.**

로그를 통해 복구를 수행하려면, 해당 트랜잭션의 **마지막 로그부터 거꾸로 타고 올라가며** 복구를 수행하면 된다.

예를 들어 다음과 같은 로그가 있다고 가정하자.

```
LSN 100 (T1 Begin)
LSN 150 (T1 Update A, PrevLSN=100)
LSN 200 (T1, Update B, PrevLSN=150)
LSN 220 (T2, ...)
```

여기서 트랜잭션 `T1`에 대한 로그는 `200 → 150 → 100` 의 연결 리스트 형태를 보인다.

이 상태에서 `T1`에 대한 `ROLLBACK`을 수행한다고 가정하자. 그렇다면 `T1`의 마지막 로그인 `200` 부터 철회를 시작한다.

로그에 대한 `UNDO`를 실행한다면 CLR (Compensation Log Record)라고 하는 로그를 작성한다. CLR에는 UNDO 한 로그의 이전 포인터 값을 가지게 된다. 즉 **`200`에 대한 UNDO 를 실행한다면 `200`에 대한 이전 포인터인 `150`을 가지는 CLR 로그가 추**가된다.

따라서 `200`에 대해 `UNDO`를 수행한 로그의 상태는 다음과 같다.

```
LSN 100 (T1 Begin)
LSN 150 (T1 Update A, PrevLSN=100)
LSN 200 (T1, Update B, PrevLSN=150)
LSN 220 (T2, ...)
LSN 250 (T1, CLR for LSN 200, ...)
```

따라서 T1의 로그 체인은 다음과 같이 변한다.

`CLR(250) → 150 → 100`

즉, `UNDO`한 LSN 200을 건너뛰게 되는 것이다.

### REDO 로그

**시스템에 장애가 생겨서, 데이터베이스에서 수행된 연산들이 디스크에 모두 기록되지 않았을 때, 해당 연산의 결과들을 디스크에 동기화해야 한다.**

시스템에 장애가 생겨서, 이를 복구하는 상황을 가정해보자. 이를 위해 필요한 작업은 다음과 같다.

1. 장애가 생긴 시점까지의 데이터베이스 상태와 디스크 상태를 일치시켜주기
2. 마지막 시점에서의 데이터 일관성을 보장하기

이 중 1. 의 작업을 위해서 REDO 로그를 사용한다.

앞서 언급했듯이, DBMS는 Checkpoint 이벤트를 통해서 디스크에 반영된 최종 시점을 기록하는데 해당 시점부터의 로그를 순서대로 적용시켜나가는 식으로 복구를 수행한다. 즉 **체크포인트 이후의 모든 로그를 적용하여 일단 시스템을 장애 직전 상태로 재현한다.**

### Use case: 장애 복구

따라서 장애를 복구하는 과정은 다음 그림처럼 나타낼 수 있다.

![use case - sequence diagram](https://github.com/user-attachments/assets/db15d560-867f-4821-918a-bd7e9ebfd2c1)

1. 마지막 체크포인트 부터 로그를 훑으며, **어떤 작업이 REDO와 UNDO의 대상이 될 지 분석**한다.
2. **REDO 로그**를 실행 하여, 시스템을 장애 발생 직전의 순간으로 되돌린다.
3. 1.에서 파악한 커밋되지 않은 트랜잭션들을 **UNDO 로그를 이용**해 롤백하여 최종적인 데이터 일관성을 맞춘다.

## 참고 자료

- [『Real MySQL 8.0』 (백은빈, 이성욱, 위키북스)](https://wikibook.co.kr/realmysql801/)
- [DBMS는 어떻게 트랜잭션을 관리할까? - Naver D2](https://d2.naver.com/helloworld/407507)
