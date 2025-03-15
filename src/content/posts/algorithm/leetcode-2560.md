---
title: "[LeetCode] 2560 House Robber IV"
published: 2025-03-15
description: 최솟값의 최대화 문제를 이진 탐색(parametric search)으로 효율적으로 해결하는 방법
tags: ["Algorithm", "Binary Search", "Parametric Search", "Optimization Problem", "Greedy Algorithm"]
category: Problem Solving
draft: false
---

## 문제 소개

:::note[문제 링크 (2025년 3월 15일 Daily Problem)]
<https://leetcode.com/problems/house-robber-iv/description/?envType=daily-question&envId=2025-03-15>
:::

### 문제 설명 및 요구사항

- `int[]` 로 표현되는 일렬의 집이 있을 때, 도둑이 집의 돈을 훔치려고 한다.
- 도둑은 **인접한 집의 돈을 훔칠 수 없다.**
- 도둑의`capability` 는 그가 한 번에 훔칠 수 있는 최대 금액을 의미한다.
  - 문제의 설명에서는 그가 훔친 집들의 돈 중 최대 금액을 이야기해서 혼동이 있을 수 있다...
- 문제의 목표는 **최소 k개의 집을 털면서, 도둑에게 필요한 최소 capability를 찾는 것**이다.

### 입/출력 예시 분석

:::note[예제 1번]

- Input: `nums = [2,3,5,9]`, `k = 2`
- Output: `5`

:::

도둑은 `(0번, 2번)`, `(0번, 3번)`, `(1번, 3번)` 의 집을 털 수 있고
이를 털기 위해서는 각각 `5`, `9`, `9` 의 capability 가 요구된다.
이 중 최소의 `capability` 는 `5` 이다.

:::note[예제 2번]

- Input: `nums = [2, 7, 9, 3, 1]`, `k = 2`
- Output: `2`

:::

도둑은 `(0번, 2번)`, `(0번, 3번)`, `(0번, 4번)`, `(1번, 3번)`, `(1번, 4번)`, `(2번, 4번)`, `(0번, 2번, 4번)` 의 집을 털 수 있고 이를 털기 위해서는 각각 `9`, `3`, `2`, `3`, `7` , `7`, `7`의 `capability` 가 요구된다.
이 중 최소 `capability` 는 `2` 이다.

### 문제의 제약 조건

> - `1 <= nums.length <= 10^5`
> - `1 <= nums[i] <= 10^9`
> - `1 <= k <= (nums.length + 1)/2`

- `nums.length` 가 최대 10^5까지 가능하므로 brute force 방법을 사용한다면 조합의 수가 지수적으로 증가하여 시간 복잡도가 발생한다.
- 현재 문제의 제약 사항 중 최소 `k` 개의 집을 털어야한다는 사항을 살펴보면 각 상태를 배열로 표현하기 어려우므로 DP 방법으로 해결할 수 없다.

## 문제 이해하기

> Problems that require maximizing the minimum or minimizing the maximum often suggest a binary search approach. Instead of searching through indices or subsets directly, we can binary search on the reward value itself. By determining whether a given minimum reward is achievable, we can efficiently narrow down the possible solutions. If you're unfamiliar with this technique, you can refer to [this guide](https://leetcode.com/explore/learn/card/binary-search/) to learn more about binary search.

문제의 Editorial 에 제시된 것 처럼 **최댓값을 최소화** 하거나 **최솟값을 최대화** 하는 문제에서는 주로 **이진 탐색 (parametric search)** 이 사용된다. 이러한 유형의 문제를 **최적화 문제** 라고 부르는데, 이진 탐색을 사용하면 문제를 **X라는 값이 가능한 해인가?** 라는 **결정 문제 (Yes / No 문제)** 로 바꾸어 풀 수 있다.

