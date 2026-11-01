# TwinDesk 简体中文汉化资源

## 文件夹说明

- `windows/`：适用于 Windows 版 TwinDesk 2.4.0，内含 `windows` 和 `shared` 两个文件夹。
- `macos/`：目前为空，Mac 专用汉化尚未制作、验证。
- `README.md`：使用说明。

## Windows：把什么文件复制到哪里

你的 TwinDesk 安装目录：
D:\TwinDesk

1. 从系统托盘完全退出 TwinDesk。

2. 打开：
twindesk-zh\windows

3. 选中里面的 windows 和 shared 两个文件夹，复制到：
D:\TwinDesk\resources\app

出现同名文件提示时选择替换。保留目标文件夹中的其他文件，不要先删除整个文件夹。

对应关系如下：

windows/windows/ 中的文件
  → D:\TwinDesk\resources\app\windows\

windows/shared/ 中的文件
  → D:\TwinDesk\resources\app\shared\

4. 重新启动 TwinDesk，即可显示中文。

这台电脑已经安装过中文补丁，当前无需再复制。上述步骤供以后重新应用时使用。
如果安装目录改变，将上面路径中的安装目录换成实际位置即可。

## 恢复英文

如需恢复英文，请重新安装官方原版 TwinDesk。

## 适用范围

当前只提供 Windows 2.4.0 的资源，不能直接用于其他版本或 macOS。
设备名、文件名、用户消息、技术名称及部分系统错误可能保留原文。
已确认本机主界面中文显示，跨设备功能尚未完整实测。

## 来源与许可

原项目：TwinDesk，作者 inukaasith。
项目地址：https://github.com/InukaAsith/TwinDesk
本资源为 2026-11-02 制作的非官方简体中文修改版，保留原代码中的版权声明。
原项目许可证：[GPL-3.0](https://github.com/InukaAsith/TwinDesk/blob/main/LICENSE)。
