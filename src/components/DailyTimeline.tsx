"use client";
import React, { useState, useEffect } from 'react';
import { useColor } from './ColorContext';
import { useQuery } from '@tanstack/react-query';
import {
  IoTimeOutline,
  IoCalendarOutline,
  IoSparklesOutline,
  IoRestaurantOutline,
  IoMoonOutline,
  IoHappyOutline,
  IoChatbubbleEllipsesOutline,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoWarningOutline,
  IoArrowBackOutline,
  IoArrowForwardOutline,
  IoEyeOutline,
  IoCloseCircleOutline
} from 'react-icons/io5';

const TimeIcon = IoTimeOutline as React.ComponentType<any>;
const CalendarIcon = IoCalendarOutline as React.ComponentType<any>;

interface DailyTimelineProps {
  classId: string;
  studentId?: string;
  studentUserId?: string;
  studentName?: string;
}

interface CalendarEvent {
  _id?: string;
  date: string;
  type: 'holiday' | 'makeup';
  title: string;
  replacementDayOfWeek?: number;
}

const daysGeorgian = ['ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი'];

function formatDateLocal(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DailyTimeline: React.FC<DailyTimelineProps> = ({ classId, studentId, studentUserId, studentName = 'აღსაზრდელი' }) => {
  const { selectedColor } = useColor();

  // Current day of week (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const currentDayOfWeek = new Date().getDay();
  const initialDayIdx = currentDayOfWeek >= 1 && currentDayOfWeek <= 5 ? currentDayOfWeek - 1 : 0;
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(initialDayIdx);
  const [customDate, setCustomDate] = useState<string>('');
  const [lightboxPhoto, setLightboxPhoto] = useState<any | null>(null);

  // Queries for calendar events
  const { data: calendarEvents } = useQuery<CalendarEvent[]>({
    queryKey: ['calendar-events'],
    queryFn: async () => {
      const res = await fetch('/api/calendar-events');
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 10000
  });

  // Query child's daily routine logs (meals, sleep, mood, attendance)
  const targetStudentId = studentId || studentUserId;
  const { data: studentRoutineLogs, isLoading: loadingRoutine } = useQuery<any[]>({
    queryKey: ['student-daily-routine-log', targetStudentId],
    queryFn: async () => {
      if (!targetStudentId) return [];
      const res = await fetch(`/api/daily-routine?student_id=${targetStudentId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!targetStudentId,
    refetchInterval: 6000
  });

  // Query educator and methodist behavior observations / comments
  const { data: behaviorNotes } = useQuery<any[]>({
    queryKey: ['student-behaviors-timeline', targetStudentId],
    queryFn: async () => {
      if (!targetStudentId) return [];
      const res = await fetch(`/api/behaviors?student_id=${targetStudentId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!targetStudentId,
    refetchInterval: 10000
  });

  // Query group routine items (custom kindergarten schedule)
  const { data: groupRoutineItems, isLoading: loadingRoutineItems } = useQuery<any[]>({
    queryKey: ['group-routine-items-timeline', classId],
    queryFn: async () => {
      if (!classId) return [];
      const res = await fetch(`/api/class/group-routine?class_id=${classId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!classId,
    refetchInterval: 10000
  });

  // Query activity photos for class
  const { data: activityPhotos } = useQuery<any[]>({
    queryKey: ['activity-photos-timeline', classId],
    queryFn: async () => {
      if (!classId) return [];
      const res = await fetch(`/api/activity-photos?class_id=${classId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!classId,
    refetchInterval: 10000
  });

  // Calculate actual date for the selected day in current week
  const getWeekDateStr = (dayIdx: number) => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + diffToMon + dayIdx);
    return formatDateLocal(targetDate);
  };

  const selectedDateStr = customDate || getWeekDateStr(selectedDayIdx);
  const todayDateStr = formatDateLocal(new Date());

  // Check if today or selected date has a special calendar event (holiday / makeup)
  const currentEvent = calendarEvents?.find(e => e.date === selectedDateStr);
  const isHolidayDay = currentEvent?.type === 'holiday';
  const isMakeupDay = currentEvent?.type === 'makeup';

  // Find child's personal daily log for the selected date
  const currentDayLog = studentRoutineLogs?.find((l: any) => l.date === selectedDateStr);
  const latestFilledLog = studentRoutineLogs && studentRoutineLogs.length > 0 ? studentRoutineLogs[0] : null;

  // Helper mappings for meals
  const mealLabel = (val?: string) => {
    if (!val) return { text: 'არ არის მონიშნული', color: '#94a3b8', bg: '#f1f5f9', badge: '⚪' };
    const lower = String(val).toLowerCase().trim();
    if (lower === 'all' || lower.includes('სრულ') || lower.includes('ყველა')) {
      return { text: 'სრულად შეჭამა', color: '#059669', bg: '#ecfdf5', badge: '🟢' };
    }
    if (lower === 'half' || lower.includes('ნახევ') || lower.includes('ნაწილობრივ')) {
      return { text: 'ნახევარი შეჭამა', color: '#d97706', bg: '#fffbeb', badge: '🟡' };
    }
    if (lower === 'none' || lower.includes('არ') || lower.includes('უჭამ')) {
      return { text: 'არ უჭამია', color: '#dc2626', bg: '#fef2f2', badge: '🔴' };
    }
    return { text: val, color: '#059669', bg: '#ecfdf5', badge: '🟢' };
  };

  // Helper mappings for nap
  const napLabel = (val?: string) => {
    if (!val) return { text: 'არ არის მონიშნული', icon: '—', color: '#94a3b8', bg: '#f1f5f9' };
    const lower = String(val).toLowerCase().trim();
    if (lower === 'slept' || lower.includes('დაიძინ') || lower.includes('ეძინა') || lower.includes('კარგად')) {
      return { text: 'კარგად დაიძინა', icon: '💤', color: '#2563eb', bg: '#eff6ff' };
    }
    if (lower === 'rested' || lower.includes('დაისვენ') || lower.includes('მშვიდად') || lower.includes('იწვა')) {
      return { text: 'დაისვენა / მშვიდად იწვა', icon: '🛏️', color: '#0891b2', bg: '#ecfeff' };
    }
    if (lower === 'awake' || lower.includes('ფხიზლ') || lower.includes('არ ეძინა') || lower.includes('ფხიზლად')) {
      return { text: 'არ ეძინა / ფხიზლად იყო', icon: '👀', color: '#d97706', bg: '#fffbeb' };
    }
    return { text: val, icon: '🛏️', color: '#2563eb', bg: '#eff6ff' };
  };

  // Helper mappings for mood
  const moodLabel = (val?: string) => {
    if (!val) return { text: 'მშვენიერი', icon: '😊', color: '#475569', bg: '#f1f5f9' };
    const lower = String(val).toLowerCase().trim();
    if (lower === 'happy' || lower.includes('მხიარულ') || lower.includes('ხალისი')) {
      return { text: 'მხიარული და ხალისიანი', icon: '😃', color: '#059669', bg: '#ecfdf5' };
    }
    if (lower === 'calm' || lower.includes('მშვიდ') || lower.includes('გაწონასწორ')) {
      return { text: 'მშვიდი და გაწონასწორებული', icon: '😊', color: '#2563eb', bg: '#eff6ff' };
    }
    if (lower === 'energetic' || lower.includes('ენერგი') || lower.includes('აქტიურ')) {
      return { text: 'ძალიან ენერგიული და აქტიური', icon: '⚡', color: '#d97706', bg: '#fffbeb' };
    }
    if (lower === 'sleepy' || lower.includes('ძილი') || lower.includes('ეძინებ')) {
      return { text: 'ძილიანი / ეძინებოდა', icon: '😴', color: '#6366f1', bg: '#eef2ff' };
    }
    if (lower === 'crying' || lower.includes('ტირ') || lower.includes('მოწყენ')) {
      return { text: 'მოწყენილი / ტიროდა', icon: '😢', color: '#dc2626', bg: '#fef2f2' };
    }
    return { text: val, icon: '😊', color: '#059669', bg: '#ecfdf5' };
  };

  return (
    <div style={{
      maxWidth: '950px',
      width: '100%',
      margin: '0 auto',
      padding: '16px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      {/* Day Selector Buttons & Date Picker */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '18px 24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 800, fontSize: '15px' }}>
            <CalendarIcon size={20} style={{ color: selectedColor }} />
            <span>აირჩიეთ დღე:</span>
          </div>

          {/* Quick Date Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>სხვა თარიღი:</span>
            <input
              type="date"
              value={selectedDateStr}
              onChange={(e) => setCustomDate(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                background: '#ffffff',
                color: '#000000',
                fontWeight: 700,
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
            {customDate && (
              <button
                type="button"
                onClick={() => setCustomDate('')}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                მიმდინარე კვირა
              </button>
            )}
          </div>
        </div>

        {/* Weekday Pills */}
        <div className="daily-timeline-day-selector" style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px'
        }}>
          {daysGeorgian.map((dayName, idx) => {
            const dateStr = getWeekDateStr(idx);
            const isSelected = !customDate && selectedDayIdx === idx;
            const isToday = todayDateStr === dateStr;
            const eventForDay = calendarEvents?.find(e => e.date === dateStr);

            return (
              <button
                key={dayName}
                type="button"
                onClick={() => {
                  setCustomDate('');
                  setSelectedDayIdx(idx);
                }}
                style={{
                  flex: '1 1 auto',
                  minWidth: '120px',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  border: isSelected ? `2px solid ${selectedColor}` : '1.5px solid #e2e8f0',
                  background: isSelected ? `${selectedColor}12` : isToday ? '#eff6ff' : '#ffffff',
                  color: isSelected ? selectedColor : '#334155',
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s',
                  boxShadow: isSelected ? `0 4px 12px ${selectedColor}22` : 'none'
                }}
              >
                <span>{dayName}</span>
                <span style={{ fontSize: '11px', color: isSelected ? selectedColor : '#94a3b8', fontWeight: 700 }}>
                  {dateStr} {isToday && '• დღეს'}
                </span>
                {eventForDay?.type === 'holiday' && (
                  <span style={{ fontSize: '10px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '1px 6px', borderRadius: '4px' }}>
                    უქმე
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Holiday Alert */}
      {isHolidayDay && currentEvent && (
        <div style={{
          background: 'linear-gradient(135deg, #fef2f2 0%, #ffe4e6 100%)',
          border: '1.5px solid #fecaca',
          borderRadius: '16px',
          padding: '20px 24px',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(239, 68, 68, 0.08)'
        }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#991b1b', fontWeight: 800 }}>
            🎉 დასვენების დღე: {currentEvent.title}
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#b91c1c' }}>
            ამ დღეს საბავშვო ბაღში სააღმზრდელო პროცესი არ მიმდინარეობს.
          </p>
        </div>
      )}

      {/* SECTION 1: CHILD'S DAILY REPORT (კვება, ძილი, განწყობა, დასწრება, შენიშვნა) */}
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '28px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Card Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              boxShadow: '0 6px 18px rgba(245, 158, 11, 0.3)'
            }}>
              🧸
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                {studentName}-ს დღის ანგარიში & კვება
              </h2>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>
                📅 {selectedDateStr} {todayDateStr === selectedDateStr && '• (დღევანდელი დღე)'}
              </div>
            </div>
          </div>

          {(currentDayLog || latestFilledLog) && (
            <div style={{
              padding: '6px 14px',
              borderRadius: '12px',
              background: (currentDayLog || latestFilledLog).present !== false ? '#ecfdf5' : '#fef2f2',
              color: (currentDayLog || latestFilledLog).present !== false ? '#059669' : '#dc2626',
              border: (currentDayLog || latestFilledLog).present !== false ? '1px solid #a7f3d0' : '1px solid #fecaca',
              fontWeight: 800,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {(currentDayLog || latestFilledLog).present !== false ? '🟢 ბაღშია / გამოცხადდა' : '🔴 არ გამოცხადდა'}
            </div>
          )}
        </div>

        {/* Notice if displaying fallback to most recent filled day */}
        {!currentDayLog && latestFilledLog && (
          <div style={{
            background: '#f0f9ff',
            border: '1.5px solid #bae6fd',
            borderRadius: '14px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0369a1', fontWeight: 700, fontSize: '13px' }}>
              <span>📌</span>
              <span>
                <strong>{selectedDateStr}</strong>-ის ანგარიში ჯერ არ არის შევსებული. ქვემოთ ნაჩვენებია ბოლოს შევსებული ანგარიში (<strong>{latestFilledLog.date}</strong>):
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCustomDate(latestFilledLog.date)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              📅 {latestFilledLog.date}-ის გახსნა
            </button>
          </div>
        )}

        {/* If Routine Log Exists (Current or Latest Fallback) */}
        {(currentDayLog || latestFilledLog) ? (() => {
          const logToShow = currentDayLog || latestFilledLog;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Arrival / Departure Bar */}
              {(logToShow.check_in_time || logToShow.check_out_time) && (
                <div style={{
                  background: '#f8fafc',
                  borderRadius: '14px',
                  padding: '12px 18px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569', fontWeight: 700 }}>
                    <TimeIcon size={18} style={{ color: '#2563eb' }} />
                    <span>მიყვანა: <strong>{logToShow.check_in_time || '—'}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569', fontWeight: 700 }}>
                    <TimeIcon size={18} style={{ color: '#7c3aed' }} />
                    <span>გაყვანა: <strong>{logToShow.check_out_time || '—'}</strong></span>
                  </div>
                </div>
              )}

              {/* Grid of Routine Cards: Meals, Sleep, Mood */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {/* Card 1: 🍽️ MEALS (საჭმელი შეჭამა თუ არა) */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  padding: '20px',
                  border: '1.5px solid #fed7aa',
                  boxShadow: '0 4px 15px rgba(249, 115, 22, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '16px', color: '#9a3412' }}>
                    <span style={{ fontSize: '20px' }}>🍽️</span>
                    <span>კვების ანგარიში (კვება)</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Breakfast */}
                    {(() => {
                      const b = mealLabel(logToShow.breakfast);
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '10px', background: '#fff7ed', border: '1px solid #ffedd5' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: '#431407' }}>🍳 საუზმე:</span>
                          <span style={{ fontWeight: 800, fontSize: '13px', color: b.color, background: b.bg, padding: '3px 10px', borderRadius: '8px' }}>
                            {b.badge} {b.text}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Lunch */}
                    {(() => {
                      const l = mealLabel(logToShow.lunch);
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '10px', background: '#fff7ed', border: '1px solid #ffedd5' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: '#431407' }}>🍲 სადილი:</span>
                          <span style={{ fontWeight: 800, fontSize: '13px', color: l.color, background: l.bg, padding: '3px 10px', borderRadius: '8px' }}>
                            {l.badge} {l.text}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Snack */}
                    {(() => {
                      const s = mealLabel(logToShow.snack);
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '10px', background: '#fff7ed', border: '1px solid #ffedd5' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: '#431407' }}>🍎 სამხარი:</span>
                          <span style={{ fontWeight: 800, fontSize: '13px', color: s.color, background: s.bg, padding: '3px 10px', borderRadius: '8px' }}>
                            {s.badge} {s.text}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Dinner (if provided) */}
                    {logToShow.dinner && (
                      (() => {
                        const d = mealLabel(logToShow.dinner);
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '10px', background: '#fff7ed', border: '1px solid #ffedd5' }}>
                            <span style={{ fontWeight: 700, fontSize: '14px', color: '#431407' }}>🍛 ვახშამი:</span>
                            <span style={{ fontWeight: 800, fontSize: '13px', color: d.color, background: d.bg, padding: '3px 10px', borderRadius: '8px' }}>
                              {d.badge} {d.text}
                            </span>
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>

                {/* Card 2: 😴 NAP & MOOD (ძილი და განწყობა) */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  padding: '20px',
                  border: '1.5px solid #bfdbfe',
                  boxShadow: '0 4px 15px rgba(37, 99, 235, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '16px', color: '#1e40af' }}>
                    <span style={{ fontSize: '20px' }}>😴</span>
                    <span>ძილი & განწყობა</span>
                  </div>

                  {/* Nap Status */}
                  {(() => {
                    const n = napLabel(logToShow.nap);
                    return (
                      <div style={{ padding: '12px 14px', borderRadius: '12px', background: n.bg, border: '1px solid rgba(0,0,0,0.06)' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                          შუადღის ძილი:
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: n.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{n.icon}</span>
                          <span>{n.text}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Mood Status */}
                  {(() => {
                    const m = moodLabel(logToShow.mood);
                    return (
                      <div style={{ padding: '12px 14px', borderRadius: '12px', background: m.bg, border: '1.5px solid #bfdbfe' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                          აღსაზრდელის განწყობა:
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: m.color, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '22px' }}>{m.icon}</span>
                          <span>{m.text}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Teacher's Notes */}
              {logToShow.notes && (
                <div style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #bbf7d0',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '24px' }}>📝</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#166534', marginBottom: '4px' }}>
                      აღმზრდელის / მეთოდისტის პირადი კომენტარი მშობელს:
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#14532d', lineHeight: 1.5 }}>
                      "{logToShow.notes}"
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })() : (
          <div style={{
            background: '#f8fafc',
            border: '2px dashed #cbd5e1',
            borderRadius: '18px',
            padding: '36px 20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>🥣</div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>
              ანგარიში ჯერ არ არის შევსებული
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              აღმზრდელი და მეთოდისტი დღის განმავლობაში შეავსებენ ინფორმაციას ბავშვის კვების (საუზმე, სადილი, სამხარი), ძილის, განწყობისა და აქტივობების შესახებ.
            </p>
          </div>
        )}
      </div>

      {/* SECTION 1.5: PAST DAYS HISTORY & ARCHIVE (წინა დღეების არქივი) */}
      {studentRoutineLogs && studentRoutineLogs.length > 0 && (
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '24px 28px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🗓️ წინა დღეების დღიური & ისტორია</span>
            </h3>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
              სულ შევსებულია {studentRoutineLogs.length} დღე
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {studentRoutineLogs.slice(0, 7).map((log: any) => {
              const m = moodLabel(log.mood);
              const b = mealLabel(log.breakfast);
              const l = mealLabel(log.lunch);
              const s = mealLabel(log.snack);
              const isSelected = selectedDateStr === log.date;

              return (
                <div
                  key={log._id || log.date}
                  onClick={() => setCustomDate(log.date)}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '14px',
                    background: isSelected ? '#eff6ff' : '#f8fafc',
                    border: isSelected ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>{m.icon}</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                        📅 {log.date} {log.date === todayDateStr && '(დღეს)'}
                      </div>
                      <div style={{ fontSize: '12px', color: m.color, fontWeight: 700 }}>
                        განწყობა: {m.text}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', background: '#fff7ed', border: '1px solid #ffedd5', padding: '3px 8px', borderRadius: '6px', color: '#9a3412', fontWeight: 700 }}>
                      🍳 საუზმე: {b.badge}
                    </span>
                    <span style={{ fontSize: '11px', background: '#fff7ed', border: '1px solid #ffedd5', padding: '3px 8px', borderRadius: '6px', color: '#9a3412', fontWeight: 700 }}>
                      🍲 სადილი: {l.badge}
                    </span>
                    <span style={{ fontSize: '11px', background: '#fff7ed', border: '1px solid #ffedd5', padding: '3px 8px', borderRadius: '6px', color: '#9a3412', fontWeight: 700 }}>
                      🍎 სამხარი: {s.badge}
                    </span>
                    {log.notes && (
                      <span style={{ fontSize: '11px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: '6px', color: '#166534', fontWeight: 700 }}>
                        📝 შენიშვნით
                      </span>
                    )}
                    <button
                      type="button"
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: isSelected ? '#3b82f6' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#334155',
                        border: '1px solid #cbd5e1',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {isSelected ? 'არჩეულია' : 'გახსნა'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 1.6: EDUCATOR & METHODIST OBSERVATIONS AND BEHAVIOR FEEDBACK */}
      {behaviorNotes && behaviorNotes.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)',
          borderRadius: '24px',
          padding: '24px 28px',
          border: '1.5px solid #f3e8ff',
          boxShadow: '0 4px 20px rgba(168, 85, 247, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#581c87', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🌟 აღმზრდელისა და მეთოდისტის შეფასებები & დაკვირვებები</span>
            </h3>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#7e22ce', background: '#f3e8ff', padding: '4px 10px', borderRadius: '8px' }}>
              ბავშვის ქცევა და ჩართულობა
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {behaviorNotes.slice(0, 6).map((item: any) => (
              <div
                key={item._id}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '16px',
                  border: '1px solid #e9d5ff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontWeight: 800, fontSize: '13px', color: '#6b21a8' }}>
                    🏷️ {item.category}
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                    📅 {item.date} {item.time && `• ${item.time}`}
                  </span>
                </div>

                {item.comment && (
                  <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600, lineHeight: 1.4 }}>
                    "{item.comment}"
                  </div>
                )}

                <div style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 700, marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>✍️ {item.teacher_name || 'აღმზრდელი / მეთოდისტი'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: GROUP ROUTINE SCHEDULE FOR THIS DATE (ჯგუფის დღის განრიგი) */}
      {!isHolidayDay && groupRoutineItems && groupRoutineItems.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '24px',
          padding: '28px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
          border: '1.5px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📋 ჯგუფის დღის განრიგი & აქტივობები</span>
            </h2>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '4px 12px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
              საათების მიხედვით
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
            {(() => {
              const dateSpecific = groupRoutineItems.filter((item: any) => item.date === selectedDateStr);
              const itemsToRender = dateSpecific.length > 0
                ? dateSpecific
                : groupRoutineItems.filter((item: any) => {
                    if (item.date && item.date !== selectedDateStr) return false;
                    const targetDay = selectedDayIdx + 1;
                    return item.day_of_week === targetDay || item.day_of_week === 0 || !item.day_of_week;
                  });

              if (itemsToRender.length === 0) {
                return (
                  <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: '16px' }}>
                    ამ დღისთვის განრიგი მითითებული არ არის.
                  </div>
                );
              }

              return itemsToRender.map((item: any) => (
                <div
                  key={item._id}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                    display: 'flex',
                    gap: '14px',
                    alignItems: 'flex-start'
                  }}
                >
                  <div style={{
                    fontSize: '24px',
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {item.icon || '🌟'}
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#2563eb', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <TimeIcon size={14} />
                      <span>{item.time_start} - {item.time_end}</span>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                      {item.title}
                    </div>
                    {item.description && (
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', fontWeight: 600 }}>
                        {item.description}
                      </div>
                    )}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* SECTION 3: COMPLETED ACTIVITY PHOTOS */}
      {(() => {
        if (!activityPhotos || activityPhotos.length === 0) return null;
        const matchingPhotos = activityPhotos.filter((p: any) => p.date === selectedDateStr);
        const photosToShow = matchingPhotos.length > 0 ? matchingPhotos : activityPhotos.slice(0, 8);

        return (
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '28px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📸 დღის შესრულებული აქტივობების ფოტოები {matchingPhotos.length > 0 ? `(${selectedDateStr})` : ''}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
              {photosToShow.map((item) => (
                <div
                  key={item._id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div
                    style={{ position: 'relative', height: '170px', cursor: 'pointer', background: '#0f172a' }}
                    onClick={() => setLightboxPhoto(item)}
                  >
                    <img
                      src={item.photo_url}
                      alt={item.activity_title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      background: 'rgba(0,0,0,0.6)',
                      color: '#ffffff',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <IoEyeOutline size={14} /> სრულად
                    </div>
                  </div>

                  <div style={{ padding: '14px' }}>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                      {item.activity_title}
                    </div>
                    {item.description && (
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        {item.description}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px', fontWeight: 600 }}>
                      📅 {item.date} • {item.teacher_name || 'აღმზრდელი'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Lightbox Modal for Activity Photo */}
      {lightboxPhoto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(6px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxPhoto(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              <IoCloseCircleOutline size={32} />
            </button>
            <img
              src={lightboxPhoto.photo_url}
              alt={lightboxPhoto.activity_title}
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
                borderRadius: '16px',
                objectFit: 'contain',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
              }}
            />
            <div style={{ marginTop: '14px', textAlign: 'center', color: '#ffffff' }}>
              <div style={{ fontWeight: 800, fontSize: '18px' }}>
                {lightboxPhoto.activity_title}
              </div>
              {lightboxPhoto.description && (
                <div style={{ fontSize: '14px', opacity: 0.85, marginTop: '4px' }}>
                  {lightboxPhoto.description}
                </div>
              )}
              <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '4px' }}>
                📅 {lightboxPhoto.date} • {lightboxPhoto.teacher_name || 'აღმზრდელი'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyTimeline;
