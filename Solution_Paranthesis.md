// =========================
// JavaScript
// =========================
function solution(s) {
    const stack = [];
    const map = { ')': '(', '}': '{', ']': '[' };
    for (const ch of s) {
        if (ch in map) {
            if (stack.pop() !== map[ch]) return false;
        } else {
            stack.push(ch);
        }
    }
    return stack.length === 0;
}

// =========================
// TypeScript
// =========================
function solutionTS(s: string): boolean {
    const stack: string[] = [];
    const map: Record<string, string> = { ')': '(', '}': '{', ']': '[' };
    for (const ch of s) {
        if (map[ch]) {
            if (stack.pop() !== map[ch]) return false;
        } else {
            stack.push(ch);
        }
    }
    return stack.length === 0;
}

// =========================
// Python
// =========================
def solution(s):
    stack = []
    pairs = {')': '(', '}': '{', ']': '['}
    for ch in s:
        if ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
        else:
            stack.append(ch)
    return not stack

# =========================
# Java
# =========================
import java.util.*;

class Solution {
    public boolean solution(String s) {
        Stack<Character> stack = new Stack<>();
        Map<Character, Character> map = Map.of(')', '(', '}', '{', ']', '[');
        for (char ch : s.toCharArray()) {
            if (map.containsKey(ch)) {
                if (stack.isEmpty() || stack.pop() != map.get(ch)) return false;
            } else {
                stack.push(ch);
            }
        }
        return stack.isEmpty();
    }
}

// =========================
// C++
// =========================
#include <stack>
#include <unordered_map>
#include <string>
using namespace std;

class Solution {
public:
    bool solution(string s) {
        stack<char> st;
        unordered_map<char, char> map = {{')', '('}, {'}', '{'}, {']', '['}};
        for (char ch : s) {
            if (map.count(ch)) {
                if (st.empty() || st.top() != map[ch]) return false;
                st.pop();
            } else {
                st.push(ch);
            }
        }
        return st.empty();
    }
};

// =========================
// C
// =========================
#include <stdbool.h>
#include <string.h>

bool solution(char *s) {
    char stack[10000];
    int top = -1;
    for (int i = 0; s[i]; i++) {
        char c = s[i];
        if (c == '(' || c == '{' || c == '[') stack[++top] = c;
        else if (top == -1) return false;
        else if ((c == ')' && stack[top] != '(') ||
                 (c == '}' && stack[top] != '{') ||
                 (c == ']' && stack[top] != '['))
            return false;
        else top--;
    }
    return top == -1;
}

// =========================
// Go
// =========================
func solution(s string) bool {
    stack := []rune{}
    pairs := map[rune]rune{')': '(', '}': '{', ']': '['}
    for _, ch := range s {
        if val, ok := pairs[ch]; ok {
            if len(stack) == 0 || stack[len(stack)-1] != val {
                return false
            }
            stack = stack[:len(stack)-1]
        } else {
            stack = append(stack, ch)
        }
    }
    return len(stack) == 0
}

// =========================
// Rust
// =========================
use std::collections::HashMap;

fn solution(s: String) -> bool {
    let mut stack = Vec::new();
    let map = HashMap::from([(')', '('), ('}', '{'), (']', '[')]);
    for ch in s.chars() {
        if let Some(&open) = map.get(&ch) {
            if stack.pop() != Some(open) {
                return false;
            }
        } else {
            stack.push(ch);
        }
    }
    stack.is_empty()
}

// =========================
// Ruby
// =========================
def solution(s)
  stack = []
  pairs = {')' => '(', '}' => '{', ']' => '['}
  s.each_char do |ch|
    if pairs[ch]
      return false if stack.pop != pairs[ch]
    else
      stack.push(ch)
    end
  end
  stack.empty?
end

# =========================
# PHP
# =========================
<?php
function solution($s) {
    $stack = [];
    $map = [')' => '(', '}' => '{', ']' => '['];
    $chars = str_split($s);
    foreach ($chars as $ch) {
        if (isset($map[$ch])) {
            if (empty($stack) || array_pop($stack) !== $map[$ch]) {
                return false;
            }
        } else {
            $stack[] = $ch;
        }
    }
    return empty($stack);
}
?>
