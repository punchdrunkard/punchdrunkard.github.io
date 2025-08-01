---
title: Fan-out 방식으로 타임라인 개선하기 - 1. 문제 인식 (부하 테스트)
published: 2025-08-01T17:07:00+09:00
description: '홈 타임라인 조회 API 에서 발생하는 병목 현상을 k6, 애플리케이션 로그, MySQL Slow query 로그를 이용하여 분석한다.'
tags: [Timeline, Stress Test, k6, MySQL, Slow Query, Spring Boot]
category: 'Project'
draft: false 
---

## 들어가며

타임라인 기반 SNS 서비스 프로젝트를 하며, 이전에는 [**홈 타임라인 조회 API**](https://twooter.xyz/docs/index.html#timeline)에 조회가 실행될 때 마다 쿼리문을 이용하여 조회하였다. 하지만 피드를 조회하려고 할 때 마다 각 DB를 join하고 이를 동적으로 정렬하는 것은 커서 기반 페이지네이션을 활용하더라도 너무나도 비효율적이였다.

이 글에서는 우선 **부하 테스트와 애플리케이션 로그, MySQL의 Slow Query 로그를 이용하여 결과를 해석하고 문제를 인식**하는 내용에 대해 다룬다.

## 사전 준비

병목 현상을 아래 세 가지 측면을 통해 분석해 볼 예정이다.

1. k6 부하 테스트의 결과
2. 애플리케이션 로그
3. MySQL의 Slow Query 로그

이 중, MySQL의 Slow Query 로그를 확인하려면 이 기능을 활성화 시키는 단계가 필요하다.

먼저 Slow Query 설정이 활성화 되어있는지 확인하기 위한 명령은 다음과 같다.

```sql
-- 현재 Slow Query Log 기능이 켜져 있는지 확인 (ON/OFF)
SHOW VARIABLES LIKE 'slow_query_log';

-- 몇 초 이상 걸리는 쿼리를 기록할지 임계값을 확인 (단위: 초)
SHOW VARIABLES LIKE 'long_query_time';

-- 로그가 어느 파일 경로에 저장되는지 확인
SHOW VARIABLES LIKE 'slow_query_log_file';
```

Slow Query Log 기능을 활성화 하기 위해서 아래와 같은 sql 문을 사용한다.

```sql
-- Slow Query Log 기능을 활성화 한다
SET GLOBAL slow_query_log = 'ON';

-- 1초 이상 실행되는 모든 쿼리를 기록하도록 설정한다 
SET GLOBAL long_query_time = 1; 

-- 인덱스를 사용하지 않는 쿼리도 모두 기록하기 위한 옵션
SET GLOBAL log_queries_not_using_indexes = 'ON';
```

## 문제 인식

부하 테스트 툴로는 `k6` 를 이용하였으며, 다음과 같은 상황을 가정하였다.

부하 테스트 환경은 **로컬**에서 진행했는데 이유는 (클라우드 요금에 대한 부담도 있었지만) 비효율적인 쿼리, 알고리즘의 문제, 코드 레벨의 비효율성과 같은 **애플리케이션 자체의 병목은 서버가 어디에 있든 동일하게 발생**한다고 판단했기 때문이다.

:::note[상황 가정]

- **데이터 분포** : SNS 서비스의 경우 소수의 ‘인플루언서’와 다수의 ‘일반 사용자’가 존재하는 분포를 따른다. 따라서 다음과 같은 상황을 가정하여 데이터를 생성하였다.
  - 총 사용자 : 10,000 명
  - 인플루언서 : 5명 (각각 수 천명의 팔로워를 가진다.)
  - 팔로우 관계
    - 인플루언서 1 : 8,000명의 팔로워
    - 인플루언서 2 : 5,000명의 팔로워
    - …
    - 일반 사용자 : 50 ~ 200명의 랜덤한 팔로우 관계
  - 게시물 : 총 1,000,000개 (사용자 당 평균 100개)
    - 소셜 미디어의 데이터는 최근 활동에 집중되는 경형이 있으므로, 생성 기간을 나누어 밀도를 조절하였다.
      - 전체 게시물 100만 개 중 60% (60만 개) : 최근 3개월 사이에 집중적으로 생성
      - 나머지 40% (40만 개) : 그 이전 21개월에 걸쳐 생성
- **부하 테스트 시나리오**
  - 실제 사용자는 **타임라인을 아래로 스크롤 하며 여러 페이지를 연속적으로 조회**한다.
  - 따라서 로그인 후, 첫 페이지를 조회하고 응답으로 받는 `nextCursor` 를 이용하여 여러 페이지를 연속하여 스크롤하는 상황을 가정하여 부하테스트 시나리오를 작성하였다.
  - 최대 200명의 사용자까지 동시 접속함을 가정한다.

:::

따라서 아래와 같은 `k6` 스크립트를 작성하였다.

```jsx
// timeline-test.js 

import http from 'k6/http';
import {check, group, sleep} from 'k6';

// ### 테스트 옵션 ###
export const options = {
    scenarios: {
        // 시나리오 이름
        scrolling_user: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                {duration: '30s', target: 50},  // 30초 동안 VUs를 50까지 늘림 (워밍업)
                {duration: '1m', target: 50},   // 50 VUs 상태로 1분간 유지
                {duration: '30s', target: 200}, // 30초 동안 VUs를 200까지 늘림 (스트레스 구간)
                {duration: '2m', target: 200},  // 200 VUs 상태로 2분간 유지 (최대 부하)
                {duration: '30s', target: 0},    // 30초 동안 VUs를 0으로 줄임 (마무리)
            ],
            gracefulRampDown: '30s',
        },
    },
    // ### 성능 목표치 (Thresholds) ###
    thresholds: {
        http_req_failed: ['rate<0.01'], // 요청 실패율이 1% 미만이어야 함
        'http_req_duration{api:timeline_page_1}': ['p(95)<1500'], // 첫 페이지 로드의 95% 응답 시간이 1.5초 미만
        'http_req_duration{api:timeline_scroll}': ['p(95)<1000'], // 스크롤 시의 95% 응답 시간이 1초 미만
    },
};

// ### 테스트 준비 단계 (Setup) ###
// 테스트 시작 전, 단 한 번 실행되어 테스트에 필요한 데이터를 준비합니다.
export function setup() {
    // 데이터 시딩 시 생성한 테스트 사용자로 로그인하여 JWT 토큰을 받아온다.
    const loginRes = http.post('http://localhost:8080/api/auth/signin',
        JSON.stringify({handle: 'testuser', password: 'password123'}),
        {headers: {'Content-Type': 'application/json'}}
    );

    // 로그인이 성공했는지 확인
    check(loginRes, {'SETUP: Login successful': (res) => res.status === 200});

    const authToken = loginRes.json('accessToken');
    return {token: authToken}; // 획득한 토큰을 메인 테스트 함수로 전달한다.
}

// ### 메인 테스트 로직 (Default Function) ###
// 각 가상 사용자가 이 로직을 반복적으로 실행한다.
export default function (data) {
    const params = {
        headers: {'Authorization': `Bearer ${data.token}`},
    };

    let cursor = null;
    const maxPages = 5; // 최대 5페이지까지 스크롤을 시뮬레이션합니다.

    for (let page = 1; page <= maxPages; page++) {
        group(`Page ${page}`, function () {
            let url = `http://localhost:8080/api/timeline/home?limit=20`;
            if (cursor) {
                url += `&cursor=${encodeURIComponent(cursor)}`;
            }

            const res = http.get(url, {
                ...params,
                tags: {api: page === 1 ? 'timeline_page_1' : 'timeline_scroll'},
            });

            check(res, {
                'status is 200': (r) => r.status === 200,
            });

            // 응답 본문에서 nextCursor 값을 파싱하여 다음 요청에 사용
            const responseBody = res.json();
            if (responseBody.metadata && responseBody.metadata.hasNext) {
                cursor = responseBody.metadata.nextCursor;
            } else {
                // 다음 페이지가 없으면 스크롤을 중단
                return;
            }
        });

        // 실제 사용자가 페이지를 읽고 스크롤하는 시간을 시뮬레이션
        sleep(Math.random() * 2 + 1); // 1~3초 대기
    }
}

