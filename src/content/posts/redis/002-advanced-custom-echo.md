---

title: "[Redis] 커스텀 명령어 - echo 응답에 접두사 붙이기"
published: 2025-05-27
description: Redis 서버에서 `echoPunchDrunkard abc`를 `echoPunchDrunkard_abc`로 응답하도록 커스텀 명령어를 개발한다. 
tags: ["Redis", "SDS", "OpenUp-2025"]
category: Redis
draft: false
---  

## 과제 설명

이번에는 [**지난 번에 만든 커스텀 echo 명령어**](https://punchdrunkard.github.io/posts/redis/001-custom-echo/)를 더 개선한다.
이전에 만든 커스텀 명령어의 경우 `echo` 와 완전히 동일한 동작을 했다면, 이번에는 **명령어를 보냈을 때, 돌아오는 명령을 수정하는 것**이다.

즉, `echoPunchDrunkard abc` 라고 보내면, `echoPunchDrunkard_abc` 로 응답이 오도록 하는 것을 목표로 한다.

![Result](https://github.com/user-attachments/assets/4644fd88-f9e5-49fe-bfdb-88b7705c94c6)

지난 번과 마찬가지로 작업 환경은 `valkey` 레포지토리를 fork 하여 사용한다.

::github{repo="valkey-io/valkey"}

## 과제 분석

### `echoCommand`

이전의 `echo` 명령어의 핸들러 함수인 `echoCommand` 함수를 다시 한 번 살펴보자.

![echoCommand](https://github.com/user-attachments/assets/5b9a374d-6605-41cb-aea3-2a2b42379be7)

`echoCommand` 함수는 `addReplyBulk` 함수를 통해서 사용자(`client`)가 넘겨준 인자를 그대로 응답을 보낸다.

![client](https://github.com/user-attachments/assets/98d0e6e7-d119-4e58-a344-aa68fa1aaf79)

`addReplyBulk`의 파라미터와 `client` 구조체를 살펴보면 우리가 커맨드라인에 보낸 명령은 `argv` 를 통해 전달되며 `**argv` 의 타입은 `robj` 이다. 즉, 우리가 커맨드라인에 보낸 명령은 **robj 포인터의 배열** 로 전달된다.

### `robj` (`serverObject`)

`robj` 객체에 대해서 살펴보자. `server.h` 를 확인해보면 `robj` 는 `serverObject` 의 `typedef` 이다.

```c
typedef struct serverObject robj;
```

`server.h`의  `serverObject` 객체는 다음과 같다.

![robj](https://github.com/user-attachments/assets/e292f3a2-d7e7-4bb1-a9c1-4e9f8f7cac1d)

해당 구조체 정의 위의 매크로와 주석을 살펴보면 (`server.h`의 `697 line~`) 각 필드에 대응하는 값들이 어떤 역할을 하는지 알 수 있다.

`type` 필드는 해당 객체가 Redis의 어떤 데이터 타입인지(`REDIS_STRING`, `REDIS_LIST`, `REDIS_HASH`, `REDIS_MODULE`, `REDIS_STREAM` 등)를 나타내며, `encoding` 필드는 해당 객체가 메모리에서 어떤 방식으로 인코딩되어 있는지(`OBJ_ENCODING_RAW`, `OBJ_ENCODING_INT`, `OBJ_ENCODING_EMBSTR` 등)를 나타낸다. `lru` 필드는 객체에 대한 캐시 정책(LRU) 정보를, `hasexpire` 필드는 만료 시간을 가지고 있는지 여부를, `refcount` 필드는 참조 횟수를 나타냅니다.

정리하자면 `robj` (`serverObject`)는 **Redis의 내부의 객체들을 추상화한 객체**라고 요약할 수 있다.

### `processInputBuffer(clinet *c)`

command line이 어떻게 처리되는지 확인하기 위해 `networking.c`의 `processInputBuffer` 함수를 살펴보자.

![processInputBuffer](https://github.com/user-attachments/assets/a275a62c-43c5-4110-958e-9c6b44eabdec)
![parseCommand](https://github.com/user-attachments/assets/5f9dbc8e-a71c-45f5-86e3-dc58bcfe54ec)

`processInputBuffer` 함수에서 `parseCommand` 를 통해 명령어를 파싱하는데, 커맨드라인을 `RESP` 형식으로 파싱하기 위해서는 `processMultibulkBuffer` 함수를 이용한다. (`networking.c`)

![processMultibulkBuffer](https://github.com/user-attachments/assets/d8779b9b-dbe5-47ba-9f32-782e51a4f46d)

해당 함수의 동작을 요약하면

1. RESP 프로토콜을 분석하여 명령어 인자 개수 (`c→argc`) 를 파악하고, 이에 따라 `argv` 배열을 위한 메모리 공간을 할당한다. (`networking.c` 의 `2876 line` 주석 참고)
2. 인자 개수 만큼 반복하며 각 인자를 처리한다. (`2911 line`의 `while (c->multibulklen)`)

    ```c
    // networking.c 의 processInputBuffer 함수 일부 (line 2999 ~)
    else { 
      // 새로운 문자열 robj(Redis Object)를 생성하고, 이를 c->argv 배열에 추가
     c->argv[c->argc++] = createStringObject(c->querybuf + c->qb_pos, c->bulklen);
     // 이하 생략 
    ```

    - 각 인자의 데이터를 통해 새로운 SDS를 생성하고, 이를 `robj` 로 래핑한다.
    - 이렇게 생성된 `robj` 의 포인터를 `c->argv` 배열의 다음 빈 슬롯에 저장한다.

따라서 `echo hello` 라는 명령어가 입력되었다면 다음과 같은 `argv` 배열이 할당된다.

![argv 배열](https://github.com/user-attachments/assets/c4e6c567-3af5-416e-9eb6-40338df0fb4f)

### SDS (Simple Dynamic String) 와 `addReply` (Redis에서 문자열을 응답하는 방식)

우리의 목표는 `echoPunchDrunkard_abc`와 같은 새로운 문자열을 클라이언트에게 응답하는 것이다.

Redis에서 문자열을 응답하기 위해서 `addReply` 함수 계열을 사용하고, 문자열을 다루는데는 SDS 라이브러리를 사용한다.

**SDS (Simple Dynamic String)**

::github{repo="antirez/sds"}

sds는 Redis 에서 문자열을 다루기 위해 만들어진 문자열 라이브러리이다.

```
+--------+-------------------------------+-----------+
| Header | Binary safe C alike string... | Null term |
+--------+-------------------------------+-----------+
         |
         `-> Pointer returned to the user.
```

위와 같은 메모리 배치를 이용하여 (앞에 header를 붙이는 방식) C의 일반적인 문자열과 호환되며, 개별 문자에 접근하기 쉽고, 단일 할당을 통해 캐시 지역성을 높여 성능이 좋다고 한다.

우리가 해야하는 작업은 **접두사 문자열 (`echoPunchDrunkard_`)와 인자로 들어온 문자열 (`argv[1]`) 을 합쳐 새로운 sds 문자열을 만드는 것이다.** 이를 위해 `sdscatfmt` 함수를 사용할 수 있다.

:::note[`sdscatfmt` 함수]

`sdscatfmt`는 `printf`와 유사한 포맷팅 기능을 제공하면서 **기존 SDS에 문자열을 이어붙이는(append) 함수**이다.

```c
sds sdscatfmt(sds s, char const *fmt, ...);
```

- `s`: 내용을 이어붙일 대상 SDS 문자열, 새로운 SDS 문자열을 생성하고 싶다면 `sdsempty()` 전달
- `fmt` : 포맷팅 규칙을 정의 (예: `%s`, `%S` (SDS 문자열의 경우))

:::

**`addReplyBulkSds`**

Redis에서 `sds` 타입의 문자열을 직접 응답으로 보는 함수로 `networking.c` 에 `addReplyBulkSds` 가 존재한다.

![addReplyBulkSds](https://github.com/user-attachments/assets/b91daaed-3839-465d-ac1d-28a2e7a48004)

함수의 동작을 확인해보면 인자로 받은 `sds` 를 응답으로 전송한 후, 메모리를 해제하는 역할을 한다.

## 구현

따라서 과제를 위해 해야하는 작업은 다음과 같이 요약할 수 있다.

1. `echoPunchDrunkard_` 라는 접두사와 클라이언트가 보낸 인자(`c→argv[1]`) 를 결합하여 SDS 문자열을 생성한다.
2. 1.에서 만든 SDS 문자열을 `addReplyBulkSds` 를 통해 클라이언트에게 보낸다.

위의 동작을 커스텀 명령어의 핸들러 함수인 `echoCommandPunchDrunkard(client *c)` 에 정의해주면 된다.

`echoPunchdrunkard` 를 정의할 때, 기존의 `echo` 명령어와  `arity`  를 똑같이 정의하였기 때문에 우리는 단순히 `c->argv[1]->ptr` 에 있는 SDS 문자열과 접두사 문자열을 결합한 후, 이를 그대로 클라이언트에게 `addReplyBulkSds` 를 이용해서 응답하면 된다.

따라서 코드로 구현하면 다음과 같다.

![echoCommandPunchDrunkard](https://github.com/user-attachments/assets/2ccb3148-461a-44e5-a1bc-2c2d3edc16a0)

## 결과

커스텀 명령어를 실행하면 다음과 같은 결과가 나온다.

![Result](https://github.com/user-attachments/assets/a030e0a1-a723-48e6-aa21-c98a4dbb868e)

## 참고 자료

- <https://redis.io/docs/latest/commands/object-encoding/>
- <https://github.com/antirez/sds>
