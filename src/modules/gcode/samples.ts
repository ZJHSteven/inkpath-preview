/**
 * @file samples.ts
 * @description
 *  提供内置的示例 G-code，便于初学者快速理解界面功能。
 *  示例中包含绝对/相对坐标、落笔抬笔等常见场景。
 */

export const DEFAULT_GCODE_SAMPLE = `; InkPath Preview 示例程序（单位：毫米）
G21        ; 使用毫米单位
G90        ; 绝对坐标模式
G0 X0 Y0   ; 快速移动至起点，默认视为抬笔
G1 Z-1 F600 ; 降低 Z 轴至落笔高度
G1 X40 Y0 F800
G1 X40 Y-40
G1 X0 Y-40
G1 X0 Y0
G1 Z5      ; 抬笔
; 以下演示相对运动
G91        ; 切换至相对坐标
G0 X10 Y-10
G1 Z-1
G1 X20
G1 Y-20
G1 X-20
G1 Y20
G1 Z5
M2         ; 程序结束`