따라서 문제에서 구하고자하는 `capablity` 의 개념에 대해 생각해보자.
문제의 설명에 의하면 `capablity` 는 도둑이 훔친 모든 집 중에서 한 집에서 훔친 최대 금액을 의미한다.
이를 다른 관점에서 보면, **`capability`가 `x`인 도둑은 값이 `x` 이하인 집만 털 수 있다**고 해석할 수 있다. 즉, 털고자 하는 집들 중 하나라도 값이 `x`를 초과한다면 도둑은 그 집들의 집합을 털 수 없다.

따라서 이 문제를 **결정 문제**로 바꾸면 다음과 같이 표현할 수 있다.
> **도둑의 `capability` 가 `x` 원 일 때, 현재 집의 집합을 털 수 있는가?**

이제 parametric search를 적용하기 위해 해의 분포를 생각해보자.
`capability`가 작을수록(즉, `lo`에 가까울수록) 결정 문제의 답은 `F`(불가능)가 되고, `capability`가 클수록(즉, `hi`에 가까울수록) 결정 문제의 답은 `T`(가능)가 된다. 따라서 답의 분포는 `FFFFFFTTTT`와 같은 형태를 가지며, 우리가 구하고자 하는 값은 첫 번째 `T`가 나타나는 지점 (`hi`), 즉 `capability`의 최솟값이다.

이제 결정 문제에 대해 `T`와 `F`를 판별하는 방법을 생각해보자. 도둑의 `capability`가 `x`라고 할 때, 도둑이 적어도 `k`개의 집을 털 수 있는지 확인해야 한다. 이를 위해 배열 `nums`를 순차적으로 탐색하며, `x` 이하의 값을 가진 집만 선택하고 인접한 집은 건너뛰는 방식으로 최대 몇 개의 집을 털 수 있는지 계산할 수 있다.

### 시간 복잡도

배열 `nums`의 최댓값을 `m`, 길이를 `n`이라고 하자.

이 문제의 알고리즘은 두 가지 핵심 연산으로 구성된다:

1. **이진 탐색**: 가능한 `capability` 값의 범위(1부터 배열의 최댓값 `m`까지)에서 최적값을 찾기 위해 이진 탐색을 수행한다. 이진 탐색은 각 단계마다 탐색 범위를 절반으로 줄이므로, 총 `O(log m)` 번의 반복이 필요하다.
2. **선형 탐색**: 각 이진 탐색 단계에서 중간값 `mid`가 유효한 `capability`인지 확인하기 위해 배열 전체를 한 번 순회한다. 이 과정에서 `O(n)` 시간이 소요된다.

두 연산이 중첩되어 있으므로, 전체 시간 복잡도는 두 연산의 곱인 `O(n log m)`이 된다. 이는 다음과 같이 이해할 수 있다:

- 이진 탐색 과정에서 `O(log m)` 번의 반복
- 각 반복마다 `O(n)` 시간의 선형 탐색


## 구현

```java
class Solution {
    public int minCapability(int[] nums, int k) {
        int n = nums.length;
        
        // Define binary search boundaries
        int lo = 0;  // Lower bound for capability (minimum possible value)
        int hi = Arrays.stream(nums).max().getAsInt();  // Upper bound (maximum house value)
        

        while (lo + 1 < hi) {
            int mid = lo + (hi - lo) / 2; 
            // Counter for houses that can be robbed with capability 'mid'
            int robbedCount = 0;  

            // Apply greedy approach to count how many houses can be robbed
            for (int i = 0; i < n; ++i) {
                if (nums[i] <= mid) {  // If house value is within our capability
                    robbedCount++;     // Rob this house
                    i++;               // Skip next house to maintain non-adjacency constraint
                }
            }

            // Update search boundaries based on result
            if (robbedCount < k) {
                // If we couldn't rob enough houses, increase capability
                lo = mid;
            } else {
                // If we robbed enough houses, try with lower capability
                hi = mid;
            }
        }

        // Return the minimum capability that allows robbing at least k houses
        return hi;
    }
}
```

## 참고 자료

- [이분 탐색(Binary Search) 헷갈리지 않게 구현하기](https://www.acmicpc.net/blog/view/109)
- [LeetCode Editorial](https://leetcode.com/problems/house-robber-iv/editorial/?envType=daily-question&envId=2025-03-15)
