---
title: Python 第十课：面向对象 OOP 入门——用代码模拟现实世界
date: 2023-04-15 10:00:00
tags:
  - Python
categories: [Python 教程]
abbrlink: "62523c89"
---
核心速览
表格
概念	本质	生活类比
类（Class）	图纸 / 模具	汽车的设计图纸
对象（Object）	按图纸造出来的实物	按图纸造出来的某一辆具体的车
属性	对象的特征 / 数据	车的品牌、颜色、速度
方法	对象的行为 / 功能	车能开、能刹车

一、类与对象的基础写法
```python
运行
# 【定义类】汽车的设计图纸
class Car:
    # 构造函数：对象创建时自动执行，用来初始化属性
    def __init__(self, brand, color):
        self.brand = brand  # 品牌属性
        self.color = color  # 颜色属性
        self.speed = 0      # 初始速度属性

    # 方法：车的行为
    def drive(self, speed):
        self.speed = speed
        print(f"{self.color}色的{self.brand}正在以 {speed} km/h 行驶")
       

# 【创建对象】按图纸造一辆具体的车
my_car = Car("Tesla", "红色")
# 调用对象的方法
my_car.drive(100)
# 输出：红色的Tesla正在以 100 km/h 行驶

```
二、面向对象三大特性
1. 封装：把内部细节藏起来，只暴露安全接口
```python
运行
class BankAccount:
    def __init__(self, balance):
        # __开头的私有属性，外部不能直接修改
        self.__balance = balance  

    # 公开的存款接口
    def deposit(self, money):
        if money > 0:
            self.__balance += money

    # 公开的查余额接口
    def get_balance(self):
        return self.__balance

# 使用
account = BankAccount(1000)
account.deposit(500)
print(account.get_balance())  # 输出：1500
# 直接改私有属性会失败：account.__balance = 9999 无效
```
2. 继承：子类复用父类的所有属性和方法，还能扩展新功能
```python
运行
# 父类：普通银行账户
class BankAccount:
    def __init__(self, balance):
        self.__balance = balance
    def deposit(self, money):
        if money > 0:
            self.__balance += money
    def get_balance(self):
        return self.__balance

# 子类：VIP账户，继承普通账户的所有功能
class VIPAccount(BankAccount):
    # 新增VIP专属的取款功能
    def withdraw(self, money):
        balance = self.get_balance()
        if money <= balance:
            self.deposit(-money)
            print("VIP取款成功")
        else:
            print("余额不足")

# 使用
vip_account = VIPAccount(10000)
vip_account.withdraw(2000)  # 继承来的功能+新增功能都能用
print(vip_account.get_balance())  # 输出：8000

```
3. 多态：同一个指令，不同对象有不同的反应
```python
运行
# 父类：动物
class Animal:
    def speak(self):
        pass

# 子类：狗
class Dog(Animal):
    def speak(self):
        return "汪汪汪"

# 子类：猫
class Cat(Animal):
    def speak(self):
        return "喵喵喵"

# 同一个函数，传入不同对象，结果不同
def make_animal_speak(animal):
    print(animal.speak())

dog = Dog()
cat = Cat()
make_animal_speak(dog)  # 输出：汪汪汪
make_animal_speak(cat)  # 输出：喵喵喵
```


想象你要管理两只宠物：旺财（狗）和小花（猫）。
如果用传统方式：

# ❌ 散乱、难扩展

```python

dog_name = "旺财"
cat_name = "小花"
def dog_bark(): ...
def cat_meow(): ...
```
问题很明显：数据和行为分离，难以复用，容易出错。
而 OOP 的思路是：
把“事物”抽象成“类”，再创建具体“对象”
就像：
“狗”是一个模板（类）
“旺财”是这个模板的实例（对象）
二、OOP 四大核心概念（附代码）
1️⃣ 类（Class）与对象（Object）
```python

class Animal:
    def __init__(self, name, breed="未知"):
        self.name = name      # 属性：名字
        self.breed = breed    # 属性：品种

    def speak(self):          # 方法：发声（子类实现）
        pass

    def jump(self):           # 方法：跳跃（子类实现）
        pass

    def show_breed(self):     # 通用方法：显示品种
        print(f"{self.name} 的品种是：{self.breed}")
        
```
__init__：构造方法，创建对象时自动运行
self：代表当前对象自身
属性 = 数据（如 name）
方法 = 行为（如 speak()）
2️⃣ 继承（Inheritance）—— 复用代码
```python

class Dog(Animal):  # Dog 继承 Animal
    def speak(self):
        print(f"{self.name} 汪汪！")

    def jump(self):
        print(f"{self.name} 高高跳起！")

class Cat(Animal):  # Cat 也继承 Animal
    def speak(self):
        print(f"{self.name} 喵喵～")

    def jump(self):
        print(f"{self.name} 轻盈地跃上窗台~")
        
```
✅ 好处：
公共属性（name, breed）只需在父类写一次
子类专注实现自己的行为
3️⃣ 多态（Polymorphism）—— 同一接口，不同实现
```python
animals = [Dog("黄主任", "土狗"), Cat("局座", "橘猫")]

for animal in animals:
    animal.speak()      # 自动调用对应子类的方法
    animal.jump()
    animal.show_breed()
    
```
✅ 输出：
文本


黄主任 汪汪！
黄主任 高高跳起！
黄主任 的品种是：土狗
局座 喵喵～
局座 轻盈地跃上窗台~
局座 的品种是：橘猫
关键：我们不需要知道 animal 是狗还是猫，只要它有 speak()，就能调用 —— 这就是多态的力量。
4️⃣ 封装（Encapsulation）—— 保护数据安全
虽然本例未展示私有属性，但你可以这样设计敏感数据：
```python

class BankAccount:
    def __init__(self, balance):
        self.__balance = balance  # 双下划线 = 私有属性

    def deposit(self, amount):
        self.__balance += amount  # 只能通过方法修改
        
```
✅ 防止外部直接修改 __balance，保证数据一致性。
三、常见新手误区 & 解决方案
表格
问题	原因	修复
AttributeError: 'Dog' object has no attribute 'show_breed'	忘记定义方法	在父类或子类中添加 def show_breed(self): ...
SyntaxError in f-string	引号未正确闭合	写成 f"{self.name} 跳"，不要拆成 f"{...}"文本
创建对象时报错参数不足	__init__ 需要多个参数	补全参数，或设默认值：breed="未知"


四、OOP 建模四步法（推荐流程）
每次设计类，按此流程走：
1. 找主角 → 确定类名（如 Animal）
2. 列特征 → 定义属性（如 name, breed）
3. 想动作 → 定义方法（如 speak(), jump()）
4. 问复用 → 是否需要继承？是否要封装？

