---

title: "[Redis] Redis 에서 커스텀 명령어 만들기"
published: 2025-05-20
description: echo와 같은 기능을 하는 커스텀 명령어 echoPunchDrunkard를 Redis 서버에서 실행되도록 해보자.
tags: ["Redis", "RESP", "OpenUp-2025"]
category: Redis
draft: false
---  

## 과제 설명

`valkey` 에 커스텀 명령어 `echoPunchDrunkard` 를 추가한다. 명령어의 기능은 `echo` 와 동일하게 입력받은 문자열을 그대로 반환하는 것이다.
작업 환경의 경우 아래 `valkey` 레포지토리를 fork하여 사용한다.

::github{repo="valkey-io/valkey"}

## 기존 `echo` 명령어 분석

먼저 기존 `echo` 명령어가 Valkey에서 어떻게 정의되고 동작하는지 확인해보자.

### 명령어 정의 (`commands.def`)

`echo` 명령어가 정의된 부분은 `commands.def` 에서 찾을 수 있다.

![Image](https://github.com/user-attachments/assets/80ccdc07-907f-45ce-bab9-da2c0166cb9a)

`MAKE_CMD` 라는 매크로를 통해서 명령어 `echo` 가 정의되어있다.

`commands.def` 에서 `MAKE_CMD` 를 더 살펴보면:

![Image](https://github.com/user-attachments/assets/b3e22550-6677-49da-a70b-df537d18685d)

약 `10092` 번째 라인부터 `XINFO_Subcommands[]` 배열에 `MAKE_CMD`
 매크로를 통해 **Redis 에서 사용되는 명령어들이 정의되어 있음을 확인할 수 있다.**

따라서, 새로운 명령어를 추가하려면 우리도 이 배열 안에 안에 `MAKE_CMD`를 사용하여 명령어를 정의해야 한다.

### `MAKE_CMD` 매크로

`MAKE_CMD` 의 인자가 어떻게 정의되었는지 확인하기 위해 `commands.c` 를 확인해보자.

![Image](https://github.com/user-attachments/assets/81008e25-f248-41d5-9fe0-bf8edfbac685)

`MAKE_CMD` 의 인자는 위와 같이 정의된다.

우리가 만들 커스텀 명령어는 기본적으로 `echo` 와 같은 동작을 하기 때문에 **명령어의 이름 (`name`)** 과 **해당 명령어를 통해 실행할 함수 `function`** 을 정의하면 된다.

### `echoCommand` 함수

우선 명령어를 실행할 함수를 만들어보자. 위의 `commands.d` 의 `echo` 정의를 보면 `echo` 명령어에 대한 함수의 이름은 `echoCommand` 이다.

`echoCommand` 를 찾기 위해 `grep -n echoCommand -r` 을 실행하면

![Image](https://github.com/user-attachments/assets/aa0ed27d-f115-409d-9e01-5b398f5a90bc)

(스크린샷의 경우, 이미 커스텀 명령어를 정의한 이후 캡처하였기 떄문에 커스텀 명령어가 함께 나오고 있습니다.)

`echoCommand` 함수는 `server.c` 파일에 정의되어 있으며 `server.h` 에 선언되어 있음을 알 수 있다.

따라서 커스텀 명령어를 만들때도 `server.c` 파일에 함수를 정의하고 `server.h` 에 선언해야 한다.

![Image](https://github.com/user-attachments/assets/cbb75691-0713-4e29-8d70-646d96c35623)

`echoCommand` 의 정의를 보면 `addReplyBulk` 함수를 통해, 사용자의 입력을 똑같이 돌려주는 기능을 구현하고 있음을 확인할 수 있다.

조금 더 해당 함수를 분석해보자.

`addReplyBulk` 함수의 경우, `networking.c` 에 정의되어 있는데 서버에서 클라이언트에게 데이터 객체를 벌크 형식 (바이너리 형식)으로 응답할 때 사용하는 함수이다.

![Image](https://github.com/user-attachments/assets/608da1f5-4649-4643-9dd0-72529f1e149e)

:::tip[RESP의 Bulk 형식]
Redis Serialization Protocol(RESP)에서는 클라이언트가 명령을 서버에 벌크 문자열 배열로 보내고, 서버는 RESP 형식으로 응답한다.
여기서 RESP 문자열은 simple, bulk 유형으로 나뉘는데 이 중 bulk 유형의 경우 모든 바이너리 데이터를 포함할 수 있는 유형이다.

벌크 문자열은 다음과 같은 형식으로 표현된다.

```
$<length>\r\n<data>\r\n
```

- `$`로 시작
- 데이터의 바이트 길이
- CRLF(`\r\n`) 줄바꿈
- 실제 데이터
- 마지막 CRLF(`\r\n`) 줄바꿈

따라서 `addReplyBulk` 경우, 이러한 형식에 맞게 응답을 구성한다.

1. `addReplyBulkLen` 함수로 `$<length>\r\n` 부분 추가
2. `addReply` 함수로 실제 데이터 `<data>` 추가
3. `addReplyProto` 함수로 마지막 `\r\n` 추가

:::

인자로 들어가는 `client` 구조체의 경우, `server.h` 에 정의되어 있다.
![Image](https://github.com/user-attachments/assets/26a8aedd-f1f2-400a-9071-1afa3cb2060c)

이 구조체는 클라이언트의 연결 정보와 상태를 저장한다.
따라서 `c->argv[1]` 은 명령어 다음에 오는 첫 번째 인자를 의미하며, 예를 들어 `echo hello` 라는 명령이 입력되면 `argv[1]` 은 `hello` 가 된다.

## 커스텀 명령어 구현

이제 커스텀 명령어 `echoPunchDrunkard` 를 추가해보자.

1. 우선 `server.c` 에 등록할 명령어 처리 함수를 구현한다.

![Image](https://github.com/user-attachments/assets/18950021-2fe4-4d75-ab7f-aae28e183046)

2. 헤더 파일 (`server.h`)에 함수의 선언을 추가한다.

![Image](https://github.com/user-attachments/assets/7c032cc1-780b-4fdb-b5f6-69445fbe8df9)

3. `commands.def` 에 `MAKE_CMD` 를 통해 명령어를 테이블에 등록한다.

```c
{MAKE_CMD("echoPunchDrunkard","Returns the given string. (custom)","O(1)","1.0.0",CMD_DOC_NONE,NULL,NULL,"connect      ion",COMMAND_GROUP_CONNECTION,ECHO_History,0,ECHO_Tips,0,echoPunchDrunkard,2,CMD_LOADING|CMD_STALE|CMD_FAST,ACL_C      ATEGORY_CONNECTION,ECHO_Keyspecs,0,NULL,1),.args=ECHO_Args},
```

![Image](https://github.com/user-attachments/assets/023d9af3-6e5f-4965-a4f2-23712ce02964)

3. 변경 사항을 적용하기 위해 다음 명령어로 프로젝트를 재빌드한다.

```bash
make clean
make
```

명령어를 실행하면 다음과 같이 작동한다.
![Image](https://github.com/user-attachments/assets/cc5f010c-896b-42e6-861d-60062bb17b9f)

## 참고 자료

- <https://redis.io/docs/latest/develop/reference/protocol-spec/#bulk-strings>
- <https://redis.io/docs/latest/develop/reference/protocol-spec/#bulk-strings>
- <https://redis.io/docs/latest/commands/echo/>
