# 包、Crates与模块

层级关系一句话：Package ⊃ Crate（1 个可选 lib + N 个 bin） ⊃ Module 树(类似于C++的namespace) ⊃ 具体项（fn/struct/enum/trait/const）。

| Rust 概念          | Java 类比                                           | Go 类比                             | 关键差异                                                               |
| ------------------ | --------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------- |
| Package（包）      | Maven/Gradle 项目                                   | Go module（go.mod）                 | 由 `Cargo.toml` 定义，是 Cargo 构建/发布的单位                         |
| Crate              | 一个 jar / 编译产物                                 | 近似 Go package（编译单元）         | **编译器的最小编译单元**；分 binary crate（有 `main`）和 library crate |
| Module（`mod`）    | Java package                                        | Go 中无直接对应（package 内无嵌套） | **必须显式声明，不由目录结构自动推导**                                 |
| `use`              | `import`                                            | `import`                            | 只是创建"名字捷径"，不引入编译单元                                     |
| `pub`              | `public`                                            | 首字母大写导出                      | 默认私有，且**可见性是相对父模块的**，不是全局的                       |
| `crate::` 路径前缀 | 无                                                  | 无（Go 用 module path）             | 类似文件系统的 `/`，绝对路径起点                                       |
| `super::`          | 无                                                  | 无                                  | 类似 `..`，引用父模块                                                  |
| `pub use` 重导出   | 无好的对应（Java 9 `requires transitive` 勉强沾边） | 无                                  | 设计公共 API 门面的核心手段                                            |
| `as` 别名          | 无（Java import 不能改名）                          | `import alias "path"`               | 解决同名冲突                                                           |

## 包和Crate

要点：

- Crate 是编译器一次处理的最小代码单位；分两种：
  - **Binary crate**：有 `main` 函数，编译为可执行文件
  - **Library crate**：无 `main`，供复用。日常说的 "crate" 通常指库（对应其他语言的 library）
- 一个 package：**最多 1 个 library crate + 任意多个 binary crate**，至少要有 1 个 crate
- Cargo 的**约定优于配置**（你会觉得很熟悉，像 Maven 的标准目录布局）：
  - `src/main.rs` → 与包同名的 binary crate 的 crate 根
  - `src/lib.rs` → 与包同名的 library crate 的 crate 根
  - `src/bin/*.rs` → 每个文件是一个独立的 binary crate
  - 这些都**不需要**在 `Cargo.toml` 中声明(不能配置)

## 定义模块

### 官方 Cheat Sheet

1. 编译从 **crate 根**开始（`src/lib.rs` 或 `src/main.rs`）
2. 声明模块用 `mod garden;`，编译器按顺序查找代码：
   - 内联：`mod garden { ... }`
   - 文件：`src/garden.rs`
   - 文件：`src/garden/mod.rs`（旧风格）
3. 子模块在**父模块的同名目录**下：`src/garden.rs` 中的 `mod vegetables;` → `src/garden/vegetables.rs`
4. 引用路径形如 `crate::garden::vegetables::Asparagus`
5. **默认对父模块私有**（但对兄弟模块可见）。一句话总结：任何不加 pub 的项（包括 mod 本身），在声明它的那个模块内部可见——"内部"包括该模块的所有后代模块。
6. `use` 创建捷径以缩短路径（和c++、java类似，否则就用全限定名）

### ⚠️ 模块必须显式声明

光有 `src/foo.rs` 文件什么都不是**。必须在父模块（或 crate 根）写 `mod foo;`，这个文件才会被纳入编译。新手最常见的困惑"我文件写好了为什么找不到"根源就在这。

### 其他要点

- 整个模块树植根于隐式的 `crate` 模块下（类比文件系统根 `/`）
- 模块可嵌套任意深（Java package 名义上也嵌套但语义上是平的；Rust 的嵌套有真实的父子可见性语义）

## 路径与可见性

### 路径两种形式

- **绝对路径**：`crate::front_of_house::hosting::add_to_waitlist()`（本 crate 用 `crate` 开头；外部 crate 用其名字开头）
- **相对路径**：从当前模块开始，或用 `self::` / `super::`
- 书中建议**倾向绝对路径**：定义和调用方各自移动时更少改动
- 分隔符是 `::`（不是 `.` 或 `/`）

### 可见性规则（重点比对）

| 规则         | Rust                                     | Java                | Go                   |
| ------------ | ---------------------------------------- | ------------------- | -------------------- |
| 默认可见性   | **对父模块私有**(兄弟和模块内部公有)     | package-private     | 小写=包内私有        |
| 公开方式     | 逐项加 `pub`                             | `public` 等修饰符   | 首字母大写           |
| 可见性方向   | **子可看父的所有项，父不可看子的私有项** | 无层级概念          | 无层级概念           |
| `pub` 的含义 | 只是"允许父模块访问"，**不是全局公开**   | `public` 即全局可见 | 导出即 module 外可见 |