```

## 결과 분석

### k6 결과 분석

결과 로그는 아래와 같다.

![k6 result log](https://github.com/user-attachments/assets/4c39b111-af67-4336-a07b-0fd43cb88fe5)

이를 그래프로 나타내면 아래와 같다.

![k6 result graph](https://github.com/user-attachments/assets/54b6f90d-d9dd-49b2-acbf-67cddc261e07)

- `http_req_failed : rate=93.85%`
  - 100번의 요청 중, 약 94번이 실패했다는 의미이다.
- `http_req_duration: p(95)=1m 0s`
  - 서버가 너무 느려서 응답을 제때 보내지 못하자, 테스트 도구(k6)가 더 이상 기다리지 않고 요청을 '시간 초과(timeout)'로 처리한 것이다. (이는 애플리케이션 로그에서도 클라이언트가 연결을 끊었음 (Broken pipe)로 확인할 수 있다.)
  - 첫 페이지 로딩과 스크롤 모두 타임 아웃이 발생하였다.
- `http_reqs 2.32 req/s`
  - 시스템은 초당 **약 2.3개의 요청밖에 처리**하지 못해, 부하가 몰리자 즉시 마비되었다.

### 애플리케이션 로그

애플리케이션 로그에서는 두 가지 주요 에러 로그를 발견할 수 있었다. 첫 번째는 `Connection is not available`, 두 번째는 `Broken Pipe` 이다.

> 1. `HikariPool-1 - Connection is not available`

```sql
Caused by: java.sql.SQLTransientConnectionException: HikariPool-1 - Connection is not available, request timed out after 30005ms (total=10, active=10, idle=0, waiting=0)
```

DB 커넥션 풀이 고갈되었음을 의미한다. 즉, `TimelineController`가 `@Transactional`이 붙은 `TimelineService.getHomeTimeline`을 호출하기 위해 트랜잭션을 시작하려 했지만(`JpaTransactionManager.doBegin`), DB 커넥션을 30초 동안 기다려도 얻지 못해 `CannotCreateTransactionException` 예외가 발생하였다.

여기서 `active = 10` 을 보면, 현재 존재하는 10개의 DB 커넥션이 모두 사용 중이라는 사실을 의미한다.

> 2. `AsyncRequestNotUsableException : ... Broken pipe`

```sql
Caused by: org.apache.catalina.connector.ClientAbortException: java.io.IOException: Broken pipe
```

`Broken pipe`는 서버가 클라이언트에게 응답을 보내려고 했지만, **클라이언트(k6)가 이미 연결을 끊어버려서** 데이터를 전송할 수 없을 때 발생하는 오류이다. 즉 **타임 아웃을 의미한다.**

이는 k6의 VU가 자체적으로 설정된 **요청 타임아웃 (기본 60초)가 지나자 이 요청이 실패하걸로 간주하고 서버와의 연결을 스스로 끊어버려서 발생한 것이다.**

이 후에 뒤늦게 커넥션을 할당받거나 다른 작업이 끝난 서버 스레드가, 이제라도 응답(아마도 오류 응답)을 보내려고 보니 **클라이언트가 이미 사라지고 없게 되어 Broken pipe' 오류가 발생**하였다.

정리하면, **느린 쿼리가 DB 커넥션을 독점하자, 뒤이은 요청들이 커넥션을 할당받지 못해 연쇄적으로 실패하고, 이로 인해 k6와의 연결까지 끊어지는 상황이 발생했음을 의미한다.**

### Slow Query 로그 분석

`mysqldumpslow` 명령어를 활용하면 MySQL의 slow query log 파일의 요약 정보와 통계를 확인할 수 있다.

다음 명령어를 통해 **실행 시간이 가장 오래 걸린 쿼리**와 **가장 자주 실행된 느린 쿼리** 를 확인하였다.

```sql
# 실행 시간이 가장 오래 걸린 쿼리 10개
mysqldumpslow -s t -t 10 {slow-log-파일-경로}

