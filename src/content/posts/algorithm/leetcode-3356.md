---
title: "[LeetCode] 3356 Zero Array Transformation II"
published: 2025-03-13
description: Binary Search와 Difference Array을 활용한 효율적인 구간 업데이트 문제 해결 방법
tags: ["Algorithm", "Binary Search", "Parametric Search", "Difference Array", "Range Update", "Prefix Sum"]
category: Problem Solving
draft: false
---

## 문제 소개

:::note[문제 링크 (2025년 3월 13일 Daily Problem)]
<https://leetcode.com/problems/zero-array-transformation-ii/description/?envType=daily-question&envId=2025-03-13>
:::

### 문제 설명 및 요구사항

- `int` 형 배열 `nums` 와 2차원 배열 `queries` 가 `queries[i] = [l_i, r_i, val_i]` 형태로 주어진다.
- 각 `queries[i]` 에 대해 `nums` 의 `[l_i, r_i]` 를 `val_i` 만큼 감소시킬 수 있다.

이 때, **배열의 전체 원소가 0이 되게 하려면 (zero array) 쿼리를 최소 몇 번 적용**시켜야 하는가?

### 입/출력 예시 분석

:::note[예제 1번]

- Input: `nums = [2,0,2]`, `queries = [[0,2,1],[0,2,1],[1,1,3]]`
- Output : 2

:::

 문제의 설명에 따라 `queries[0]` 을 적용시키면 `nums` 배열을 `[1, 0, 1]` 로 만들 수 있다. 그리고 `queries[1]` 을 적용시키면 `[0, 0, 0]` 으로 만들 수 있으므로 쿼리를 총 **2번** 적용하면 원하는 조건을 충족한다.

:::note[예제 2번]

- Input: `nums = [4,3,2,1]`, `queries = [[1,3,2], [0,2,1]]`
- Output : -1

:::

 이 경우, 모든 쿼리를 적용시켜도 zero array 를 만들 수 없다.

### 문제의 제약 조건

> - `1 <= nums.length <= 10^5`
> - `1 <= queries.length <= 10^5`
> - `0 <= l_i <= r_i < nums.length`
> - `1 <= val_i <= 10^6`
> - `1 <= nums[i] <= 10^6`

이러한 제약조건으로 인해 단순한 brute force 접근법은 시간 초과를 발생시킬 수 있다. 최악의 경우 `O(nums.length * queries.length)`인 `10^10`의 연산이 필요하므로, 더 효율적인 알고리즘이 요구된다.

## 문제 이해하기

### 핵심 문제 파악

문제에서 핵심이 되는 두 가지 연산은 다음과 같다.

1. **주어진 쿼리들을 순회**하면서
2. 각 쿼리를 적용하여 **`nums` 구간 내의 원소들을 증가**시키는 것이다.

#### 쿼리 순회 최적화 - Binary Search

여기서 먼저 **쿼리를 순회** 하는 부분을 생각해보자.
문제에서 요구하는 값은 **몇 번째 쿼리까지 적용했을 때, 배열의 모든 원소가 0이 될 수 있는가?** 이다. 쿼리를 순차적으로 적용할 때, 어떤 인덱스 k까지의 쿼리를 적용하면 배열이 모두 0이 되는지에 대한 결과는 `FFFFFFTTTTT` 형태의 단조 증가 패턴을 보인다. 이러한 경우, **매개변수 탐색(parametric search)을 이용하여 조건을 만족하는 최소 `k` 값을 효율적으로 찾을 수 있다.**

#### 구간 업데이트 최적화 - Difference Array, prefix sum

그리고 두 번째는 `nums` 의 특정 구간 내 원소를 증가시키는 부분을 생각해보자.
구간에 대한 연산을 최적화 하기 위해 대표적으로 `prefixSum` 을 생각할 수 있다.
하지만 일반적인 누적합 방식을 사용하면, 구간을 전부 순회하며 배열을 업데이트해야 하므로 구간 업데이트 시 `O(n)` 시간이 소요된다. 이를 최적화하기 위해 **Difference Array** 기법을 활용할 수 있다.

Difference Array는 **구간 업데이트 연산**을 `O(1)` 시간에 처리할 수 있게 해주는 자료 구조이다. 이 배열은 **인접한 원소 간의 차이**를 저장합니다:

- `differenceArrag[0] = A[0]`
- `differenceArrag[i] = A[i] - A[i-1]` (i ≥ 1일 때)

