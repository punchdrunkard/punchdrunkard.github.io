---
title: TransactionalEventListener + 배치 작업으로 회원 뱃지 발급 기능 구현하기 
published: 2025-06-29T15:59:00+09:00
description: '뱃지 발급 기능에서 에러 로그 없이 간헐적으로 발생하는 비동기 처리 버그의 원인을 데이터베이스의 Isolation Level 관점에서 추적하고, @TransactionalEventListener와 배치 처리를 통해 해결한다.'
image: 'https://github.com/user-attachments/assets/c0358226-a498-4a42-95f0-69ae53547dec'
tags: [Spring Boot, Transaction, Isolation Level, EventListener, Batch]
category: 'Project'
draft: false 
---

## 들어가며

이전의 DND에서 진행했던 `fiesta` 프로젝트에서 회원 뱃지 기능이 제대로 동작하지 않았다.

 리뷰 작성에 대한 활동 뱃지 발급 기능을 예시로 들어보자. 이 기능에서 리뷰 작성 기능은 정상적으로 동작하여 데이터가 DB에 저장되지만, 활동 뱃지 발급 조건(리뷰 5개 작성)을 만족했음에도 불고하고 사용자에게 뱃지가 발급되지 않는 현상이 간헐적으로 발생하였다.

특히나 에러 로그가 남지 않았기 때문에, 그동안 원인을 파악하기가 어려웠고, 이는 **단순히 에러가 발생한게 아니라 데이터의 상태가 일치하지 않는 문제로 인해 버그가 발생했음**이라는 것을 추측할 수 있었다.

기존 로직에서 어떤 문제가 있었는지 문제 상황을 재현해보고, 해결해보자.

## 기존의 로직의 문제점

### 기존 로직 분석

기존의 뱃지 발급 로직은 다음과 같다.

- `ReviewService` : `@Transactional` 로 관리되며, 리뷰 저장 후 `@Async`로 `BadgeService`를 호출한다.

    ```java
    // ReviewService.java
    
    @Transactional
    public ReviewIdResponse createReview(...) { 
        // ... (유효성 검사 및 다른 데이터 저장 로직 생략)
    
        // 1. 리뷰 데이터를 DB에 저장 (아직 커밋되지 않은 상태)
        Review review = reviewRepository.save(Review.createReview(userId, request));
    
        // 2. 뱃지 발급 서비스 비동기 호출
        badgeService.giveReviewBadge(userId);
    
        return ReviewIdResponse.builder()
            .reviewId(review.getId())
            .build();
    }
    ```

- `BadgeService` : `@Async`와 `@Transactional`로 동작하며, 뱃지 획득 조건을 만족하는지 DB를 조회하고, 만족한다면 뱃지를 수여한다.

    ```java
    // BadgeService.java
    
    @Async
    @Transactional
    public CompletableFuture<List<Long>> giveReviewBadge(Long userId) {
        // 내부적으로 giveBadge 메소드를 호출하여 로직 수행
        return completedFuture(giveBadge(userId, BadgeType.REVIEW));
    }
    
    // giveBadge 메소드는 일부만 발췌하여 핵심 로직을 보여줌
    private List<Long> giveBadge(Long userId, BadgeType badgeType) {
        // ... (사용자의 기존 뱃지 정보 조회 로직 등 생략)
    
        for (Long badgeId : badgeIds) {
            // 3. 뱃지 획득 조건 확인 (내부적으로 DB 조회 발생)
            if (isUserNotOwnedBadge(badgeId) && isBadgeCondition(userId, badgeId)) {
                // ... (뱃지 지급 로직)
            }
        }
        return givenBadgeIds;
    }
    
    // isBadgeCondition 메소드에서 가장 관련 있는 부분만 예시로 보여줌
    private boolean isBadgeCondition(long userId, long badgeId) {
        if (badgeId == PASSIONATE_REVIEWER_BADGE_ID) {
            // 이 부분에서 DB 조회가 발생!
            return reviewRepository.countByUserId(userId) >= PASSIONATE_REVIEWER_THRESHOLD;
        }
        // ...
        return false;
    }
    ```

### 원인 분석

해당 문제에 대한 유력한 원인은 생각할 수 있는 원인은 **트랜잭션과 `@Async`의 동작 시점 문제** (동시성 문제)이다.

왜냐하면 에러 로그가 따로 찍히지 않았기 때문에 뱃지 발급 로직에서 동작하는 두 스레드에서는 둘 다 정상으로 처리되었거고, 그렇다면 에러가 날 수 있는 부분은 각 조건이 제대로 체크되지 않은 부분이기 때문이다.

