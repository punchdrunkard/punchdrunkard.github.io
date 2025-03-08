---
title: Spring Boot에서의 파일 업로드 비교 - MultipartFile vs InputStream
published: 2025-03-08
description: Spring Boot에서 대용량 파일 업로드 시 발생하는 병목 현상을 분석하고, MultipartFile 방식과 InputStream 직접 사용 방식의 성능 차이를 비교합니다.
tags: ["Spring Boot", "File Upload", "Performance", "Java", "Backend"]
category: Backend
draft: false
---

## 서론

  본래 졸업과제로 진행했던 프로젝트에서는 **영상 또는 이미지 파일을 서버로 업로드하면, 인공지능 모델을 작동하는 방식**을 사용한다. 이 때, 웹 서버로 Spring Boot 를 사용하였는데 **큰 용량을 가진 영상이나 이미지를 업로드가 실패하거나, 해당 부분에서 병목이 발견되었다.**

 이 글에서는 이 처럼 **Spring Boot에서 대용량 파일을 업로드하려고 할 때, `MultipartFile` 의 문제점과 이를 해결할 수 있는 방법을 제시한다.**

> 참고 : 해당 게시글에서는 Spring Boot 에서 로컬 파일 업로드 방식을 사용한다.

## Spring Boot의 파일 업로드 방식

### MultipartFile 방식

Spring Boot에서 대표적으로 파일을 업로드 할 때, `multipart/form-data` 인코딩 타입을 사용하는 `MultipartFile` 업로드 방식을 사용한다.

#### HTTP의 `multipart/form-data`

`multipart/form-data` 는 HTML form 에서 **각 파트로 나누어진** 복합 데이터를 전송하기 위해 설계된 HTTP content type이다. 해당 형식에서는 다양한 타입의 데이터를 HTTP 요청으로 전송할 수 있게 해준다.

```http
POST /upload HTTP/1.1
Host: example.com
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryABC123
Content-Length: 12345

------WebKitFormBoundaryABC123
Content-Disposition: form-data; name="field1"

value1
------WebKitFormBoundaryABC123
Content-Disposition: form-data; name="field2"

value2
------WebKitFormBoundaryABC123
Content-Disposition: form-data; name="file"; filename="example.jpg"
Content-Type: image/jpeg

(바이너리 데이터)
------WebKitFormBoundaryABC123--
```

일반적인 요청 구조는 위와 같은데, 각 파트는 `bouddary` 문자열로 구분되며 각 파트마다 자체 헤더와 내용을 포함한다.

#### Spring Boot 에서의 `multipart/form-data` 처리 과정

