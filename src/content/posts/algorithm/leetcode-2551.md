---
title: "[LeetCode] 2551 Put Marbles in Bags"
published: 2025-03-31
description: 전체 subarray 를 전부 구할 필요가 없다!
tags: ["Algorithm", "Sorting", "Boundary", "Greedy"]
category: Problem Solving
draft: false
---

## 문제 소개

:::note[문제 링크 (2025년 3월 31일 Daily Problem)]
<https://leetcode.com/problems/put-marbles-in-bags/description/?envType=daily-question&envId=2025-03-31>
:::

### 문제 설명 및 요구사항

- `k` 개의 가방이 있고 `weights` 라는 `int` 배열이 주어진다.
  - `weights[i]` 는 `i` 번째 구슬의 무게를 의미한다.
- 다음의 rule 에 따라 구슬을 `k`개의 가방으로  나눠야 한다.
  - **빈 가방은 존재하지 않는다.**
  - `i` 번째 구슬과 `j` 번째 구슬이 가방에 존재한다면 `i` 와 `j` 사이의 모든 구슬도 반드시 해당 가방에 들어가야 한다.
  - 가방의 `cost` 는 가방에 있는 첫 번째 구슬과 마지막 구슬 무게의 합이다. 즉, `i` 부터 `j` 까지의 구슬이 한 가방에 있다면 해당 가방의 `cost` 는 `weights[i] + weights[j]` 이다.
- `score` 은 모든 `k`개 가방의 `cost` 합이다.
- 가능한 모든 분배 방법 중 최대 score 과 최소 score의 차이를 구해야 한다.

### 입/출력 예시 분석

:::note[예제 1번]

- Input: `weights = [1, 3, 5, 1]`, `k = 2`
- Output: `4`

:::

가능한 distribution 을 생각해보면

- `1 | 3 5 1`
- `1 3 | 5 1`
- `1 3 5 | 1`
이 존재한다.

각 경우별로 cost 를 계산한다면

- `1 | 3 5 1` → `1` + `3 + 1` ⇒ `6` (min)
- `1 3 | 5 1` → `1 + 3` + `5 + 1` ⇒  `10` (max)
- `1 3 5 | 1` → `1 + 5` + `1` ⇒ `7`

최댓값 `10`, 최솟값 `6` 이므로 답은 `4` 가 된다.

:::note[예제 2번]

- Input: `weights = [1, 3]`, `k = 2`
- Output: `0`

:::

가능한 distribution을 생각해보면

- `1 | 3` 하나 뿐이다.
따라서 max 와 min 이 동일하므로 `0` 이 답이다.

### 문제의 제약 조건

> `1 <= k <= weights.length <= 10^5`
> `1 <= weights[i] <= 10^9`

처음에 DP로 접근하였으나, DP  로 구하기 위해 subarray 를 계산하는 과정에서 subarray 를 구하기 위해서 10^5 중 k - 1 를 택하는 과정이 필요하므로 시간 초과가 발생했다..

따라서 이 문제에서는 subarray 를 모두 선택하는게 아니라 **subarray가 나뉘어지는 경계의 관점에서 생각** 해야 한다.

## 문제 이해하기

### 핵심 문제 파악

 예를 들어, 현재 배열이 `[0, 1, 2, 3, 4, 5, 6, 7, 8]` 이고 `k = 2`  라고 하자
 그렇다면 가능한 distribution은 다음과 같다.

- `0 | 1 2 3 4 5 6 7 8`
- `0 1 | 2 3 4 5 6 7 8`
- `0 1 2 | 3 4 5 6 7 8`
- ...
- `0 1 2 3 4 5 6 7 | 8`

여기서 관찰할 수 있는 것은

1. `k` 개의 가방으로 나누기 위해서는 `k - 1` 개의 경계가 필요하다.
2. 전체 score에서 첫 번째 원소(`weights[0]`)와 마지막 원소(`weights[n-1]`)는 항상 포함된다.

예를 들어 `0 1 2 | 3 4 5 6 7 8` 으로 나눴다고 하면`cost` 는 다음의 식으로 계산할 수 있다.

- `0 + 2` + `3 + 8`

그렇다면 이제 **경계**에 집중해보자.
위의 distribution 의 경계값을 생각해보면 `2`, `3` 인데
위의 cost 는 다음과 같이 풀어 쓸 수 있다.
`0 : 첫번째 원소` + `2 + 3 (partition 양쪽의 값)` + `8 : 마지막 원소`

따라서, 이 분제는 모든 가능한 경계(인접한 두 원소의 합)를 계산하고, 그 중 `k-1`개를 선택하는 문제라고 생각할 수 있다.

> 첫 번째 원소 + 마지막 원소 + (k - 1개의 경계 값)

그렇다면 문제를 푸는 과정은 다음과 같이 정리할 수 있다.

- `weights` 배열에서 만들어질 수 있는 경계의 합 계산하기
- 해당 경계의 합을 정렬 (오름차순이라고 치면)
- 앞에서 부터 k  - 1개 계산 → 최솟값, 뒤에서부터 k- 1개 계산 → 최댓값

### 시간 복잡도

`weights` 배열의 크기를 `n`이라고 할 때,

- `weights` 배열에서 만들어질 수 있는 경계의 합을 계산하는데는 `n - 1` (10^5)
- 정렬은 `nlogn`
- 최대, 최소값을 계산하기 위해 `k - 1`개 선형 탐색

따라서 `n - 1` + `nlogn` + `k - 1`  이므로
총 `O(nlogn)` 의 시간 목잡도를 가진다.

## 구현

```java
class Solution {
    public long putMarbles(int[] weights, int k) {
        int n = weights.length;
        
        // 인접한 원소들의 합(경계값) 계산
        long[] boundaries = new long[n - 1];
        for (int i = 0; i < n - 1; i++) {
            boundaries[i] = weights[i] + weights[i + 1];
        }
        
        // 경계값 정렬
        Arrays.sort(boundaries);
        
        // 첫 원소와 마지막 원소는 항상 포함됨
        long base = weights[0] + weights[n - 1];
        
        // 최소 score 계산 (가장 작은 k-1개 경계값 선택)
        long min = base;
        for (int i = 0; i < k - 1; i++) {
            min += boundaries[i];
        }
        
        // 최대 score 계산 (가장 큰 k-1개 경계값 선택)
        long max = base;
        for (int i = 0; i < k - 1; i++) {
            max += boundaries[n - 2 - i];
        }
        
        return max - min;
    }
}
```

## 사담

경계 기준으로 보는게 너무너무 신기했음..............