이 구조를 사용하면 구간 `[L, R]`에 값 `val`을 더하는 연산을 두 번의 업데이트로 처리할 수 있다:

- `D[L] += val` (시작 지점에서 증가)
- `D[R+1] -= val` (끝 지점 이후에서 감소)

문제의 예시를 통해, 해당 아이디어를 적용시킨다면
![](https://i.imgur.com/dxmy1by.png)

위의 그림 처럼 Difference Array 를 업데이트 할 수 있다.
Zero Array를 만들기 위해서는 `prefixSum[i] >= nums[i]`를 모든 인덱스 `i`에서 만족해야 한다.

### 시간 복잡도

이러한 최적화를 적용할 경우:

- `queries` 배열의 크기를 `m`
- `nums` 배열의 크기를 `n`이라고 할 때

총 시간 복잡도는:

- 이진 탐색: `O(log m)`
- 각 이진 탐색 단계에서:
  - 차이 배열 초기화 및 쿼리 적용: `O(n + k)` (k는 현재 확인 중인 쿼리 수)
  - 누적합 계산 및 검증: `O(n)`

따라서 전체 시간 복잡도는 `O(log m * (n + m))`이 되어 단순한 `O(m * n)` 접근법보다 훨씬 효율적이다!

## 구현

```java
class Solution {
    public int minZeroArray(int[] nums, int[][] queries) {
        // 이미 모든 원소가 0인 경우 빠르게 체크
        if (isAllZeros(nums)) {
            return 0;
        }
        
        // nums에 어떤 쿼리도 적용하지 않고 0 배열이 되는지 확인
        if (canMakeZeroArray(new int[nums.length], nums)) {
            return 0;
        }
        
        // 이진 탐색으로 최소 쿼리 수 찾기
        int left = 0;
        int right = queries.length;
        
        while (left + 1 < right) {
            int mid = left + (right - left) / 2;
            
            if (canFormZeroArray(nums, queries, mid)) {
                right = mid;
            } else {
                left = mid;
            }
        }
        
        // 최종 결과 반환
        return canFormZeroArray(nums, queries, left) ? left + 1 : 
               (right < queries.length ? right + 1 : -1);
    }
    
    // 배열이 이미 모두 0인지 확인하는 헬퍼 메서드
    private boolean isAllZeros(int[] nums) {
        for (int num : nums) {
            if (num != 0) {
                return false;
            }
        }
        return true;
    }
    
    // k번째 쿼리까지 적용했을 때 zero array가 만들어지는지 확인
    private boolean canFormZeroArray(int[] nums, int[][] queries, int k) {
        // 차이 배열 초기화
        int[] differenceArray = new int[nums.length + 1]; // +1 크기로 변경하여 경계 조건 간소화
        
        // k번째 쿼리까지 차이 배열에 적용
        applyQueriesToDifferenceArray(differenceArray, queries, k);
        
        // 차이 배열을 이용해 zero array가 만들어지는지 확인
        return canMakeZeroArray(differenceArray, nums);
    }
    
    // 차이 배열에 쿼리 적용
    private void applyQueriesToDifferenceArray(int[] differenceArray, int[][] queries, int k) {
        for (int i = 0; i <= k; i++) {
            int left = queries[i][0];
            int right = queries[i][1];
            int val = queries[i][2];
            
            differenceArray[left] += val;
            differenceArray[right + 1] -= val; // 배열 크기가 +1이므로 범위 체크 불필요
        }
    }
    
    // 차이 배열을 이용해 zero array가 만들어지는지 확인
    private boolean canMakeZeroArray(int[] differenceArray, int[] nums) {
        int sum = 0;
        
        // 누적합을 계산하며 각 위치에서 원소가 0이 될 수 있는지 확인
        for (int i = 0; i < nums.length; i++) {
            sum += differenceArray[i];
            if (sum < nums[i]) {
                return false; // 해당 위치에서 원소를 0으로 만들 수 없음
            }
        }
        
        return true; // 모든 위치에서 원소를 0으로 만들 수 있음
    }
}
```

## 참고 자료

- [이분 탐색(Binary Search) 헷갈리지 않게 구현하기](https://www.acmicpc.net/blog/view/109)
- [LeetCode Editorial](https://leetcode.com/problems/zero-array-transformation-ii/editorial/?source=submission-ac)