![](https://i.imgur.com/AClHdIN.png)

 해당 HTTP 요청이 서버로 전달되었을 때의 처리과정은 다음과 같다.

**서블릿 컨테이너 수준 처리**

1. 서블릿 컨테이너가 요청의 `Content-Type` 을 확인하여 `multipart` 요청으로 인식한다.
2. `javax.servlet.http.Part` API를 통해 **파일을 임시 저장한다.**

- 파일 데이터는 `application.yml` 에서의 설정을 통해 메모리 임계값(`file-size-threshold`)보다 크면 임시 디렉토리에 저장된다.
- 이 임시 파일은 서블릿 컨테이너에 의해 관리되며, 요청 처리 후 자동으로 정리된다.

3. 서블릿 컨테이너는 `multipart` 요청을 파싱하여 각 파트를 분리한다.

- 각 파트는 `Part` 객체로 접근할 수 있다.

**Spring 프레임워크 수준 처리**

1. 파싱된 요청이 Spring 의 `DispatcherServlet` 에 도달한다.
2. `DispatcherServlet` 은 등록된 `MultipartResolver` 를 사용하여 `multipart` 요청을 처리한다.
3. `MultipartResolver` 는 일반 `HttpServletRequest` 를 `MultipartHttpServletRequest` 로 변환하고, 이 과정에서 서블릿 컨테이너가 생성한 `Part` 객체들이 Spring 의 `MultipartFile` 객체로 변환된다.
4. 컨트롤러는 `@RequestPart` 를 통해 각 파트에 접근할 수 있다.

`application.properties` 을 통해 `MultipartResolver` 의 기본 설정을 구성할 수 있다.

```properties
# application.properties의 기본 설정
spring.servlet.multipart.enabled=true
spring.servlet.multipart.max-file-size=1MB
spring.servlet.multipart.max-request-size=10MB
spring.servlet.multipart.file-size-threshold=0
spring.servlet.multipart.location=${java.io.tmpdir}
```

## `MultipartFile` 을 사용한 파일 업로드 처리에서 발생할 수 있는 문제점

그러나 `MultipartFile` 을 사용한 파일 업로드 처리에서 **임시 파일 생성 및 복사 과정**이 발생하므로 이 과정에서 병목이 발생할 수 있다.

서버에 MultipartFile 형식의 요청이 들어왔을 때, 파일을 업로드할 때 사용되는 클래스인 `org.apache.tomcat.util.http.fileupload.disk.DiskFileItem` 를 확인해보면

![](https://i.imgur.com/htlPTdZ.png)

임시 파일을 생성하는 `getTempFile` 메서드를 확인할 수 있으며,

![](https://i.imgur.com/yVSl4fR.png)

 `getoutputStream()` 에서 임시파일을 생성하는 것을 확인할 수 있다.

따라서 `MultipartFile` 업로드 방식에서 디스크 I/O 작업이 두 번 발생하는 것을 확인할 수 있다.
먼저 클라이언트에서 임시파일을 저장하는 부분에서 첫 번째 디스크 I/O가 발생하게 되고,
임시 파일을 최종 저장 위치로 복사하는 과정에서 두 번째 디스크 I/O가 발생하게 된다.

따라서 `MultipartFile` 업로드 방식을 사용한다면 **임시파일에 대한 디스크 I/O가 발생하여, 오버헤드가 생길 수 있다.**

또한 **임시 파일을 저장하는 위치에 따라 문제가 생길 수도 있다.**

![tkfndnx.png](https://i.imgur.com/tkfndnx.png)
![](https://i.imgur.com/tkfndnx.png)

 실제로 `MultipartFile` 업로드를 수행하던중 **임시 저장 위치의 용량 문제** 때문에 업로드가 제대로 수행되지 않았다.

## `InputStream` 으로 직접 업로드하는 방식

### 코드 및 동작 방식

 작성한 코드는 아래와 같다.

- Controller

```java
/**
 * application/octet-stream 방식으로 대용량 파일을 업로드하는 컨트롤러 메서드
 * 파일 이름과 크기는 HTTP 헤더를 통해 전달받음
 */
@PostMapping("/upload")
public UploadResult uploadFile(
        @RequestHeader("X-File-Name") String encodedFilename,  // URL 인코딩된 파일명
        @RequestHeader("X-File-Size") long fileSize,          // 파일 크기(바이트)
        HttpServletRequest request) throws IOException {
    
    // URL 디코딩으로 원래 파일명 복원
    String filename = URLDecoder.decode(encodedFilename, StandardCharsets.UTF_8.name());
    
    // 요청 본문에서 직접 InputStream 획득
    try (ServletInputStream inputStream = request.getInputStream()) {
        // 스트림으로부터 파일 저장 (임시 파일 생성 없음)
        String savedPath = storageService.saveInputStream(inputStream, filename, "uploads");
        
        // 업로드 결과 정보 반환
        return UploadResult.builder()
                .filename(filename)
                .fileSize(fileSize)
                .path(savedPath)
                .method("stream")
                .build();
    }
}
```

- Service

```java
public String saveInputStream(InputStream inputStream, String filename, String subDir) throws IOException {
  Path uploadPath = Paths.get(uploadDir, subDir);

  if (!Files.exists(uploadPath)) {
   Files.createDirectories(uploadPath);
  }

  Path filePath = uploadPath.resolve(filename);

  try (FileOutputStream outputStream = new FileOutputStream(filePath.toFile())) {
   byte[] buffer = new byte[8192]; // 8 KB 
   int bytesRead;
   while ((bytesRead = inputStream.read(buffer)) != -1) {
    outputStream.write(buffer, 0, bytesRead);
   }
  }

  return filePath.toString();
 }
```

- 클라이언트 코드

```java
async function uploadStream(file) {
    try {
        const response = await fetch('/api/stream/upload', {
            method: 'POST',
            headers: {
                'X-File-Name': encodeURIComponent(file.name),
                'X-File-Size': file.size,
                'Content-Type': 'application/octet-stream'
            },
            body: file // 파일 객체를 직접 본문으로 전송
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        logMessage(`업로드 중 오류 발생: ${error.message}`);
        throw error;
    }
}

```

![](https://i.imgur.com/hXtx7aG.png)

 `InputStream` 을 이용해서 업로드하는 방식은 다음과 같이 처리된다.

 1. 클라이언트는 `application/octet-stream` 의 Content-Type 을 설정 후, 요청을 보낸다.

- *이 때, 메타데이터의 경우, 주로 커스텀 헤더를 이용하는 것 같다. (ex: Dropbox API)*

 2. 서블릿 컨테이너가 클라이언트의 요청을 수신하고, 이를 일반 HTTP 요청으로 처리한다.
 3. 컨트롤러에서 `HttpServletRequest` 의 `request.getInputStream()` 으로 원본 데이터 스트림에 직접 접근하고, 파일을 직접 저장한다.

### 단점

하지만 InputStream 방식을 사용하는 경우, MultipartFile 방식에 비해 **안정성 측면에서 부족하다는 단점이 있다.**

MultipartFile 을 사용하는 경우, Spring Boot 라이브러리의 지원을 받아 예외 처리, 메타데이터 관리, 설정 파일을 활용한 파일 검증의 기능을 사용할 수 있지만 InputStream 방식을 사용한다면 관련 부분들을 개발자가 직접 정의해주어야 한다는 문제점이 있다.

## 분석

> 해당 코드는 아래 깃허브에서 확인할 수 있습니다.
> ::github{repo="punchdrunkard/file-upload"}

`MultipartFile` 방식과 `InputStream` 을 직접 사용하는 방식을 비교해보았다.

### 측정 방법

- **더미 파일 생성** : Linux의 `truncate` 명령어를 사용하여 1G, 5G, 10G의 테스트용 더미 파일을 생성하였다.

```bash
truncate -s 1GB 1G.file 
truncate -s 5GB 5G.file 
truncate -s 10GB 10G.file
```

- 시간 측정
  - 클라이언트 측정 시간 : 클라이언트에서 요청 시작부터 응답 수신까지의 전체 시간
    - 브라우저 코드에서 JavaScript 를 이용하여 직접 시간을 측정하였다.
  - 서버 측정 시간: 서버 내부에서 실제 로직 실행 시간

- 메모리 측정 : Micrometer 를 사용해 JVM 힙 메모리 사용량을 측정하였다.

### 성능 측정 결과

- **1G 파일 업로드 시**
![](https://i.imgur.com/h5E4NKx.png)

- **5G 파일 업로드 시**

![](https://i.imgur.com/tXWS9aI.png)

- **10G 파일 업로드 시**
![](https://i.imgur.com/QmU6Lrp.png)

#### 업로드 시간 비교

| 파일 크기 | MultipartFile 클라이언트 시간 | MultipartFile 서버 시간 | InputStream 클라이언트 시간 | InputStream 서버 시간 |
| ----- | ---------------------- | ------------------- | -------------------- | ----------------- |
| 1GB   | 20,488ms               | 4,366ms             | 15,034ms             | 15,001ms          |
| 5GB   | 111,046ms              | 26,319ms            | 60,965ms             | 60,843ms          |
| 10GB  | 198,384ms              | 49,244ms            | 122,312ms            | 122,262ms         |

### 분석

1. MultipartFile 의 임시 파일 오버 헤드
 MultipartFile 업로드 방식의 경우, 업로드하는 파일의 용량이 커질 수록 클라이언트와 서버 측정 시간 사이에 격차가 커짐을 확인할 수 있다.
 반면 InputStream 방식의 경우 클라이언트와 서버 측정 시간이 거의 동일하다.
 이는 MultipartFile 방식에서 서버 측정에 포함되지 않는 상당한 오버헤드가 존재함을 보여준다. 두 방식의 처리 과정을 비교해보면, 이 오버헤드는 서블릿 컨테이너에서 멀티파트 요청을 파싱하고 임시 파일을 처리하는 과정에서 발생한다고 예측할 수 있다.

2. 전체 업로드 시간 비교

- 1GB 파일: InputStream이 MultipartFile보다 **26.6%** 빠름
- 5GB 파일: InputStream이 MultipartFile보다 **45.1%** 빠름
- 10GB 파일: InputStream이 MultipartFile보다 **38.3%** 빠름

특히 파일 크기가 커질수록(10GB) 성능 차이가 더 두드러지는 것을 확인할 수 있다.

:::note[클라이언트 기준 응답 시간을 사용한 이유]
 **Spring 에서 Filter 나 Interceptor 를 이용해서 시간을 측정하게 된다면, 요청이 들어오는 앞단에서의 시간을 잴 수 없기 때문에, 클라이언트에서 직접 시간을 재는 방식을 사용하였다.**
 실제로 결과에서의 서버 측정 시간을 확인해보면 InputStream 을 사용하는 부분은 차이가 없지만, multipartfile 에서는 임시파일에 대한 시간이 측정되지 않는 것을 확인할 수 있다.
:::

### 분석의 한계점

**메모리 사용량 비교**

 메모리의 경우, 측정 방법의 한계에 의해 제대로 결과를 분석할 수 없었다.
왜냐하면 `MultipartFile` 의 경우 서블릿 컨테이너 수준(Tomcat)에서 먼저 파일 파싱과 임시 파일 생성이 이루어지기 때문에 컨트롤러에서 시작된 메모리 측정은 이미 앞의 작업의 메모리 사용이 발생한 이후에 시작되기 때문이다.
반면 InputStream 의 경우 전체 과정이 서비스 메서드 내부에서 발생한다.

## 결론

InputStream 을 직접 사용하여 파일을 업로드하면 성능과 효율성 측면에서 장점이 있다.
하지만 이를 사용한다면 안정성 문제가 발생할 수 있다.

이를 해결하기 위해 `TUS` 프로토콜과 같이 표준화된 프로토콜을 이용하여 안정적인 업로드를 구현할 수 있다.
다음 게시글에서는 `InputStream` 방식에서 업로드가 중단되었을 때 해결 방법을 간단하게 구현해보고 TUS 프로토콜과 같은 예시에서는 어떤 방식으로 해결했는지 분석해보도록 하겠다.

## 참고자료

- <https://stackoverflow.com/questions/64988683/tomcat-performance-with-spring-boot-api-for-file-upload>
- <https://stackoverflow.com/questions/62551030/spring-boot-multipart-file-upload-tips-to-improve-performance>
- <https://stackoverflow.com/questions/22107380/resume-file-upload-download-after-lost-connection-socket-programming/22107823#22107823>
- <https://medium.com/@AlexanderObregon/breaking-down-the-multipart-upload-process-within-spring-boot-9ad27fb4138f>
- <https://github.com/spring-projects/spring-framework/issues/30885>
- <https://shanepark.tistory.com/m/441>
- <https://ksh-dev.tistory.com/55>