즉 기존의 구현 방식 (async 방식) 에 따르면 `ReviewService` (트랜잭션 A)는 `badgeService.giveReviewBadge()`를 호출하고, 호출했다는 사실만 인지한 채 **자신의 나머지 일을 계속하게 되고,** `BadgeService` (트랜잭션 B)는 호출을 받자마자 **별도의 스레드에서 즉시 실행**을 시작하려고 한다.

async 로 동작하기 때문에 저 두 작업은 완전히 별개의 흐름으로 처리되며, 트랜잭션 B가 트랜잭션 A 이후에 시작한다는 보장이 없다.

따라서 트랜잭션 B가 DB에서 리뷰 개수를 조회할 때, 트랜잭션 격리 수준에 의해 아직 커밋되지 않은 트랜잭션의 데이터를 읽지 못하여 현재 기능에서 버그가 발생한 것이다.

### 가설 검증

이를 증명하기 위해 `MySQL`에서 각 트랜잭션을 실행해 애플리케이션의 동작을 재현하였다. 사용한 MySQL(InnoDB)의 격리 수준은 기본 격리수준인 `REPEATABLE-READ`이다.

상황 재현을 위해 유저 `123`이 작성한 4개의 리뷰가 이미 존재하고, **5번째 리뷰를 작성하여 뱃지를 발급받을 상황을 생각해보자.**