# 가장 자주 실행된 느린 쿼리 10개
mysqldumpslow -s c -t 10 {slow-log-파일-경로}
```

해당 명령어의 결과는 다음과 같다.

- 실행 시간이 가장 오래 걸린 쿼리 10개 (`mysqldumpslow -s t -t 10`)

```sql
Reading mysql slow query log from {slow-log-파일-경로}
Count: 1  Time=2.62s (2s)  Lock=0.00s (0s)  Rows=0.0 (0), testuser[testuser]@[172.19.0.1]
  insert into follow (created_at,followee_id,follower_id) values ('S',N,N)

Count: 2  Time=2.46s (4s)  Lock=0.00s (0s)  Rows=0.0 (0), testuser[testuser]@[172.19.0.1]
  COMMIT

Count: 18  Time=31.71s (570s)  Lock=0.00s (0s)  Rows=22.0 (396), testuser[testuser]@[172.19.0.1]
  select case when (p1_0.repost_of_id is not null) then cast('S' as char) else cast('S' as char) end,p1_0.created_at,coalesce(p1_0.repost_of_id,p1_0.id),coalesce(p2_0.content,p1_0.content),coalesce(m2_0.id,m1_0.id),coalesce(m2_0.handle,m1_0.handle),coalesce(m2_0.nickname,m1_0.nickname),coalesce(m2_0.avatar_path,m1_0.avatar_path),coalesce(p2_0.like_count,p1_0.like_count),coalesce(p2_0.repost_count,p1_0.repost_count),pl1_0.id is not null,p3_0.id is not null,coalesce(p2_0.is_deleted,p1_0.is_deleted),coalesce(p2_0.created_at,p1_0.created_at),case when (p1_0.repost_of_id is not null) then m1_0.id else null end,case when (p1_0.repost_of_id is not null) then m1_0.handle else null end,case when (p1_0.repost_of_id is not null) then m1_0.nickname else null end,case when (p1_0.repost_of_id is not null) then m1_0.avatar_path else null end from post p1_0 join member m1_0 on p1_0.author_id=m1_0.id left join post p2_0 on p1_0.repost_of_id=p2_0.id left join member m2_0 on p2_0.author_id=m2_0.id left join post_like pl1_0 on pl1_0.post_id=coalesce(p1_0.repost_of_id,p1_0.id) and pl1_0.member_id=N left join post p3_0 on p3_0.repost_of_id=coalesce(p1_0.repost_of_id,p1_0.id) and p3_0.author_id=N and p3_0.is_deleted=N left join follow f1_0 on f1_0.follower_id=N and f1_0.followee_id=p1_0.author_id where (p1_0.author_id=N or f1_0.follower_id is not null) and (p1_0.is_deleted=N and (p2_0.is_deleted=N or p2_0.id is null)) and (p1_0.created_at<'S' or p1_0.created_at='S' and p1_0.id<N) order by p1_0.created_at desc,p1_0.id desc limit N

