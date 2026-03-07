# HEARTBEAT.md - 心跳检查清单

## 状态

- [x] enabled: true

## 检查任务

- [x] health_check - 健康检查 (每1分钟)
- [x] cleanup_sessions - 清理过期会话 (每5分钟)
- [ ] fetch_emails - 检查新邮件 (每5分钟)
- [ ] check_calendar - 检查日历事件 (每10分钟)
- [ ] system_stats - 系统状态监控 (每15分钟)

---

## 任务说明

### health_check
- 间隔: 1分钟
- 用途: 检查服务健康状态，记录活跃会话数

### cleanup_sessions
- 间隔: 5分钟
- 用途: 清理超过24小时的过期会话

### fetch_emails (待开发)
- 间隔: 5分钟
- 用途: 检查新邮件，重要邮件提醒用户

### check_calendar (待开发)
- 间隔: 10分钟
- 用途: 检查即将到来的日历事件

### system_stats (待开发)
- 间隔: 15分钟
- 用途: 监控系统资源使用情况
