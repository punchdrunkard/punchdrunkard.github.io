---

title: "[LeetCode] 790. Domino and Tromino Tiling"
published: 2025-05-05
description: Dynamic Programming, 타일의 유형에 따라 관찰하기
tags: ["Algorithm", "Dynamic Programming", "LeetCode"]
category: Problem Solving
draft: false
---  

## 문제

:::note[문제 링크 (2025년 5월 5일 Daily Problem)]

<https://leetcode.com/problems/domino-and-tromino-tiling/description/?envType=daily-question&envId=2025-05-05>

:::

## 풀이

우선 `dp[i]` 를 `2 * i` 크기의 보드를 채우는 경우의 수라고 가정한다.

전체 문제를 부분 문제로 나누기 위해, 타일링의 마지막 부분이 어떻게 이루어지는지 생각해보자.

먼저, 도미노로 끝나는 경우의 수가 있을 것이다. 이 중, 도미노를 세로 모양으로 두었을 때는 현재 도미노를 두고 (`1`), 이전의 `2 * (n - 1)` 보드를 채우는 경우의 수와 같으므로 `dp[i - 1]` 의 경우의 수가 생긴다.

![Image](https://github.com/user-attachments/assets/fe661afe-27bf-4333-a69c-a382418717c0)

그리고 도미노를 가로 모양으로 두어서 끝낸다면 `2 * i` 꼴의 타일을 채우기 위해, 아래와 같이 두 개의 가로 모양 도미노를 사용해야 한다. 그리고 마찬가지로 해당 모양의 도미노를 두고, 이전의 `(n - 2) * 2` 의 보드를 채우는 경우의 수와 같으므로 이 경우 전체 경우의 수는 `dp[n - 2]` 이다.

![Image](https://github.com/user-attachments/assets/17ab8e49-ef1a-4af1-a574-baa3414024b3)

이제 Tromino 로 끝나는 경우를 생각해보자. 위의 논의와 마찬가지로 Tromino 는 회전에 따라 다른 타일링으로 취급된다. Tromino 로 끝나는 경우의 수들을 그려보면 다음과 같다.

- `n = 3` 인 경우,

![Image](https://github.com/user-attachments/assets/4c90c136-77ba-4de3-8be3-aaf4aa50e6d9)

- `n = 4` 인 경우

![Image](https://github.com/user-attachments/assets/097a32a8-11c9-4ff2-b858-66988bdbc94c)

- `n = 5` 인 경우

![Image](https://github.com/user-attachments/assets/68dcdca0-34ae-4970-9b7e-50fc324fa16e)

- `n = 6` 인 경우

![Image](https://github.com/user-attachments/assets/2d864b7f-d083-4521-bf83-eb20c45d9e20)
정리하자면, 각 `n` 에 따라 `Trimino` 로 끝나는 경우의 수가 2개씩 생긴다.

이를 통해 점화식을 도출해보면 다음과 같다.

![Image](https://github.com/user-attachments/assets/daaa9571-4043-4ae4-b842-c493ce2e8226)
그리고 `dp[n]` 에 `dp[n - 1]` 을 빼서 정리하면 다음과 같다.

![Image](https://github.com/user-attachments/assets/f427f92d-650f-4899-bf6b-4b1e07da1106)

따라서 `dp[n] = 2 * dp[n - 1] + dp[n - 3]` 이라는 식을 만들어 낼 수 있다.

## 구현 코드

```java
class Solution {
    final int MOD = 1_000_000_007;

    public int numTilings(int n) {
        if (n <= 2) {
            return n;  // Base cases: dp[1]=1, dp[2]=2
        }
        
        long[] dp = new long[n + 1];
        dp[0] = 1;  // Empty board has 1 way to tile (do nothing)
        dp[1] = 1;  // 2x1 board has 1 way (single domino)
        dp[2] = 2;  // 2x2 board has 2 ways (2 vertical or 2 horizontal dominos)
        
        for (int i = 3; i <= n; i++) {
            dp[i] = (2 * dp[i - 1] + dp[i - 3]) % MOD;
        }
        
        return (int) dp[n] % MOD;
    }
}
```