- 트랜잭션 A (`ReviewService`) - 리뷰를 새로 작성

    ![image.png](https://github.com/user-attachments/assets/be33ee60-6586-4640-9ef0-7b67f83f7c4f)

  - 트랜잭션을 시작하고 5번째 리뷰를 `INSERT` 한다 .
  - 자신의 트랜잭션에서는 `COUNT(*)` 결과가 **5로 정상적으로 조회된다.**

- 트랜잭션 B (`BadgeService`) - 뱃지 수여 기준 확인

    ![image.png](https://github.com/user-attachments/assets/eb166219-e3b9-49b0-b285-bb4dcb714434)

  - 트랜잭션 A가 종료되지 않은 시점에서 새로운 터미널을 열어 트랜잭션 B를 시작한다.
  - 유저 `123`에 대한 리뷰 갯수를 조회한다. `REPEATABLE-READ` 격리 수준에 따라 아직 커밋되지 않은 데이터를 읽지 못하므로 `COUNT(*)` 결과가 **4로 조회된다.**

따라서 `BadgeService`가 잘못된(과거의) 데이터를 기반으로 조건을 판단하여 뱃지 발급에 실패한 것이다.

:::tip[MySQL에서 현재 트랜잭션 격리 수준 확인하기]

```sql
SELECT @@transaction_isolation 
 ```

명령어로 현재 트랜잭션 격리 수준을 확인할 수 있다. 본인의 경우, 기본 격리 수준을 그대로 사용하므로 `REPEATABLE-READ` 이다.

![image.png](https://github.com/user-attachments/assets/10af5e66-67c8-491b-83c7-12671ff248a2)
:::

## 해결 방법

이를 해결하기 위해서는 **커밋 이후에 실행됨을 보장해주는 장치** 가 필요하다. 몇 가지 해결 방안은 아래와 같다.

- **`@TransactionalEventListener`**: Spring의 내장 이벤트 리스너를 사용하여 트랜잭션 커밋 이후에 비동기 로직을 실행하는 방법.
- **트랜잭션 아웃박스 패턴**: 발행할 이벤트를 DB 내 `outbox` 테이블에 원자적으로 함께 저장한 뒤, 별도의 프로세스가 이를 읽어 발행하는 매우 신뢰성 높은 패턴.
- **데이터베이스 트리거**: DB 레벨에서 데이터 변경을 감지해 로직을 실행하는 방법. (현대 애플리케이션에서는 비즈니스 로직이 DB에 종속되어 거의 사용하지 않음)

최종적으로 **`@TransactionalEventListener` 와 데이터 보정을 위한 배치 작업을 조합하는 방식**을 선택하였다. 그 이유는 다음과 같다.

1. 뱃지/업적 기능은 서비스의 핵심 기능이 아니며, 약간의 지연이 사용자 경험이 치명적이지 않다. 특히나 많은 다른 서비스에서 "바로 반영되지 않을 수 있습니다"라는 문구를 사용한다.
2. 현재 1인 프로젝트에 가까운 상황에서, 아웃박스 패턴이나 메시지 큐 같은 새로운 인프라를 도입하는 것은 개발 및 운영 리소스 측면에서 부담이 크다. `@TransactionalEventListener` 와 데이터 보정을 위한 배치 작업을 조합하는 방식을 사용하면 Spring 의 내장 기능만으로 구현할 수 있**다.**
3. 아웃박스 패턴은 모든 이벤트에 대해 추가적인 DB `INSERT`와 주기적인 `SELECT`(폴링) 부하를 발생시킨다. 1. 처럼 서비스의 핵심 기능이 아닌 기능이 성능 부하를 발생시키는건 적절하지 않다.

### 구현

**Step 1: 이벤트 기반 로직으로 리팩토링**

먼저 `ReviewService`가 `BadgeService`에 대한 직접 의존성을 갖지 않도록 이벤트 기반으로 변경한다.

- 뱃지 발급에 필요한 최소한의 데이터(`userId`)를 담는 이벤트 객체를 정의한다.

```java
public class ReviewCreatedEvent {
    private final Long userId

    public ReviewCreatedEvent(Long userId) {
        this.userId = userId;
    }

    public Long getUserId() {
        return userId;
    }
}
```

- 기존에 `BadgeService` 를 직접 호출하던 코드를 제거하고 `ApplicationEventPublisher`를 통해 이벤트를 발행하도록 변경한다.

```java
import org.springframework.context.ApplicationEventPublisher; // import 추가

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    // ... 다른 Repository들 ...
    private final ApplicationEventPublisher eventPublisher; 

    @Transactional
    public ReviewResponse createReview(final Long userId, final ReviewCreateRequest request,
        final List<MultipartFile> images) {
        // ... (기존 유효성 검사 및 데이터 저장 로직)
        
        Review review = reviewRepository.save(Review.createReview(userId, request));
  
        // badgeService 직접 호출 대신 이벤트 발행
        // => 이 트랜잭션이 성공적으로 커밋되면 처리될 이벤트
        eventPublisher.publishEvent(new ReviewCreatedEvent(userId));

        // ... 
    }
}
```

발행된 이벤트를 받아 처리할 리스너를 구현한다.`@TransactionalEventListener`를 사용하여 트랜잭션이 성공적으로 커밋된 후에만, `@Async`로 비동기 실행되도록 설정한다.

주의할 점은 **기존에 뱃지를 발급하던 로직이 비동기로 처리되게 되어있다면, 해당 부분을 제거해야 한다.**

```java
// BadgeEventHandler.java
@Component
public class BadgeEventHandler {
    private final BadgeService badgeService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void handleReviewCreatedEvent(ReviewCreatedEvent event) {
        badgeService.giveReviewBadge(event.getUserId());
    }
}
```

**2. 데이터 보정을 위한 배치 작업 구현**

메인 애플리케이션 클래스에 스케줄링 기능을 활성화 한다. (`@EnableScheduling`)

```java
@EnableScheduling // 스케줄링 기능 활성화
public class FiestaApplication {
    // ...
}
```

주기적으로 실행될 로직을 담을 배치 서비스 클래스를 생성한다.

```java
@Service
public class BadgeCorrectionBatchService {
    // ... 의존성 주입 ...

    @Scheduled(cron = "0 0 4 * * *")
    public void runBadgeCorrection() {
        // ... 페이징 처리를 위한 do-while 루프 ...
        do {
            Page<User> userPage = userRepository.findAll(pageable);
            processUserChunk(userPage.getContent()); // 청크 단위로 트랜잭션 처리
            pageable = userPage.nextPageable();
        } while (userPage.hasNext());
    }

    @Transactional
    public void processUserChunk(List<User> users) {
        for (User user : users) {
            badgeService.giveReviewBadge(user.getId());
        }
    }
}
```

한 번에 모든 유저를 불러오면 오버헤드의 위험이 크므로 청크 단위로 트랜잭션을 끊어서 구현한다.

## 결론

기존 로직에서 발생했었던 문제를 시스템의 동작 구조를 수정함으로서 해결하였다. 특히나 그 과정에서 스템의 결합도를 낮추고 확장성을 확보할 수 있었다.  이를 다이어그램으로 나타내면 다음과 같다.

- 개선 전

    ![image.png](https://github.com/user-attachments/assets/0eb7d475-9bf7-4f14-939d-3853f32e04d7)

- 개선 후

    ![image.png](https://github.com/user-attachments/assets/c0358226-a498-4a42-95f0-69ae53547dec)

또한 이번 이슈를 통해 트랜잭션의 생명주기와 격리 수준이 비동기 처리와 만났을 때, 우리의 코드 로직과 다르게 동작할 수 있다는 점을 확인하였고, **비동기 작업의 수행은 예측 불가능하는 일이 많기 때문에, 데이터 정합성을 깨뜨리지 않기 위한 패턴들을 조사하며, 작업에 대한 안전 장치를 마련해야 한다는 것울 수 있었다.**
