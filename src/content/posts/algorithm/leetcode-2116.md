---
title: "[LeetCode] Find All Possible Recipes from Given Supplies"
published: 2025-03-21
description: 의존성을 가지는 형태의 그래프를 탐색할 때, 위상 정렬을 이용할 수 있다.
tags: ["Algorithm", "Topological Sort", "Graph", "Dependency Graph"]
category: Problem Solving
draft: false
---

## 문제 소개

:::note[문제 링크 (2025년 3월 21일 Daily Problem)]
<https://leetcode.com/problems/find-all-possible-recipes-from-given-supplies/description/?envType=daily-question&envId=2025-03-21>
:::

### 문제 설명 및 요구사항

**given**

- `String` 형태의 배열 `recipes` 가 주어질 때, 이에 대응하는 2D `String` 배열 `ingredients` 가 주어진다.
  - 따라서 `recipes[i]` 의 `ingredient` 는 `ingreditens[i]` 를 의미한다.
  - 어떤 `recipes[i]` 를 만들기 위해서는 `ingredients[i]` 에 있는 모든 원소를 가지고 있어야 한다.
  - `ingredients` 에 또 다른 `recipe` 가 포함될 수도 있다.
- 처음으로 가지고 있는 ingredients 는 `supplies` 배열로 표현된다.

**todo**

- 각 정보를 통해 만들 수 있는 `recipes` 는 어떤게 있는가?

### 입/출력 예시 분석

:::note[예제 1번]

- **Input:** `recipes = ["bread"]`, `ingredients = [["yeast","flour"]]`, `supplies = ["yeast","flour","corn"]`
- **Output:** `["bread"]`

:::

처음 가지고 있는 `supplies` 를 이용해서 `bread` 를 만들 수 있다.

:::note[예제 2번]

- **Input:** `recipes = ["bread","sandwich"]`, `ingredients = [["yeast","flour"],["bread","meat"]]`, `supplies = ["yeast","flour","meat"]`
- **Output:** `["bread","sandwich"]`

:::

먼저, 처음 가지고 있는 `supplies` 를 이용해서 `recipes[0]` 인 `bread` 를 만들 수 있다.
이 후에는 `recipes[0]` 과 `supplies` 를 이용해서 `recipes[1]` 인 `sandwich` 를 만들 수 있다.

:::note[예제 3번]

- **Input:** `recipes = ["bread","sandwich","burger"]`, `ingredients = [["yeast","flour"],["bread","meat"],["sandwich","meat","bread"]]`, `supplies = ["yeast","flour","meat"]`
- **Output:** `["bread","sandwich","burger"]`

:::

먼저, 처음 가지고 있는 `supplies` 를 이용해서 `bread (recipes[0])` 를 만들 수 있다.
이 후, `bread (recipes[0])` 와 `supplies` 를 이용해서 `sandwich (recipes[1])` 를 만들 수 있다.
이 후, `bread (recipes[0])` 와 `sandwich (recipes[1])`, `supplies` 를 이용해서 `burger (recipes[2])` 을 만들 수 있다.

### 문제의 제약 조건

- `n == recipes.length == ingredients.length`
- `1 <= n <= 100`
- `1 <= ingredients[i].length, supplies.length <= 100`
- `1 <= recipes[i].length, ingredients[i][j].length, supplies[k].length <= 10`
- `recipes[i], ingredients[i][j]`, and `supplies[k]` consist only of lowercase English letters.
- All the values of `recipes` and `supplies` combined are unique.
- Each `ingredients[i]` does not contain any duplicate values.

제약조건 자체는 매우 널널하므로 어떻게든 탐색하면 풀리긴한다!
나의 첫 접근 역시, 더 이상 만들 수 있는 레시피가 존재하지 않을 때 까지 `while` 문을 돌리는 방식으로 문제를 풀었었다.
하지만 Editorial 에 조금 더 효율적으로 푸는 방법이 있어 이를 기록하려고한다.

## 문제 이해하기

각 레시피를 만들 수 있는 조건은 다음과 같다.

- 현재 가지고 있는 `supplies` 를 통해 레시피를 만드는 경우
- 현재 가지고 있는 `supplies` 를 통해, 해당 레시피를 만들기 위한 하위 레시피를 만들 수 있는 경우

따라서 만약 brute force 를 이용해서 문제를 푼다면, 다음과 같은 형식으로 탐색하게 될 것이다.

1. 초기 `supplies` 를 통해 만들 수 있는 레시피들을 찾는다.
2. 1.에서 만들어진 레시피와 `supplies` 를 통해 만들어지는 다른 레시피들을 찾는다.
3. 더 이상 새로운 레시피가 만들어지지 않을 때까지 반복한다.

