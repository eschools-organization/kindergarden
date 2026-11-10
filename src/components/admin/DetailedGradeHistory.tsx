"use client";
import React, { useState, useEffect } from 'react';
import { useColor } from '../ColorContext';
import { IoArrowBack, IoCalendarOutline, IoCameraOutline, IoTimeOutline, IoCheckmarkCircle, IoCloseCircle, IoSparkles } from 'react-icons/io5';
import { FaUtensils, FaBed, FaUserGraduate, FaSmile, FaMeh, FaFrown, FaHeart, FaStar, FaAppleAlt } from 'react-icons/fa';

const ArrowLeftIcon = IoArrowBack as React.FC<{ size?: number | string }>;

interface Student {
    _id: string;
    name: string;
    surname: string;
    user_ID?: string;
    class_id?: string;
    classInfo?: {
        _id: string;
        classname: string;
    };
}

interface RoutineLog {
    _id?: string;
    student_id: string;
    class_id: string;
    date: string;
    check_in_time?: string;
    check_out_time?: string;
    mood?: string;
    breakfast?: string;
    lunch?: string;
    dinner?: string;
    snack?: string;
    nap?: string;
    notes?: string;
    present?: boolean;
    updatedAt?: string;
}

interface ActivityPhoto {
    _id: string;
    class_id: string;
    activity_title: string;
    description?: string;
    photo_url: string;
    teacher_name?: string;
    date: string;
    created_at?: string;
}

interface DetailedGradeHistoryProps {
    classId: string;
    className: string;
    subjectId?: string;
    subjectName?: string;
    selectedColor?: string;
    logoutButtonStyle?: React.CSSProperties;
    onBackClick: () => void;
    selectedYear?: string;
    isAdmin?: boolean;
}

// Preset playful color palettes for child avatars
const AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
    'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
    'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)',
    'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
];

const getAvatarGradient = (index: number) => AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];

