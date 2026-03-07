/**
 * Calendar Skill - 日历操作
 */

import { calendarEvents, getTodayEvents, getUpcomingEvents } from '../services/external.js';

export async function executeCalendar(action: string, params: any): Promise<any> {
  const hours = params.hours || 2;
  
  switch (action) {
    case 'list':
    case 'all':
      return calendarEvents;
      
    case 'today':
      return getTodayEvents();
      
    case 'upcoming':
      return getUpcomingEvents(hours);
      
    default:
      return { success: false, error: 'Unknown action' };
  }
}
