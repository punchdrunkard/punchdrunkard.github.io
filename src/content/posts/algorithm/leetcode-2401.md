---

title: "[LeetCode] 2401. Longest Nice Subarray"
published: 2025-03-18
description: Sliding Window와 비트 연산을 활용한 효율적인 하위 배열 탐색 문제 해결 방법
tags: ["Algorithm", "Sliding Window", "Bitwise Operation", "Bitmask", "LeetCode"]
category: Problem Solving
draft: false
---  

## 문제 소개

:::note[문제 링크 (2025년 3월 18일 Daily Problem)]

<https://leetcode.com/problems/longest-nice-subarray/description/?envType=daily-question&envId=2025-03-18>

:::

### 문제 설명 및 요구사항

- 양의 정수로 이루어진 `nums` 의  `nice` 한 속성을 가진 `subarray` 의 최대 길이를 찾는 문제이다.
- 어떤 배열이 `nice` 하다는 것은 **해당 배열 내의 서로 다른 위치에 있는 모든 원소 쌍의 bitwise AND 연산의 결과가 `0`이어야 한다** 는 것을 의미한다.
- `subarray` 란 배열의 **연속적인 부분** 을 의미한다.

### 문제의 제약 조건

- `1 <= nums.length <= 10^5`
- `1 <= nums[i] <= 10^9`

- `nums[i]` 가 `10^9` 가 최댓값이면 이는 비트로 나타냈을 때 30 bit 이하임을 의미한다. (`10^9 < 2^30` 이므로)
  따라서 bit 를 계산하는 과정은 최악의 시간이라도 상수 시간을 가진다.
- `nums` 의 길이가 `10^5` 이기 때문에 **배열을 순회할 때, brute force는 불가능하다.**
  
## 문제 이해하기

:::note[예제 1번]

- Input: `nums = [1, 3, 8, 48, 10]`

- Output : `3`

:::

**예제 1번**에서 배열의 왼쪽부터 subarray를 관찰해보자.
`[1, 3]` 에서 `1 (01) & 3 (11) = 1` 이므로 해당 subarray는 `nice` 하지 않다.
bitwise AND 연산에서는
`[3, 8]` 에서 `3 (011) & 8 (100) = 0` 이므로 해당 subarray는 `nice` 하다.
이 때, `3` 에서 `8`이 추가된 방식을 살펴보면, **`3`과 `8`을 비트로 나타냈을 때, 겹치는 위치에 비트가 존재하지 않는다.**
이러한 방법으로 배열의 끝까지 관찰하면 `[3, 8, 48]` 이 `nice` 한 속성을 가진 가장 긴 subarray 가 된다.

### 핵심 문제 파악

우선 배열에서 연속적인 subarray를 관찰하기 위해 sliding window 기법을 활용할 수 있다.
특히 예제 1번의 관찰처럼, 일련의 원소들에서 조건에 따라 원소가 추가되거나 제거할 때의 속성을 관리할 수 있기 때문에 배열을 관찰하기 위해서 `sliding window` 기법을 사용한다.

이제 `sliding window` 에서 원소가 추가되거나 삭제될 때, `nice` 속성을 판단해야 한다.
bitwise AND 연산에서는 **해당 숫자들이 어떤 비트라도 겹치지 않아야 0이라는 결과가 나온다.**
따라서 `sliding window` 내부에서 **현재 원소들이 어떤 비트를 가지고 있는지** 에 대한 결과를 저장할 수 있다.
현재 비트들의 상태와 새로운 원소의 비트를 `and` 했을 때, 0이 나오면 `nice` 한 배열이고, 그렇지 않다면 **새로운 원소를 반영할 수 있을 때까지 (연속성이 깨지므로) window 를 축소한다.**

따라서 비트 마스크 업데이트 방법을 정리하면

- 새 원소 추가: `bitmask |= nums[windowEnd]` (OR 연산으로 비트 추가)
- 원소 제거: `bitmask ^= nums[windowStart]` (XOR 연산으로 비트 제거)
 로 정리할 수 있다.

이러한 방법이 가능한 이유는 **window 자체는 `nice` 속성을 가지기 때문이다.** 따라서 **window 내 어떤 두 숫자도 같은 비트 위치에 1을 가질 수 없기 때문에, 각 비트 위치는 최대 하나의 숫자에 의해서만 설정된다.**

### 시간 복잡도

- sliding window 를 통해 배열을 탐색할 때 `O(n)`의 시간복잡도가 소요된다.
- bitwise 연산은 `O(1)` 의 시간복잡도를 가진다.

따라서 총 시간 복잡도는 `O(n)` 이다.

## 구현

```java
class Solution {
    public int longestNiceSubarray(int[] nums) {
        // representing all bits that are set in the current window
        int bitmask = 0; 
        int windowStart = 0;
        int maxLength = 0;

        for (int windowEnd = 0; windowEnd < nums.length; ++windowEnd){ 
            // shrink window (not "nice")
            while ((bitmask & nums[windowEnd]) != 0) {
                bitmask ^= nums[windowStart]; 
                windowStart++;
            }

            // expand window 
            bitmask |= nums[windowEnd];
            
            maxLength = Math.max(maxLength, windowEnd - windowStart + 1);
        }

        return maxLength;
    }
}
```

- `bitmask`  : 현재 윈도우 내 모든 숫자들의 비트 상태를 저장한다.
- `windowStart`와 `windowEnd` 를 통해 슬라이딩 윈도우의 경계를 관리한다.
- 새 원소 (`nums[windowEnd]`)가 현재 `bitmask`와 `AND` 했을 때 `0` 이 아니면 **충돌이 없어질 때 까지 왼쪽에서 원소를 제거한다.**
