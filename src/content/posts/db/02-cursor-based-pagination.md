---

title: "[Database] Cursor-based Pagination"
published: 2025-06-07
description: Cursor-based Pagination 과 Offset-based Pagination 을 비교하고, Cursor-based Pagination 을 구현해보자. 
tags: ["Database", "Pagination", "API"]
category: Database
draft: false
---  


## 서론 (Introduction)

개인 프로젝트에서 **타임라인 기능**을 구현하면서 **Cursor 기반 페이지네이션**을 구현하였다.

프로젝트의 특징은 다음과 같다.

- Twitter (현 X), Threads 와 비슷한 타임라인 기반의 SNS 서비스
- 타임라인을 조회하는 기능이 주 기능이며, 최근 게시물이 가장 맨 위에 위치함
- 무한 스크롤
  - 사용자가 자신이 어떤 페이지에 있는지 알 필요없다.

이러한 특징의 프로젝트에서 페이지네이션을 구현하기 위해 Offset 기반 페이지네이션과 Cursor 기반 페이지네이션에 대해 비교해보았고, 이 중 Cursor 기반 페이지네이션을 택하여 구현하였다.

## Offset-based Pagination vs. Cursor-based Pagination

### Offsets

 클라이언트는 서버에게 페이지 당 원하는 결과의 수(`size`)와 원하는 페이지 번호(`page`)를 전달하고, 서버는 해당 매개변수를 이용해 결과를 계산하여 반환한다. Spring Data JPA에서는 이 방식으로 페이징을 기본적으로 지원하며 `Pagable` 객체를 통해 구현할 수 있다.

`Post` 에 10,000 개의 데이터가 있다고 가정하자. 이 때, `page=100`, `size=20` 에 대해 페이지네이션 API를 실행하면 다음과 같은 SQL이 실행된다.

```sql
-- 현재 페이지에 보여줄 실제 데이터 가져오기
SELECT * FROM posts
WHERE user_id = %user_id
ORDER BY created_at DESC 
LIMIT 20 OFFSET 2000;

-- 페이지네이션 메타데이터 계산용 전체 개수 구하기
SELECT COUNT(id)FROM posts WHERE user_id = %user_id;
```

실제 데이터를 가져오는 쿼리 중 `LIMIT 20 OFFSET 2000` 에 주목해 보자.

해당 절은 앞의 2,000개의 레코드(offset)를 건너뛰고, 그다음 20개의 레코드를 반환함을 의미한다.

 **2,000개의 레코드를 건너뛰는 과정에서 데이터베이스는 인덱스를 통해 정렬된 순서대로 2,000개의 레코드를 스캔한 후 건너뛰어야 한다.** (실제로는 하나씩 세는 것이 아니라 인덱스를 따라 스캔하지만, 결과적으로 많은 데이터를 처리해야 함) 이 과정에서 데이터베이스는 **2,020개의 레코드를 읽었지만 실제로는 20개만 사용하게 된다.** 즉, 읽어온 데이터 중 약 **1%만 사용되고 99%는 낭비**되는 구조이다.

특히 데이터 셋이 커질 수록, 사용자가 뒤쪽 페이지로 이동할 수록 offset 값이 더 커지기 때문에 성능 오버헤드가 더욱 증가할 수 있다.

### Cursor

Cursor 방식의 핵심 아이디어는 위의 **offset 만큼 건너뛰는 방식을 생략하는 것**이다.

대신 조회 기준 식별자 (`cursor`)를 두고, 그 뒤의 limit 만큼의 데이터를 불러오는 방식을 사용한다.

`cursor`는 정렬 기준와 고유 식별자를 조합하여 **불러오고자 하는 데이터가 어디서 부터 시작하는지** 에 대한 정보를 담는다.

예를 들어, 조회 기준을 시간 순, id 순이라고 가정하고 이를 Base 64로 인코딩한 값을 cursor 로 사용한다고 가정하자. 즉 아래와 같은 cursor 를 사용한다고 가정한다.

```
원본 커서: MjAyNS0wNS0xNVQxMjowNTozMC40MDkwNTgjQ1VSU09SIzk5ODE=

Base64 디코딩 →
2025-05-15T12:05:30.409058#CURSOR#9981

파싱 결과:
├── created_at: 2025-05-15T12:05:30.409058
├── 구분자: #CURSOR#  
└── id: 9981
```

이를 커서로 사용하여 페이지네이션을 구현했을 때, 생성되는 쿼리는 다음과 같다.

```sql
SELECT * FROM posts
WHERE user_id = %user_id 
-- 커서에 있는 정보를 기준으로 함 
AND (
 ? IS NULL
 OR created_at < %created_at
 OR (
  craeted_at = %created_at
  AND id < %id
 )
)
ORDER BY created_at DESC
LIMIT 20
 
```

