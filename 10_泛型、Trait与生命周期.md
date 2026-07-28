# 泛型、Trait 与生命周期

一句话总结:三者都是**编译期机制**——泛型消除代码重复(单态化,零运行时开销)、trait 约束"泛型类型能做什么"(≈ 接口,但默认静态分发)、生命周期约束"引用能活多久"(GC 语言从不用操心的事,Rust 让编译器替你证明)。生命周期本质上也是一种泛型参数。

## 泛型

### 语法速览

```rust
fn largest<T: PartialOrd>(list: &[T]) -> &T { ... }   // 函数:名字后声明 <T>

struct Point<T> { x: T, y: T }          // 单参数:x、y 必须同类型
struct Point2<T, U> { x: T, y: U }      // 想混类型就得两个参数

enum Option<T> { Some(T), None }        // 枚举泛型:天天在用的就是
enum Result<T, E> { Ok(T), Err(E) }

impl<T> Point<T> {                      // impl 后的 <T> 是声明:告诉编译器这是泛型参数
    fn x(&self) -> &T { &self.x }
}
```

- ⚠️ `largest` 不加 bound 写 `item > largest` 编译不过:**泛型 `T` 默认没有任何能力**,要比较就得 `T: PartialOrd`。对照 Java 的 `<T extends Comparable<T>>`,思路一样;差别是 Java 的 T 至少还是 Object(有 equals/toString),Rust 的 T 是完全的白纸,连 `==`、打印、复制都要逐个声明
- 只为具体类型实现方法(Java 类型擦除后做不到,Go 也没有):

```rust
impl Point<f32> {
    fn distance_from_origin(&self) -> f32 { ... }   // 只有 Point<f32> 有这个方法
}
```

- 方法可以有独立于结构体的泛型参数:

```rust
impl<X1, Y1> Point2<X1, Y1> {
    fn mixup<X2, Y2>(self, other: Point2<X2, Y2>) -> Point2<X1, Y2> { ... }
}
```

### ⭐ 单态化:与 Java/Go 泛型的本质差异

| 维度         | Rust                             | Java                              | Go                                  |
| ------------ | -------------------------------- | --------------------------------- | ----------------------------------- |
| 实现机制     | **单态化**:每个具体类型生成一份专用代码 | **类型擦除**:运行时全是 Object | 部分单态化(按 GC shape + 字典)    |
| 运行时开销   | 零                               | 装箱拆箱、强制转换                | 少量字典传递                        |
| 原始类型     | `Vec<i32>` 直接支持              | `List<int>` ❌ 必须 `Integer` 装箱 | `[]int` 支持                        |
| 代价         | 编译慢、二进制大                 | 运行时开销                        | 两头折中                            |

- 单态化 = 编译器把 `Option<i32>`、`Option<f64>` 展开成两个具体类型,和你手写重复代码**性能完全一致**——这就是"零成本抽象"的含义
- 类比 C++ 模板,但 trait bound 让报错发生在**定义处**而非实例化处(没有 C++ 那种十屏模板报错)

## Trait:定义共同行为

### 定义与实现

```rust
pub trait Summary {
    fn summarize(&self) -> String;                  // 只有签名:实现者必须提供
    fn preview(&self) -> String {                   // 默认实现:实现者可覆盖
        String::from("(Read more...)")
    }
}

impl Summary for NewsArticle {
    fn summarize(&self) -> String {
        format!("{}, by {}", self.headline, self.author)
    }
}
```

| 维度               | Rust trait                       | Java interface           | Go interface               |
| ------------------ | -------------------------------- | ------------------------ | -------------------------- |
| 实现方式           | 显式 `impl Trait for Type`       | 显式 `implements`        | **隐式**(方法齐了就算)   |
| 给别人的类型实现   | ✅(受孤儿规则限制)             | ❌ 只能改类定义自身      | ❌ 方法必须定义在类型所在包 |
| 默认实现           | ✅                               | ✅(Java 8+ default)    | ❌                         |
| 泛型参数的分发方式 | **静态**(编译期单态化)        | 动态(虚方法表)         | 动态(itab)               |

- ⭐ 关键能力:trait 实现与类型定义**可以分离**——能给外部类型实现自己的 trait(比如 `impl Summary for Vec<i32>`)。Java 得写包装类,Go 得定义新类型,Rust 直接写
- Go 程序员注意:这里是**显式声明**,不是 duck typing——"长得像"不算数,必须写 `impl`
- 默认实现可以调用同 trait 里其他方法(包括没有默认实现的)——模板方法模式白送;⚠️ 但覆盖之后无法再调用被覆盖的默认版本

