---
title: 'Submodule 로 배포 정보 관리하는 방법'
published: 2025-01-27
description: Spring Boot 프로젝트에서 서브모듈을 이용해 private repo에 저장된 `application-prod.yml` 을 다루는 방법을 다룬다.
tags: ['Git', 'Submodule', 'GitHub Actions', 'Spring Boot']
category: Git
draft: false
---

## 개요

배포 정보를 담고 있는 파일인 `application-prod.yml` 과 같은 파일을 외부에 노출하지 않기 위해 `private repo` 의 내용을 서브모듈로 관리할 수 있다.

이 글에서는 Spring Boot 프로젝트에서 서브모듈을 이용해 `application-prod.yml` 을 다루는 방법을 다룬다.

## 방법

### 1. 현재 레포지토리에 서브 모듈 연결하기

```bash
git submodule add <repository_url> <path>
```

- `<path>` 를 지정하지 않으면 기본값으로 프로젝트의 루트에 **연결한 레포지토리의 이름을 가진 폴더가 생성된다.**
- 서브모듈 연결 후, 이 폴더 안에 `application-prod.yml` 같은 배포 정보를 관리할 수 있다.

### 2. `build.gradle` 에 서브모듈 배포 파일 복사 설정

Spring Boot에서는 `application.yml`과 같은 설정 파일이 **`src/main/resources`** 디렉터리에 있어야 애플리케이션에서 읽을 수 있다.
따라서 서브모듈에서 가져온 `application-prod.yml`을 해당 디렉터리로 복사하는 작업이 필요하다.

이를 위해 `build.gradle` 에 다음과 같은 내용을 추가한다:

```groovy
// build.gradle 

processResources.dependsOn('copySecret')

tasks.register('copySecret', Copy) {
 from '서브모듈디렉터리' // 서브모듈 경로
 include "application*.yml" // 필요한 파일 패턴
 into 'src/main/resources'// 복사 대상 디렉터리
}
```

### 3. `.gitignore` 설정

복사된 설정 파일이 버전에 포함되지 않도록 `.gitignore`에 다음 내용을 추가한다:

```.gitignore
src/main/resources/application-prod.yml
```

### 4. 변경 내용 커밋

서브모듈은 **파일로 관리**되기 때문에, 서브모듈의 커밋 시점이 변경되면 이를 반드시 커밋해야 한다.

```bash
git add .
git commit -m "chore: update submodule reference"
```

### 5. 서브 모듈 업데이트 하기

서브모듈의 내용이 변경되었을 때, 현재 레포지토리에서 이를 반영하려면 업데이트가 필요하다.
따라서 다음 명령어로 서브모듈의 최신 내용을 가져와야 한다.

```bash
# 프로젝트의 모든 서브 모듈 업데이트
git submodule foreach git pull origin main
```

그 후, 변경된 서브모듈 내용을 다시 커밋한다.

```bash
git add .
git commit -m "커밋_메시지"
```

:::note[서브 모듈 관리 구조]
 서브 모듈은 독립적인 Git 저장소로 관리되며, **현재 프로젝트의 부모 저장소에는 서브 모듈이 특정 커밋에 고정**된다. 즉, 파일 처럼 관리하게 되는데 이 말은 부모 저장소에서 서브 모듈은 **특정 시점의 커밋 해시를 참조** 하게 되며, 서브 모듈의 최신 변경 내용이 부모 저장소에 자동으로 변경되지는 않는다.

따라서 서브 모듈이 업데이트 되었을 경우 **변경된 커밋 해시를 반영** 해야한다.
:::

## 번외: `GitHub Action` 에서의 CI/CD에서 서브모듈 활용

`GitHub Action` 을 이용하여 CD 스크립트를 작성할 때, 서브 모듈을 이용하고 있다면 `Checkout Repository` 단계에서 서브모듈 사용을 활성화해야 한다. 이를 위해 다음 설정을 추가한다:

```yml
 - name: Checkout Repository
   uses: actions/checkout@v3
   with:
     token: ${{ secrets.ACTION_TOKEN }} # 서브모듈 액세스를 위한 token
     submodules: true # recursive 옵션을 사용하면, 서브 모듈 내부의 서브모듈 까지 사용할 수 있다. 
```

이 때 `ACTION_TOKEN` 의 경우, **서브모듈 레포지토리 소유자의 Personal Access Token**을 사용해야 한다.