```rust
mod front_of_house {

    pub mod hosting {
        pub fn add_to_waitlist() {
            // ✅ 兄弟可见
            seat_at_table()
            // ✅ super表示父mod
            super::hosting::seat_at_table();
        }

        fn seat_at_table() {}
    }

    mod serving {
        fn take_order() {
            // ❌ hosting对兄弟mod：serving可见，但seat_at_table不可见
            // crate::front_of_house::hosting::seat_at_table();
        }

        fn serve_order() {}

        fn take_payment() {}
    }
}

pub fn eat_at_restaurant() {
    // 虽然 front_of_house 模块不是公有的，不过因为 eat_at_restaurant 函数与 front_of_house 定义于同一级模块中（即，eat_at_restaurant 和 front_of_house 是兄弟），我们可以从 eat_at_restaurant 中引用 front_of_house

    // 绝对路径
    // crate 自身内部永远用关键字 crate:: 引用自己，不用真名（包名）
    crate::front_of_house::hosting::add_to_waitlist();
    // 相对路径
    front_of_house::hosting::add_to_waitlist();
    // self表示当前mod
    self::front_of_house::hosting::add_to_waitlist();
}
```

关于API设计可参考： [The Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)。

关键推论：

- `pub mod hosting` 只让 `hosting` 模块本身可被引用，**其内容仍私有**，内部的函数还要各自 `pub`——公开是逐层、逐项的
- 一个项要真正对 crate 外可见，**从 crate 根到它的整条路径都得是 `pub`**（或通过 `pub use` 重导出）。这更接近 Java 9 模块系统的 `exports`，而不是传统的 `public`

### ⚠️ struct 与 enum 的不对称（容易记错）

- `pub struct`：结构体公有，**字段依然默认私有**，需逐字段 `pub`
  - 有私有字段的公有 struct 必须提供公有关联函数（类似java里的静态方法），否则外部根本创建不了实例——天然强制了 Java 里"私有字段 + 工厂/构造器"的封装风格
- `pub enum`：**所有变体自动公有**（否则枚举没法用）

## `use` 关键字

### 基本语义

- `use` ≈ 创建符号链接/软链接，只是把名字引入**当前作用域**，同样受私有性检查
- ⚠️ **作用域限定**：`use` 只在其所在作用域生效。crate 根写的 `use`，在子 `mod customer { }` 里**不可用**（Java 的 import 是整个文件生效，这点不同）。解决：在子模块内重新 `use`，或用 `super::`

### 习惯与约定

- **函数**：习惯上引入其**父模块**，可以一眼看出这不是本地函数
- **struct/enum/trait 等类型**：引入**完整路径**，直接写对应名
- 同名冲突两种解法：
  1. 保留父模块前缀：`fmt::Result` vs `io::Result<()>`
  2. `as` 重命名：`use std::io::Result as IoResult;`（Go 程序员：就是 import alias）

### `pub use` 重导出 ⭐（类似ES6的module重导出）

- `use` 引入的名字默认对外私有；`pub use` 使外部也能通过**新路径**访问
- 用途：**内部组织结构与对外 API 结构解耦**。内部按 `front_of_house::hosting` 组织，对外暴露成 `restaurant::hosting`
- 这是 Rust 库设计公共 API 门面（facade）的标准手法，读第三方 crate 源码时经常会看到 `lib.rs` 里一堆 `pub use`

### 外部依赖

- `Cargo.toml` 的 `[dependencies]` 加 `rand = "0.9.3"` → `use rand::Rng;`（类比 Maven 依赖 + import）
- `std` 也是外部 crate，只是随语言分发、无需声明依赖，但仍要 `use std::collections::HashMap;`

### 语法糖

```rust
use std::{cmp::Ordering, io};   // 嵌套路径合并多行 use
use std::io::{self, Write};     // self 表示引入 std::io 本身
use std::collections::*;        // glob，慎用（同 Java 的 import *）
```

- glob 主要合法场景：测试模块 `tests`、prelude 模式

## 拆分文件

- 两种文件风格（不可对同一模块混用）：
  - 新风格：`src/foo.rs` + `src/foo/bar.rs` ✅ 推荐
  - 旧风格：`src/foo/mod.rs`（缺点：编辑器里开一堆 mod.rs 分不清）
- ⚠️ **`mod` 不是 include/`#include`**：整个模块树中每个文件只用 `mod` 声明一次，其他地方一律用路径引用。移动代码到独立文件后，模块树不变，调用方代码零改动
- `use` 与文件加载无关，它不决定编译哪些文件

## 最佳实践（书中穿插提到，容易漏看）

- **main.rs 薄、lib.rs 厚**：同时有 binary + library 时，逻辑放 lib.rs，main.rs 只做启动胶水，并且像外部用户一样**只调用 lib 的 public API**——强制你吃自己的狗粮（dogfooding）
- 库的公有 API 是与用户的契约，参考 [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- 超大项目多包管理用 Cargo **workspaces**（第 14 章，类比 Maven 多模块 / Go workspace）

## Java/Go 程序员避坑清单（TL;DR）

1. ❌ 目录结构 ≠ 模块结构。**必须 `mod xxx;` 显式声明**，这是与 Java/Go 最根本的差异
2. ❌ `pub` ≠ Java 的 `public`。它只对父模块开放；对外可见要求整条路径可达
3. ❌ `pub struct` 的字段不会自动公开；`pub enum` 的变体会
4. ❌ `use` 不是全文件生效，子模块里要重新引入
5. ❌ `mod` 不是 include，每个模块全树只声明一次
6. ✅ 函数 use 到父模块、类型 use 全路径——遵守惯用法
7. ✅ 设计库时善用 `pub use` 做 API 门面，内外结构解耦
8. ✅ 私有性方向：子能看父，父不能看子的私有项——利用它做"实现细节下沉到子模块"