앞선 offset 방식과 다르게 앞의 레코드를 건너뛸 필요없이 `index` 를 이용해 한번에 위치를 찾을 수 있기 때문에 원하는 시작 지점을 찾는 시간 복잡도가 `O(n)` → `O(log n)` 으로 줄어들며, 불필요한 데이터 스캔을 생략할 수 있다.

하지만 cursor 방식을 사용한다면 이전 페이지네이션 방식과는 다르게 사용자가 현재 어떤 페이지에 있는지 알 수 없으며, 총 데이터셋의 정보를 알 수 없다는 단점이 있다.

또한 index 를 설계할 때, multi column 인덱스에 주목하여 복합 인덱스의 칼럼 순서에 주의해야 인덱스의 장점을 잘 이용할 수 있다.

### 성능 비교

실제로 애플리케이션 내부에서 `System.currentTimeMillis()`를 이용하여 성능을 측정한 결과는 아래와 같다.

<img width=300 src="https://github.com/user-attachments/assets/069a7e83-c2a3-4ccd-acfb-9083749ed888"/>

`10,000`개의 소규모 데이터만 활용하였으므로 offset 크기에 대한 속도 차이는 제대로 확인할 수 없었지만, cursor 를 사용한 경우, **정렬 기준이 되는 인덱스에 접근하기만 하면 되므로** 일정한 성능을 보여준 반면 offset 의 경우 **인덱스 페이지들을 처음 메모리로 로드하는 부분** 때문에 시간이 조금 더 오래걸림을 확인할 수 있다.  

만약 데이터셋이 더 많아져서 offset 이 커진다면, 이 처럼 디스크에 **페이지를 로드하는 부분이 발생할 수 있고, 이것이 직접적으로 성능에 영향을 미칠 것이라고 예측할 수 있다**

## 개인 프로젝트에서의 구현

현재 필자가 만들고 있는 프로젝트는 **Twitter, Threads 처럼 타임라인을 기반으로 한 SNS 서비스**이다. 따라서 **무한 스크롤을 통해 타임라인을 최신 순으로 정렬해서 조회**하는 것이 주요 기능이며, 페이지 개념에 대한 정보는 중요하지 않기 때문에 **Cursor 방식으로 페이지네이션을 구현하였다.**

커서에 대한 정보를 담기 위해 응답 DTO에 다음과 같은 메타데이터를 추가하였다.

```java
public class PaginationMetadata {
 private String nextCursor;
 private boolean hasNext;
}
```

그리고 Service 부분에서는 다음과 같은 방식으로 `hasNext` 와 `nextCursor` 를 게산하도록 구현하였다.

```java
public TimelineResponse getTimeline(String cursor, Integer limit, Member currentMember, Long targetMemberId) {
  Long memberId = currentMember == null ? null : currentMember.getId();

  // 커서 디코딩
  CursorUtil.Cursor decodedCursor = extractCursor(cursor);

  // 실제 조회할 개수 (다음 페이지 존재 여부 확인을 위해 +1)
  int fetchLimit = limit + 1;

  List<TimelineItemProjection> timelineItems = postRepository.findUserTimelineWithPagination(
   targetMemberId,
   memberId,
   decodedCursor != null ? decodedCursor.getTimestamp() : null,
   decodedCursor != null ? decodedCursor.getId() : null,
   fetchLimit
  );

  return buildTimelineResponse(timelineItems, limit);
 }
```

이 후 Repository 부분에서는 (querydsl 사용) 다음과 같은 코드를 통해 쿼리에 페이지네이션 조건을 추가하였다.

```java
private BooleanExpression applyPaginationCondition(
  DateTimePath<LocalDateTime> createdAt,
  NumberPath<Long> id,
  LocalDateTime beforeTimestamp,
  Long beforeId) {

  if (beforeTimestamp == null || beforeId == null) {
   return null;
  }

  return createdAt.lt(beforeTimestamp)
   .or(createdAt.eq(beforeTimestamp).and(id.lt(beforeId)));
 }
```

따라서 커서 기반 페이지네이션을 사용하는 API의 경우 아래와 같은 메타데이터가 함께 반환된다.

![Image](https://github.com/user-attachments/assets/9ac9f557-1143-4c11-a053-d3f887fea228)

## 참고 자료

- [Evolving API Pagination at Slack - Engineering at Slack](https://slack.engineering/evolving-api-pagination-at-slack)
- [Pagination with Relative Cursors - Shopify](https://shopify.engineering/pagination-relative-cursors)
- [1. 페이징 성능 개선하기 - No Offset 사용하기 - 티스토리, 향로 (기억보단 기록을)](https://jojoldu.tistory.com/528)
- [Cursor-based Pagination 구현하기 - Velog, minsangk.log](https://velog.io/@minsangk/%EC%BB%A4%EC%84%9C-%EA%B8%B0%EB%B0%98-%ED%8E%98%EC%9D%B4%EC%A7%80%EB%84%A4%EC%9D%B4%EC%85%98-Cursor-based-Pagination-%EA%B5%AC%ED%98%84%ED%95%98%EA%B8%B0)
