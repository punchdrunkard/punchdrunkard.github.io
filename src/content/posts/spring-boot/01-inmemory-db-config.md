---
title: "[Spring Boot] 개발/테스트 환경에서 인메모리 DB 설정하는 방법"
published: 2025-04-24
description: Spring Boot 프로젝트에서 H2 Database와 Embedded Redis를 활용해 로컬 및 테스트 환경을 빠르게 구성하는 방법을 소개합니다.
tags: ["Spring Boot", "Test", "H2", "Redis", "In-memory DB", "Configuration"]
category: Spring Boot
draft: false
---

## 개요

Spring Boot 애플리케이션을 개발할 때, 로컬 및 테스트 환경에서 인메모리 데이터베이스 (H2 Database, Embedded Redis) 를 사용하면 별도 컨테이너나 외부 프로세스를 띄우지 않고 쉽고 빠르게 테스트 환경을 구성할 수 있다.

이 글에서는 Spring Boot의 로컬 개발, 테스트 환경에서 H2 Database 와 Embedded Redis 를 설정하는 방법을 다룬다.

## H2 Database 설정하기

먼저 `build.gradle` 에 H2 데이터베이스 의존성을 추가한다.

```groovy
dependencies {
  runtimeOnly 'com.h2database:h2'
}
```

그리고 `application-local.yml` (또는 `application-test.yml`) 파일에 다음과 같이 설정한다.

```yml
spring:
  datasource:
    url: jdbc:h2:mem:test
    username: sa
    password:

  h2:
    console:
      enabled: true
      path: /h2-console
```

- `h2-console` 설정을 활성화하면 로컬 서버 실행 시 `http://localhost:8080/h2-console` 경로에서 웹 기반 콘솔을 사용할 수 있다.
- H2는 인메모리 기반이므로 애플리케이션이 꺼지면 데이터도 함께 사라집니다.

## Embedded Redis 설정하기

다음의 라이브러리를 사용한다.

::github{repo="codemonstur/embedded-redis"}

`build.gradle` 에 라이브러리를 추가한다.

```groovy
implementation 'com.github.codemonstur:embedded-redis:1.4.3'
```

`EmbeddedRedisConfiguration.java` 을 작성한다.

```java
@Configuration
@Profile({"local", "test"}) // 로컬 및 테스트 환경에서만 활성화
public class EmbeddedRedisConfiguration {

 @Value("${spring.data.redis.port}")
 private int redisPort;

 private RedisServer redisServer;

 @PostConstruct
 public void startRedis() throws IOException {
  try {
   redisServer = new RedisServer(redisPort);
   redisServer.start();
  } catch (Exception e) {
   if (isRedisRunning()) {
    return; // 이미 실행 중인 경우 무시 
   }
   throw e;
  }
 }

 @PreDestroy
 public void stopRedis() throws IOException {
  if (redisServer != null && redisServer.isActive()) {
   redisServer.stop();
  }
 }

 private boolean isRedisRunning() {
  try (Socket socket = new Socket()) {
   socket.connect(new InetSocketAddress("localhost", redisPort), 100);
   return true;
  } catch (IOException e) {
   return false;
  }
 }
}
```

이 설정은 다음과 같은 조건에서 작동한다:

- 현재 지정된 포트에 Redis가 이미 실행 중이면, Embedded Redis를 실행하지 않는다.
- 로컬 및 테스트 프로파일에 한해 활성화되므로 운영 환경에는 영향이 없다.

## 테스트 코드

인메모리 환경에서 H2 DB와 Redis 설정이 잘 적용되었는지 다음과 같은 테스트 코드로 확인할 수 있다.

### H2 Database 테스트

```java
@SpringBootTest
@ActiveProfiles("test") // H2 설정이 활성화되어 있는 프로파일
class H2Test {

    @Autowired
    private DataSource dataSource;

    @Test
    @DisplayName("H2 데이터베이스에 직접 쿼리를 날려 테이블을 생성하고 데이터를 저장할 수 있다")
    void shouldInsertAndSelectUsingRawJdbc() throws Exception {
        try (Connection conn = dataSource.getConnection()) {
            // 테이블 생성
            conn.createStatement().executeUpdate("CREATE TABLE test_user (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(255))");

            // 데이터 삽입
            conn.createStatement().executeUpdate("INSERT INTO test_user (username) VALUES ('h2test')");

            // 데이터 조회
            ResultSet rs = conn.createStatement().executeQuery("SELECT username FROM test_user WHERE id = 1");

            assertThat(rs.next()).isTrue();
            assertThat(rs.getString("username")).isEqualTo("h2test");
        }
    }
}
```

### Embedded Redis 테스트

```java
@SpringBootTest
@ActiveProfiles("test") // EmbeddedRedisConfiguration이 활성화된 프로파일
class RedisTemplateTest {

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Test
    @DisplayName("Embedded Redis에 값을 저장하고 조회할 수 있다")
    void shouldSetAndGetValueDirectlyUsingRedisTemplate() {
        // given
        String key = "redis:test";
        String value = "check";

        // when
        redisTemplate.opsForValue().set(key, value);
        String result = redisTemplate.opsForValue().get(key);

        // then
        assertThat(result).isEqualTo("check");
    }
}
```

## 참고 자료

- <https://seltol-lee.tistory.com/entry/%EC%9E%90%EB%B0%94-Embedded-Redis>