export const DetailedGradeHistory: React.FC<DetailedGradeHistoryProps> = ({
    classId,
    className,
    selectedColor = '#2563eb',
    onBackClick,
}) => {
    const { currentTheme } = useColor();
    const isDark = currentTheme.id === 'dark';

    const pageBg = isDark ? '#090d16' : '#f8fafc';
    const cardBg = isDark ? '#111827' : '#ffffff';
    const cardBorder = isDark ? '#1f2937' : '#e2e8f0';
    const textColor = isDark ? '#ffffff' : '#0f172a';
    const subTextColor = isDark ? '#94a3b8' : '#64748b';

    const todayStr = new Date().toISOString().slice(0, 10);
    const [selectedDate, setSelectedDate] = useState<string>(todayStr);
    const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const [students, setStudents] = useState<Student[]>([]);
    const [routineLogs, setRoutineLogs] = useState<RoutineLog[]>([]);
    const [activityPhotos, setActivityPhotos] = useState<ActivityPhoto[]>([]);
    const [availableDates, setAvailableDates] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                const [studentsRes, routineRes, photosRes] = await Promise.all([
                    fetch('/api/student/all'),
                    fetch(`/api/daily-routine?class_id=${classId}&date=all`),
                    fetch(`/api/activity-photos?class_id=${classId}`)
                ]);

                const [allStudentsData, routineData, photosData] = await Promise.all([
                    studentsRes.json(),
                    routineRes.json(),
                    photosRes.json()
                ]);

                const groupStudents = Array.isArray(allStudentsData)
                    ? allStudentsData.filter((s: any) =>
                        s.class_id === classId ||
                        s.classInfo?._id === classId ||
                        (s.classInfo?.classname && s.classInfo.classname.toLowerCase() === className.toLowerCase())
                    )
                    : [];

                setStudents(groupStudents);

                const logsArr: RoutineLog[] = Array.isArray(routineData) ? routineData : [];
                setRoutineLogs(logsArr);

                const photosArr: ActivityPhoto[] = Array.isArray(photosData) ? photosData : [];
                setActivityPhotos(photosArr);

                const logDates = logsArr.map(l => l.date).filter(Boolean);
                const photoDates = photosArr.map(p => p.date).filter(Boolean);
                const allUniqueDates = Array.from(new Set([todayStr, ...logDates, ...photoDates])).sort().reverse();
                setAvailableDates(allUniqueDates);

                if (!allUniqueDates.includes(selectedDate) && allUniqueDates.length > 0) {
                    setSelectedDate(allUniqueDates[0]);
                }
            } catch (err) {
                console.error("Error fetching kindergarten history:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [classId, className]);

    const logsForSelectedDate = routineLogs.filter(l => l.date === selectedDate);
    const photosForSelectedDate = activityPhotos.filter(p => p.date === selectedDate);

    const logMap = new Map<string, RoutineLog>();
    logsForSelectedDate.forEach(l => {
        logMap.set(l.student_id, l);
    });

    const filteredStudents = students.filter(s => {
        if (selectedStudentId !== 'all' && s._id !== selectedStudentId) return false;
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            const fullName = `${s.name} ${s.surname}`.toLowerCase();
            return fullName.includes(query);
        }
        return true;
    });

    const presentCount = students.filter(s => {
        const log = logMap.get(s._id);
        return log ? log.present !== false : true;
    }).length;

    const fullMealCount = students.filter(s => {
        const log = logMap.get(s._id);
        return log && (
            log.lunch === 'all' || log.lunch === 'შეჭამა სრულად' || log.lunch === 'სრულად' ||
            log.breakfast === 'all' || log.breakfast === 'შეჭამა სრულად' || log.breakfast === 'სრულად'
        );
    }).length;

    const getMealPillStyle = (val?: string) => {
        if (!val) return { label: 'არ არის მითითებული', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' };
        if (val === 'all' || val.includes('სრულად')) {
            return { label: '🟢 შეჭამა სრულად', color: '#065f46', bg: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', border: '#10b981' };
        }
        if (val === 'half' || val.includes('ნახევარი') || val.includes('ნაწილობრივ')) {
            return { label: '🟡 ნახევარი', color: '#92400e', bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '#f59e0b' };
        }
        if (val === 'none' || val.includes('არ შეჭამა')) {
            return { label: '🔴 არ შეჭამა', color: '#991b1b', bg: 'linear-gradient(135deg, #fee2e2 0%, #fca5a5 100%)', border: '#ef4444' };
        }
        return { label: val, color: '#1e40af', bg: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', border: '#3b82f6' };
    };

    const getMoodBadgeStyle = (val?: string) => {
        if (!val) return null;
        if (val === 'happy' || val.includes('მხიარული') || val.includes('შესანიშნავი')) {
            return { text: '😊 მხიარული', bg: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', color: '#ffffff', shadow: '0 4px 12px rgba(245, 158, 11, 0.35)' };
        }
        if (val === 'calm' || val.includes('მშვიდი')) {
            return { text: '😌 მშვიდი', bg: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', color: '#ffffff', shadow: '0 4px 12px rgba(16, 185, 129, 0.35)' };
        }
        if (val === 'energetic' || val.includes('ენერგიული')) {
            return { text: '⚡ ენერგიული', bg: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)', color: '#ffffff', shadow: '0 4px 12px rgba(59, 130, 246, 0.35)' };
        }
        if (val === 'sleepy' || val.includes('ეძინება') || val.includes('დაღლილი')) {
            return { text: '😴 ეძინება', bg: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)', color: '#ffffff', shadow: '0 4px 12px rgba(139, 92, 246, 0.35)' };
        }
        if (val === 'crying' || val.includes('ტირის') || val.includes('მოწყენილი')) {
            return { text: '😢 ტირის / მოწყენილი', bg: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)', color: '#ffffff', shadow: '0 4px 12px rgba(236, 72, 153, 0.35)' };
        }
        return { text: val, bg: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)', color: '#ffffff', shadow: '0 4px 12px rgba(59, 130, 246, 0.35)' };
    };

    const getNapLabel = (val?: string) => {
        if (!val) return '';
        if (val === 'slept') return '🛌 ტკბილად ეძინა';
        if (val === 'rested') return '😴 დაისვენა';
        if (val === 'awake') return '👀 ეღვიძა';
        return val;
    };

    if (loading) {
        return (
            <div style={{ color: textColor, textAlign: 'center', marginTop: '60px', fontSize: '18px', fontWeight: 800 }}>
                🎨 იტვირთება ჯგუფის ფერადი ისტორია...
            </div>
        );
    }

    return (
        <div style={{
            width: '100%',
            minHeight: '100vh',
            background: pageBg,
            color: textColor,
            padding: '24px 16px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '1280px',
                background: cardBg,
                borderRadius: '28px',
                boxShadow: isDark ? '0 16px 40px rgba(0, 0, 0, 0.5)' : '0 16px 40px rgba(0, 0, 0, 0.06)',
                border: `1px solid ${cardBorder}`,
                padding: '32px 28px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: '28px'
            }}>
                {/* Header Banner with Gradient Accent */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px',
                    padding: '20px 24px',
                    borderRadius: '20px',
                    background: isDark
                        ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(139, 92, 246, 0.2))'
                        : 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 50%, #faf5ff 100%)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                }}>
                    <button
                        onClick={onBackClick}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: '#ffffff',
                            border: '1.5px solid #cbd5e1',
                            color: '#0f172a',
                            fontWeight: 800,
                            fontSize: '15px',
                            cursor: 'pointer',
                            padding: '10px 20px',
                            borderRadius: '14px',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                        }}
                    >
                        <ArrowLeftIcon size={20} /> უკან დაბრუნება
                    </button>

                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 900, color: textColor, display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                            🧸 ჯგუფის დღიური ისტორია <IoSparkles color="#f59e0b" size={24} />
                        </h2>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#2563eb', marginTop: '6px' }}>
                            🎨 ჯგუფი: <span style={{ color: '#ec4899', fontSize: '17px', fontWeight: 900 }}>{className}</span>
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        color: 'white',
                        padding: '10px 18px',
                        borderRadius: '14px',
                        fontWeight: 900,
                        fontSize: '14px',
                        boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)'
                    }}>
                        <IoCalendarOutline size={20} />
                        <span>{selectedDate}</span>
                    </div>
                </div>

                {/* Interactive Controls & Filters */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '16px',
                    background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                    padding: '22px',
                    borderRadius: '22px',
                    border: `1.5px solid ${cardBorder}`
                }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: subTextColor, marginBottom: '8px' }}>
                            📅 აირჩიეთ თარიღი:
                        </label>
                        <select
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '14px',
                                background: '#ffffff',
                                border: '1.5px solid #cbd5e1',
                                color: '#0f172a',
                                fontWeight: 800,
                                fontSize: '14px',
                                outline: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                            }}
                        >
                            {availableDates.map(d => (
                                <option key={d} value={d}>
                                    {d === todayStr ? `📅 ${d} (დღეს)` : `🗓️ ${d}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: subTextColor, marginBottom: '8px' }}>
                            👶 აირჩიეთ აღსაზრდელი:
                        </label>
                        <select
                            value={selectedStudentId}
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '14px',
                                background: '#ffffff',
                                border: '1.5px solid #cbd5e1',
                                color: '#0f172a',
                                fontWeight: 800,
                                fontSize: '14px',
                                outline: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                            }}
                        >
                            <option value="all">👶 ყველა აღსაზრდელი ({students.length})</option>
                            {students.map(s => (
                                <option key={s._id} value={s._id}>
                                    {s.name} {s.surname}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: subTextColor, marginBottom: '8px' }}>
                            🔍 ძებნა სახელის მიხედვით:
                        </label>
                        <input
                            type="text"
                            placeholder="სახელი, გვარი..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '14px',
                                background: '#ffffff',
                                border: '1.5px solid #cbd5e1',
                                color: '#0f172a',
                                fontWeight: 700,
                                fontSize: '14px',
                                outline: 'none',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                            }}
                        />
                    </div>
                </div>

                {/* Colorful Summary Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '18px'
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        borderRadius: '22px',
                        padding: '20px 22px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)'
                    }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                            <FaUserGraduate />
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', opacity: 0.9 }}>
                                სწრებადობა
                            </div>
                            <div style={{ fontSize: '22px', fontWeight: 900, marginTop: '2px' }}>
                                {presentCount} / {students.length} <span style={{ fontSize: '13px', fontWeight: 600, opacity: 0.85 }}>აღსაზრდელი</span>
                            </div>
                        </div>
                    </div>

                    <div style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        color: 'white',
                        borderRadius: '22px',
                        padding: '20px 22px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)'
                    }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                            <FaUtensils />
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', opacity: 0.9 }}>
                                სრული კვება
                            </div>
                            <div style={{ fontSize: '22px', fontWeight: 900, marginTop: '2px' }}>
                                {fullMealCount} <span style={{ fontSize: '13px', fontWeight: 600, opacity: 0.85 }}>აღსაზრდელმა შეჭამა</span>
                            </div>
                        </div>
                    </div>

                    <div style={{
                        background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                        color: 'white',
                        borderRadius: '22px',
                        padding: '20px 22px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        boxShadow: '0 8px 25px rgba(236, 72, 153, 0.3)'
                    }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                            <IoCameraOutline />
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', opacity: 0.9 }}>
                                დღის ფოტოები
                            </div>
                            <div style={{ fontSize: '22px', fontWeight: 900, marginTop: '2px' }}>
                                {photosForSelectedDate.length} <span style={{ fontSize: '13px', fontWeight: 600, opacity: 0.85 }}>ფოტო ატვირთულია</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Activity Photos Section */}
                {photosForSelectedDate.length > 0 && (
                    <div style={{
                        background: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff',
                        border: `1.5px solid ${cardBorder}`,
                        borderRadius: '24px',
                        padding: '26px'
                    }}>
                        <h3 style={{ margin: '0 0 18px 0', fontSize: '20px', fontWeight: 900, color: textColor, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            📸 დღის ფოტოგალერეა ({selectedDate})
                        </h3>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                            gap: '18px'
                        }}>
                            {photosForSelectedDate.map(photo => (
                                <div key={photo._id} style={{
                                    borderRadius: '20px',
                                    overflow: 'hidden',
                                    border: `1.5px solid ${cardBorder}`,
                                    background: isDark ? '#1f2937' : '#f8fafc',
                                    boxShadow: '0 6px 18px rgba(0,0,0,0.04)',
                                    transition: 'transform 0.2s ease',
                                }}>
                                    <img
                                        src={photo.photo_url}
                                        alt={photo.activity_title}
                                        style={{ width: '100%', height: '170px', objectFit: 'cover' }}
                                    />
                                    <div style={{ padding: '14px' }}>
                                        <div style={{ fontSize: '15px', fontWeight: 800, color: textColor }}>
                                            {photo.activity_title}
                                        </div>
                                        {photo.description && (
                                            <div style={{ fontSize: '13px', color: subTextColor, marginTop: '4px', fontWeight: 500 }}>
                                                {photo.description}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Children Routine Cards Grid */}
                <div>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 900, color: textColor, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        📋 აღსაზრდელების დღიური ბარათები ({filteredStudents.length})
                    </h3>

                    {filteredStudents.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '50px', color: subTextColor, fontSize: '17px', fontWeight: 700 }}>
                            აღსაზრდელები ვერ მოიძებნა
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                            gap: '22px'
                        }}>
                            {filteredStudents.map((student, idx) => {
                                const log = logMap.get(student._id);
                                const isPresent = log ? log.present !== false : true;
                                const moodBadge = getMoodBadgeStyle(log?.mood);
                                const bStyle = getMealPillStyle(log?.breakfast);
                                const lStyle = getMealPillStyle(log?.lunch);
                                const dStyle = getMealPillStyle(log?.dinner || log?.snack);
                                const avatarGradient = getAvatarGradient(idx);

                                return (
                                    <div
                                        key={student._id}
                                        style={{
                                            background: isDark ? '#1f2937' : '#ffffff',
                                            border: `1.5px solid ${cardBorder}`,
                                            borderRadius: '24px',
                                            padding: '22px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '16px',
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.03)',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {/* Top Accent Bar */}
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            height: '5px',
                                            background: isPresent ? avatarGradient : '#ef4444'
                                        }} />

                                        {/* Child Profile Header */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                <div style={{
                                                    width: '46px',
                                                    height: '46px',
                                                    borderRadius: '50%',
                                                    background: avatarGradient,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontWeight: 900,
                                                    fontSize: '17px',
                                                    boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
                                                }}>
                                                    {student.name[0]}{student.surname[0]}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '17px', fontWeight: 900, color: textColor }}>
                                                        {student.name} {student.surname}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: isPresent ? '#10b981' : '#ef4444', fontWeight: 800, marginTop: '2px' }}>
                                                        {isPresent ? '🟢 გამოცხადდა ბაღში' : '🔴 გაცდენა'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Mood Badge */}
                                            {moodBadge && (
                                                <span style={{
                                                    fontSize: '12px',
                                                    fontWeight: 900,
                                                    padding: '6px 12px',
                                                    borderRadius: '14px',
                                                    background: moodBadge.bg,
                                                    color: moodBadge.color,
                                                    boxShadow: moodBadge.shadow
                                                }}>
                                                    {moodBadge.text}
                                                </span>
                                            )}
                                        </div>

                                        {/* Check-in / Check-out */}
                                        {(log?.check_in_time || log?.check_out_time) && (
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-around',
                                                fontSize: '13px',
                                                fontWeight: 800,
                                                background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                                                padding: '10px 14px',
                                                borderRadius: '14px',
                                                border: `1px solid ${cardBorder}`
                                            }}>
                                                <div style={{ color: '#2563eb' }}>🕒 მოსვლა: <strong>{log.check_in_time || '08:30'}</strong></div>
                                                <div style={{ color: '#ec4899' }}>👋 წასვლა: <strong>{log.check_out_time || '17:30'}</strong></div>
                                            </div>
                                        )}

                                        {/* Meals Grid */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(3, 1fr)',
                                            gap: '8px',
                                            textAlign: 'center'
                                        }}>
                                            <div style={{
                                                background: bStyle.bg,
                                                border: `1px solid ${bStyle.border}`,
                                                padding: '10px 6px',
                                                borderRadius: '14px',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                            }}>
                                                <div style={{ fontSize: '11px', color: bStyle.color, fontWeight: 800, marginBottom: '4px' }}>
                                                    🥪 საუზმე
                                                </div>
                                                <span style={{ fontSize: '11px', fontWeight: 900, color: bStyle.color }}>
                                                    {bStyle.label}
                                                </span>
                                            </div>

                                            <div style={{
                                                background: lStyle.bg,
                                                border: `1px solid ${lStyle.border}`,
                                                padding: '10px 6px',
                                                borderRadius: '14px',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                            }}>
                                                <div style={{ fontSize: '11px', color: lStyle.color, fontWeight: 800, marginBottom: '4px' }}>
                                                    🍲 სადილი
                                                </div>
                                                <span style={{ fontSize: '11px', fontWeight: 900, color: lStyle.color }}>
                                                    {lStyle.label}
                                                </span>
                                            </div>

                                            <div style={{
                                                background: dStyle.bg,
                                                border: `1px solid ${dStyle.border}`,
                                                padding: '10px 6px',
                                                borderRadius: '14px',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                            }}>
                                                <div style={{ fontSize: '11px', color: dStyle.color, fontWeight: 800, marginBottom: '4px' }}>
                                                    🍎 წახემსება
                                                </div>
                                                <span style={{ fontSize: '11px', fontWeight: 900, color: dStyle.color }}>
                                                    {dStyle.label}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Nap Time */}
                                        {log?.nap && (
                                            <div style={{
                                                fontSize: '13px',
                                                fontWeight: 800,
                                                color: '#7c3aed',
                                                background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%)',
                                                border: '1px solid #c084fc',
                                                padding: '10px 14px',
                                                borderRadius: '14px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                <FaBed color="#7c3aed" size={16} />
                                                <span>ძილი / დასვენება: <strong>{getNapLabel(log.nap)}</strong></span>
                                            </div>
                                        )}

                                        {/* Educator Notes */}
                                        {log?.notes && (
                                            <div style={{
                                                fontSize: '13px',
                                                background: isDark ? 'rgba(59, 130, 246, 0.12)' : '#eff6ff',
                                                borderLeft: `4px solid ${selectedColor}`,
                                                padding: '12px 14px',
                                                borderRadius: '12px',
                                                color: textColor,
                                                fontWeight: 600,
                                                lineHeight: 1.5
                                            }}>
                                                <strong style={{ color: selectedColor }}>📝 აღმზრდელის შენიშვნა:</strong> {log.notes}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DetailedGradeHistory;