Count: 114  Time=22.02s (2510s)  Lock=0.00s (0s)  Rows=22.0 (2508), testuser[testuser]@[172.19.0.1]
  select case when (p1_0.repost_of_id is not null) then cast('S' as char) else cast('S' as char) end,p1_0.created_at,coalesce(p1_0.repost_of_id,p1_0.id),coalesce(p2_0.content,p1_0.content),coalesce(m2_0.id,m1_0.id),coalesce(m2_0.handle,m1_0.handle),coalesce(m2_0.nickname,m1_0.nickname),coalesce(m2_0.avatar_path,m1_0.avatar_path),coalesce(p2_0.like_count,p1_0.like_count),coalesce(p2_0.repost_count,p1_0.repost_count),pl1_0.id is not null,p3_0.id is not null,coalesce(p2_0.is_deleted,p1_0.is_deleted),coalesce(p2_0.created_at,p1_0.created_at),case when (p1_0.repost_of_id is not null) then m1_0.id else null end,case when (p1_0.repost_of_id is not null) then m1_0.handle else null end,case when (p1_0.repost_of_id is not null) then m1_0.nickname else null end,case when (p1_0.repost_of_id is not null) then m1_0.avatar_path else null end from post p1_0 join member m1_0 on p1_0.author_id=m1_0.id left join post p2_0 on p1_0.repost_of_id=p2_0.id left join member m2_0 on p2_0.author_id=m2_0.id left join post_like pl1_0 on pl1_0.post_id=coalesce(p1_0.repost_of_id,p1_0.id) and pl1_0.member_id=N left join post p3_0 on p3_0.repost_of_id=coalesce(p1_0.repost_of_id,p1_0.id) and p3_0.author_id=N and p3_0.is_deleted=N left join follow f1_0 on f1_0.follower_id=N and f1_0.followee_id=p1_0.author_id where (p1_0.author_id=N or f1_0.follower_id is not null) and (p1_0.is_deleted=N and (p2_0.is_deleted=N or p2_0.id is null)) order by p1_0.created_at desc,p1_0.id desc limit N