앞서 언급했듯이, 제약 사항이 널널하기 때문에 brute force 로도 문제가 풀릴 수 있다.
하지만 Editorial 에 소개된 **위상 정렬을 통해 문제를 푸는 방식** 에 대해서 생각해보자.

현재 brute force 방식의 문제점은 **더 이상 새로운 레시피가 만들어지지 않을 때 까지 레시피 배열을 돌면서 반복하는 것**이다.
따라서 **우리의 목표는 위상 정렬을 통해, 효율적인 순서로 탐색하는 것이다.**

각 레시피가 만들어지는 조건을 생각해보면 다음과 같이 생각할 수 있다.
> 한 레시피가 다른 레시피에 종속될 수 있다.
>
> → **먼저 다른 레시피가 만들어지고 나서야 그 레시피를 이용해서 만들어질 수 있는 레시피가 존재한다.**

따라서 레시피 간의 종속 관계를 방향 그래프(directed graph)로 표현함으로써 복잡한 의존성을 명확하게 처리할 수 있다. 레시피를 노드(vertex)로, 의존 관계를 간선(edge)으로 모델링하면 문제는 자연스럽게 위상 정렬 문제로 변환된다.

예를 들어, 예시 3번을 생각해본다면
![](https://i.imgur.com/aAR0Ttf.png)

어떤 recipe 를 만들기 위해서, 다른 recipe 와 종속 관계를 가진다는 것을 나타낼 수 있다. 그렇다면 위상 정렬을 위해서 그래프를 어떻게 구성할 수 있을까?

목표는 recipes 배열을 순회하면서 어떤 recipe 가 다른 recipe 에 종속되는지의 관계를 나타내는 것이다. 따라서 초기 supplies 가 현재 recipe 의 ingredents 에 포함되어 있지 않다는 것은 다른 recipe 가 필요하다는 의미로 해석할 수 있다. 따라서, 그래프 `adj[recipeIdx]` 의 정의는 `recipeIdx` 의 레시피가 영향을 주게 되는 다른 `recipe` 들로 정의할 수 있고, 위의 그림에서 반대로 edge 를 구성하면 된다.

또한 **"초기 supplies 가 현재 recipe 의 ingredents 에 포함되어 있지 않다는 것" 을 판단하기 위해서, 어떤 문자열을 내가 소유하고 있는지 아닌지 판단해야하는데, 이를 빠르게 하기 위해 `HashSet` 을 이용할 수 있다.**

### 그래프 구성하기

그래프를 구성할 때, `adj[recipeIdx]`는 '`recipeIdx` 레시피가 만들어지면 이를 재료로 사용하는 다른 레시피들의 리스트'를 의미한다. 이는 실제 레시피 제작 과정에서의 의존성 흐름과 일치한다. 예를 들어 `bread`이 만들어지면 `sandwich`를 만들 수 있게 되는 것이다.

```java
// 의존성 그래프 구성
for (int recipesIdx = 0; recipesIdx < recipes.length; recipesIdx++) {
    for (String ingredient: ingredients.get(recipesIdx)) {
        // 재료가 기본 supplies에 없고 다른 레시피인 경우
        if (!availableSupplies.contains(ingredient)) {
            if (recipesToIdx.containsKey(ingredient) && recipesToIdx.get(ingredient) != recipesIdx) {
                // 재료 레시피가 현재 레시피에 영향을 준다는 의미로 간선 추가
                adj[recipesToIdx.get(ingredient)].add(recipesIdx);
                inDegree[recipesIdx]++;
            }
        }
    }
}
```

이 코드에서 `adj[recipesToIdx.get(ingredient)].add(recipesIdx)`는 "재료 레시피가 영향을 주는 다른 레시피"를 추가하는 것이다. 이는 위상 정렬의 방향과 일치하며, **"재료 → 완성품" 방향**으로 간선을 구성한다.

### 위상 정렬

이제 위상정렬을 하는 과정을 생각해보자.
위상정렬의 칸 알고리즘에 따르면 `inDegree` 배열이 필요하다.
위에서 그래프를 구성하는 과정을 생각해보면 `inDegree[i]` 는
`i번째 레시피를 만들기 위해 더 필요한 재료 수`를 의미한다.

따라서 `inDegree` 값을 다음과 같이 해석할 수 있다.

- `inDegree[i] = 0`: 모든 필요 재료가 확보되어 레시피를 즉시 만들 수 있는 상태
- `inDegree[i] > 0`: 아직 확보되지 않은 재료가 있어 레시피를 만들 수 없는 상태

위상 정렬 과정은 다음과 같이 구현할 수 있다.

```java
// 위상 정렬 준비: 모든 재료가 갖춰진 레시피들을 큐에 넣음
Queue<Integer> readyToMake = new LinkedList<>();
for (int i = 0; i < inDegree.length; i++) {
    if (inDegree[i] == 0) {
        readyToMake.offer(i); // 즉시 만들 수 있는 레시피
    }
}

List<String> createdRecipes = new ArrayList<>();

// 위상 정렬 실행
while (!readyToMake.isEmpty()) {
    int recipeIndex = readyToMake.poll();
    String created = recipes[recipeIndex];
    createdRecipes.add(created); // 만든 레시피를 결과에 추가
    
    // 이 레시피가 완성됨으로써 영향 받는 다른 레시피들 업데이트
    for (int nextRecipeIdx : adj[recipeIndex]) {
        inDegree[nextRecipeIdx]--; // 필요한 재료가 하나 확보됨
        
        if (inDegree[nextRecipeIdx] == 0) {
            // 모든 재료가 갖춰지면 다음 만들 레시피 큐에 추가
            readyToMake.offer(nextRecipeIdx);
        }
    }
}
```

위상 정렬 과정에서 어떤 레시피가 만들어지면, 그 레시피를 재료로 사용하는 다른 레시피들의 `inDegree`를 감소시킨다. 이는 실제로 하나의 재료를 더 확보했음을 의미한다.

위상정렬의 탐색 과정에서 `indegree[i] == 0` 이 되면, 답에 포함시켜준다.

### 시간 복잡도

`recipes` 배열의 크기가 `n`이라고 하고, `supplies` 의 크기가 `s` , 각 `recipe` 당 `ingredient` 의 갯수를 `m`이라고 하자.
`HashSet` 을 구성하고, 그래프를 구성하는 과정에서 `O(n + m)` 과 `O(s)` 의 시간 복잡도가 필요하다. 따라서 그래프를 구성하는 과정에서 `O(n + m + s)` 의 시간 복잡도가 필요한다.

이제 위상 정렬의 시간 복잡도를 생각해보면, 구성한 그래프에서 각 `recipe`와 그에대한 `edge` 는 한번만 처리되기 때문에 `O(n + m)` 의 시간복잡도가 소요된다.

따라서 총 시간 복잡도는 `O(n + m + s)` 이다.

## 구현

```java
class Solution {
    public List<String> findAllRecipes(String[] recipes, List<List<String>> ingredients, String[] supplies) {
        Set<String> availableSupplies = new HashSet<>(Arrays.asList(supplies));
        Map<String, Integer> recipesToIdx = new HashMap<>();
        List<Integer>[] adj = new ArrayList[recipes.length];
        for (int recipesIdx = 0; recipesIdx < recipes.length; recipesIdx++) {
            adj[recipesIdx] = new ArrayList<>();
            recipesToIdx.put(recipes[recipesIdx], recipesIdx);
        }

        int[] inDegree = new int[recipes.length];
        
        // make dependency graph
        for (int recipesIdx = 0; recipesIdx < recipes.length; recipesIdx++) {
            for (String ingredient: ingredients.get(recipesIdx)) {
                // 재료에 다른 레시피가 포함되어 있음
                if (!availableSupplies.contains(ingredient)) {
                    if (recipesToIdx.containsKey(ingredient) && recipesToIdx.get(ingredient) != recipesIdx) {
                        adj[recipesToIdx.get(ingredient)].add(recipesIdx);
                    }
                    inDegree[recipesIdx]++;
                }
            }
        }

        List<String> createdRecipes = new ArrayList<>();
        
        // 위상정렬
        Queue<Integer> q = new LinkedList<>();
        for (int i = 0; i < inDegree.length; i++) {
            if (inDegree[i] == 0) {
                q.offer(i);
            }
        }

        while (!q.isEmpty()) { // inDegree == 0 => 만들어졌음을 의미 
            int recipeIndex = q.poll();
            String created = recipes[recipeIndex];
            createdRecipes.add(created);
            
            // 해당 recipe 가 사용되는 다른 레시피의 inDegree를 줄여주자
            for (int nextIdx: adj[recipeIndex]) {
                inDegree[nextIdx]--;

                if (inDegree[nextIdx] == 0) {
                    q.offer(nextIdx);
                }
            }
        }

        return createdRecipes;
    }
}
```

## 참고 자료