### ⚠️ 孤儿规则(orphan rule)

`impl Trait for Type` 要求 **trait 或 Type 至少有一个定义在当前 crate**:

- ✅ 给自己的类型实现外部 trait(`impl Display for Post`)
- ✅ 给外部类型实现自己的 trait(`impl Summary for Vec<i32>`)
- ❌ 给外部类型实现外部 trait(`impl Display for Vec<i32>`)

目的:保证不会有两个 crate 给同一类型实现同一 trait,导致链接时打架(相干性/coherence)。真需要时用 newtype 包一层绕过(后续章节)。

### trait 作为参数:两种写法

```rust
pub fn notify(item: &impl Summary) { ... }      // impl Trait 语法糖:简洁
pub fn notify<T: Summary>(item: &T) { ... }     // trait bound 完整形式:更灵活
```

- ⚠️ 看着像 Java 的 `void notify(Summary item)`,本质完全不同:这是**泛型 + 静态分发**,编译期为每个实际类型生成专用版本,没有虚表开销;Java/Go 的接口参数永远是动态分发。Rust 里动态分发要显式写 `&dyn Trait`(第 18 章)
- 微妙差别:两个参数都写 `&impl Summary` → 允许两个**不同**类型;`<T: Summary>(a: &T, b: &T)` → 强制**同一**类型
- 多重约束用 `+`:`T: Summary + Display`
- 约束一多,用 `where` 从句让签名保持可读:

```rust
fn some_function<T, U>(t: &T, u: &U) -> i32
where
    T: Display + Clone,
    U: Clone + Debug,
{ ... }
```

### 返回 impl Trait

```rust
fn returns_summarizable() -> impl Summary {
    SocialPost { ... }      // 调用者只知道"某个实现了 Summary 的东西"
}
```

- 主要用途:闭包、迭代器这类**写不出名字**的类型(第 13 章离不开它)
- ⚠️ 只能返回**一种**具体类型:if/else 分支返回 `NewsArticle` 或 `SocialPost` 编译不过——`impl Trait` 是编译期确定的单一类型,不是运行时多态;真要多类型得用 trait 对象(第 18 章)

### 条件实现与 blanket implementation ⭐

```rust
impl<T: Display + PartialOrd> Pair<T> {
    fn cmp_display(&self) { ... }     // 仅当 T 满足两个 bound 时,Pair<T> 才有此方法
}

// 标准库真实代码:给所有实现了 Display 的类型统一实现 ToString
impl<T: Display> ToString for T { ... }
```

- 条件方法:同一个泛型结构体,能力随 T 的能力伸缩——Java/Go 没有对应物(Java 只能运行时 instanceof)
- **blanket impl**:`3.to_string()` 能用,就是因为 `i32: Display` 自动获得了 `ToString`。标准库大量使用,读文档看到 "Implementors" 里一堆奇怪条目就是它

## 生命周期:引用的有效性约束

### 为什么 Java/Go 没有这个概念

- Java/Go:GC 保证"只要还有引用指着,数据就不死"——悬垂引用不存在,代价是运行时开销
- Rust:数据随所有者离开作用域**立即释放**,那么编译器必须**证明每个引用被使用时数据还活着**,证不出来就拒绝编译。这个证明器就是借用检查器,生命周期就是给它的辅助标注

```rust
let r;
{
    let x = 5;
    r = &x;           // ❌ 借用的数据活不过借用本身
}
println!("{r}");      // r 被使用时 x 早已释放
```

### 函数签名中的泛型生命周期

返回引用时,编译器得知道返回值和哪个参数的存活期挂钩。返回值可能来自 `x` 也可能来自 `y` 时,不标注就无法检查:

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```

- 语法:`'a` 挂在 `&` 后面——`&i32` / `&'a i32` / `&'a mut i32`;像泛型一样先在 `<'a>` 里声明
- 读法:"存在某段作用域 `'a`,x、y 都至少活这么久,返回值保证在 `'a` 内有效"。实际效果:**返回值的有效期 = 两个参数中较短的那个**
- ⚠️ 最重要的一点:生命周期注解**不改变任何值的实际存活时间**——它只是**描述关系**给编译器检查,和泛型约束类型一个道理,纯编译期,零运行时开销。写 `'a` 不是"让它活久一点",这是新手最常见的误解