Count: 2  Time=13.47s (26s)  Lock=0.00s (0s)  Rows=0.0 (0), testuser[testuser]@[172.19.0.1]
  ROLLBACK

Died at /opt/homebrew/bin/mysqldumpslow line 163, <> chunk 137.

```

- 가장 자주 실행된 느린 쿼리 10개 (`mysqldumpslow -s c -t 10`)

```sql
Reading mysql slow query log from {slow-log-파일-경로}
Count: 114  Time=22.02s (2510s)  Lock=0.00s (0s)  Rows=22.0 (2508), testuser[testuser]@[172.19.0.1]
  select case when (p1_0.repost_of_id is not null) then cast('S' as char) else cast('S' as char) end,p1_0.created_at,coalesce(p1_0.repost_of_id,p1_0.id),coalesce(p2_0.content,p1_0.content),coalesce(m2_0.id,m1_0.id),coalesce(m2_0.handle,m1_0.handle),coalesce(m2_0.nickname,m1_0.nickname),coalesce(m2_0.avatar_path,m1_0.avatar_path),coalesce(p2_0.like_count,p1_0.like_count),coalesce(p2_0.repost_count,p1_0.repost_count),pl1_0.id is not null,p3_0.id is not null,coalesce(p2_0.is_deleted,p1_0.is_deleted),coalesce(p2_0.created_at,p1_0.created_at),case when (p1_0.repost_of_id is not null) then m1_0.id else null end,case when (p1_0.repost_of_id is not null) then m1_0.handle else null end,case when (p1_0.repost_of_id is not null) then m1_0.nickname else null end,case when (p1_0.repost_of_id is not null) then m1_0.avatar_path else null end from post p1_0 join member m1_0 on p1_0.author_id=m1_0.id left join post p2_0 on p1_0.repost_of_id=p2_0.id left join member m2_0 on p2_0.author_id=m2_0.id left join post_like pl1_0 on pl1_0.post_id=coalesce(p1_0.repost_of_id,p1_0.id) and pl1_0.member_id=N left join post p3_0 on p3_0.repost_of_id=coalesce(p1_0.repost_of_id,p1_0.id) and p3_0.author_id=N and p3_0.is_deleted=N left join follow f1_0 on f1_0.follower_id=N and f1_0.followee_id=p1_0.author_id where (p1_0.author_id=N or f1_0.follower_id is not null) and (p1_0.is_deleted=N and (p2_0.is_deleted=N or p2_0.id is null)) order by p1_0.created_at desc,p1_0.id desc limit N