```rust
let string1 = String::from("long string is long");
let result;
{
    let string2 = String::from("xyz");
    result = longest(string1.as_str(), string2.as_str());
}
println!("{result}");   // ❌ result 的有效期被压到 string2 的作用域内
```

- 返回值只可能来自其中一个参数时,只标那一个:`fn longest<'a>(x: &'a str, y: &str) -> &'a str`
- ⚠️ 返回的引用必须来自某个参数;返回函数内部创建值的引用必然悬垂,编译不过——这种情况正确做法是**返回所有权**(`String` 而不是 `&str`)

### 结构体中的生命周期

```rust
struct ImportantExcerpt<'a> {
    part: &'a str,      // 存引用的结构体,必须声明生命周期
}
```

- 含义:`ImportantExcerpt` 实例**不能活得比 `part` 指向的数据久**
- Java/Go 里对象持有引用天经地义,GC 兜底;Rust 里结构体存引用就必须显式声明这层依赖。这也是为什么**新手期结构体字段默认用所有权类型**(`String` 而非 `&str`)是省心的选择——确实需要借用再引入生命周期

### 生命周期省略规则 ⭐(为什么平时很少手写)

早期 Rust 全部要手写,后来官方把可确定的推断模式固化进编译器,成为三条**省略规则**:

1. 每个引用参数各自获得一个独立的生命周期参数
2. 如果只有**一个输入**生命周期,它被赋给所有输出
3. 方法中如果有 `&self`,**self 的生命周期**被赋给所有输出

```rust
fn first_word(s: &str) -> &str          // 规则 1+2 → fn first_word<'a>(s: &'a str) -> &'a str
fn longest(x: &str, y: &str) -> &str    // ❌ 两个输入,规则 2、3 都套不上 → 必须手写
```

- 三条规则走完仍定不下来就报错,要求显式标注——编译器**从不瞎猜**
- 所以:需要手写 `'a` 的地方,恰恰是"关系真的有歧义"的地方,不是语法负担

### 方法中的生命周期与 `'static`

```rust
impl<'a> ImportantExcerpt<'a> {
    fn announce_and_return_part(&self, announcement: &str) -> &str {
        println!("Attention! {announcement}");
        self.part       // 规则 3:返回值自动跟 self 的生命周期,无需标注
    }
}
```

- `'static`:整个程序运行期间都有效。字符串字面值都是 `&'static str`(数据直接编在二进制里)
- ⚠️ 编译器报错时经常"建议"加 `'static`——**大多数时候是错误的修法**。先想清楚:这个引用真该活一辈子吗?通常真正的问题是引用关系没理顺或该用所有权,类比 Java 里靠改 static 全局变量来"修" NPE 的邪路

### 三合一综合示例

```rust
use std::fmt::Display;

fn longest_with_an_announcement<'a, T>(x: &'a str, y: &'a str, ann: T) -> &'a str
where
    T: Display,
{
    println!("Announcement! {ann}");
    if x.len() > y.len() { x } else { y }
}
```

- 生命周期也是泛型的一种,所以 `'a` 和 `T` 一起放在 `<>` 里,惯例 `'a` 在前

## Java/Go 程序员避坑清单(TL;DR)

1. ✅ Rust 泛型是**单态化**(像 C++ 模板),不是 Java 的类型擦除——零运行时开销,代价是编译时间和二进制体积
2. ❌ 泛型函数体里不能对 `T` 随便比较、打印、复制——**T 默认没有任何能力**,要什么能力加什么 bound
3. ❌ trait 不是 duck typing:必须显式 `impl`,Go 的"方法齐了就算实现"在这不成立
4. ✅ 能给外部类型实现自己的 trait(孤儿规则:trait 和类型至少一个是本地的),Java/Go 都做不到
5. ⚠️ `&impl Trait` 参数是**静态分发**的泛型,不是 Java/Go 接口那种动态分发;动态分发要显式 `&dyn Trait`
6. ❌ 返回 `impl Trait` 只能是一种具体类型,分支返回不同类型编译不过
7. ✅ 生命周期注解**只描述关系,不延长寿命**;相关报错不是"语法没写对"而是"引用关系真的有问题"
8. ✅ 三条省略规则覆盖了绝大多数场景;必须手写的地方恰恰是编译器真推断不出的地方
9. ❌ 编译器建议加 `'static` 时别无脑照做,通常正解是理顺引用来源或改用所有权
10. ✅ 结构体字段新手期默认存所有权类型(`String`/`Vec`),确实需要借用再上生命周期