Count: 18  Time=31.71s (570s)  Lock=0.00s (0s)  Rows=22.0 (396), testuser[testuser]@[172.19.0.1]
  select case when (p1_0.repost_of_id is not null) then cast('S' as char) else cast('S' as char) end,p1_0.created_at,coalesce(p1_0.repost_of_id,p1_0.id),coalesce(p2_0.content,p1_0.content),coalesce(m2_0.id,m1_0.id),coalesce(m2_0.handle,m1_0.handle),coalesce(m2_0.nickname,m1_0.nickname),coalesce(m2_0.avatar_path,m1_0.avatar_path),coalesce(p2_0.like_count,p1_0.like_count),coalesce(p2_0.repost_count,p1_0.repost_count),pl1_0.id is not null,p3_0.id is not null,coalesce(p2_0.is_deleted,p1_0.is_deleted),coalesce(p2_0.created_at,p1_0.created_at),case when (p1_0.repost_of_id is not null) then m1_0.id else null end,case when (p1_0.repost_of_id is not null) then m1_0.handle else null end,case when (p1_0.repost_of_id is not null) then m1_0.nickname else null end,case when (p1_0.repost_of_id is not null) then m1_0.avatar_path else null end from post p1_0 join member m1_0 on p1_0.author_id=m1_0.id left join post p2_0 on p1_0.repost_of_id=p2_0.id left join member m2_0 on p2_0.author_id=m2_0.id left join post_like pl1_0 on pl1_0.post_id=coalesce(p1_0.repost_of_id,p1_0.id) and pl1_0.member_id=N left join post p3_0 on p3_0.repost_of_id=coalesce(p1_0.repost_of_id,p1_0.id) and p3_0.author_id=N and p3_0.is_deleted=N left join follow f1_0 on f1_0.follower_id=N and f1_0.followee_id=p1_0.author_id where (p1_0.author_id=N or f1_0.follower_id is not null) and (p1_0.is_deleted=N and (p2_0.is_deleted=N or p2_0.id is null)) and (p1_0.created_at<'S' or p1_0.created_at='S' and p1_0.id<N) order by p1_0.created_at desc,p1_0.id desc limit N

Count: 2  Time=13.47s (26s)  Lock=0.00s (0s)  Rows=0.0 (0), testuser[testuser]@[172.19.0.1]
  ROLLBACK

Count: 2  Time=2.46s (4s)  Lock=0.00s (0s)  Rows=0.0 (0), testuser[testuser]@[172.19.0.1]
  COMMIT

Count: 1  Time=2.62s (2s)  Lock=0.00s (0s)  Rows=0.0 (0), testuser[testuser]@[172.19.0.1]
  insert into follow (created_at,followee_id,follower_id) values ('S',N,N)

Died at /opt/homebrew/bin/mysqldumpslow line 163, <> chunk 137.

```

예상처럼 홈 타임라인을 조회하는 쿼리가 가장 느린 쿼리로 기록되었다.

특히  이 쿼리 하나가 **총 2510초 + 570초 = 3080초 (약 51분)** 의 DB 시간을 점유했으며, 부하 테스트 중 DB는 거의 저 쿼리만 처리하고 있었다고 볼 수 있다.

특히 `WHERE` 절의 **`OR` 조건**(`p1_0.author_id=N or f1_0.follower_id is not null`)은 DB 옵티마이저가 인덱스를 효율적으로 사용하는 것을 매우 어렵게 만든다.

## 개선 방향

RDB에서의 쿼리 속도가 가장 큰 문제이다. 하지만 데이터베이스를 바꿀 수는 없기 때문에 **해당 쿼리가 최대한 적게 실행되도록** 캐시를 이용하여 개선하는 게 좋을 것 같다.

현재 구조는 사용자가 타임라인을 **읽을 때마다** 비싼 연산을 수행하는 '읽기 시 집계(Pull)' 방식이다. 이로 인해 발생하는 느린 쿼리와 `OR` 조건의 비효율을 피하기 위해, 게시물이 **작성될 때** 미리 각 사용자의 타임라인을 만들어주는 Fan-out 을 이용하여 개선하기로 결정하였다.

다음 글에서는 Redis 를 캐시 및 메시지 큐로 활용하여 **‘팬아웃 (Fan-out)’ 아키텍처를 설계**하는 내용에 대해 다루어보도록 하겠다.
