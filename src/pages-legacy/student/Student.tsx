"use client";
import React, { useState, useEffect } from 'react';
import { useColor } from './../../components/ColorContext';
import ColorPalette from './../../components/ColorPalette';
import StudentSubjectsGrades from './../../components/StudentSubjectsGrades';
import NoticeBoard from './../../components/NoticeBoard';
import ChatModule from './../../components/ChatModule';
import DailyTimeline from './../../components/DailyTimeline';
import HomeworkModule from './../../components/HomeworkModule';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MonthlyPaymentButtons from '@/components/MonthlyPaymentButtons';
import { 
  FaSignOutAlt, 
  FaGraduationCap, 
  FaBullhorn, 
  FaComments,
  FaCalendarAlt,
  FaTasks,
  FaUserGraduate,
  FaCreditCard
} from 'react-icons/fa';
import { getPaymentStatus } from '@/lib/payment';
import { clearAuthSession, validateSession, verifyAuthMe } from '@/lib/auth';
import '../admin/Admin.css';
import './Student.css';

const FaSignOutAltIcon = FaSignOutAlt as React.ComponentType<any>;

function getGeorgianDate() {
    const days = ['კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'];
    const months = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];
    const now = new Date();
    return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
}

function getGreeting() {
    const hours = new Date().getHours();
    if (hours < 12) return 'დილა მშვიდობისა';
    if (hours < 18) return 'დღე მშვიდობისა';
    return 'საღამო მშვიდობისა';
}

function readStudentSession(): { studentId: string; classId: string } {
    if (typeof window === 'undefined') return { studentId: '', classId: '' };
    const storedStudentId = localStorage.getItem('studentId');
    const storedClassId = localStorage.getItem('classId');
    if (storedStudentId && storedClassId) {
        return { studentId: storedStudentId, classId: storedClassId };
    }
    const urlParams = new URLSearchParams(window.location.search);
    return {
        studentId: urlParams.get('student_id') || '',
        classId: urlParams.get('class_id') || '',
    };
}

const Student: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { selectedColor } = useColor();
    const [{ studentId, classId }] = useState(readStudentSession);
    const [activeTab, setActiveTab] = useState<'grades' | 'timeline' | 'homework' | 'notices' | 'messages' | 'payments'>('grades');

    // Fetch student info
    const { data: studentInfo } = useQuery({
        queryKey: ['student-info', studentId],
        queryFn: async () => {
            const res = await fetch(`/api/student/info?user_ID=${studentId}`);
            if (!res.ok) throw new Error();
            return res.json();
        },
        enabled: !!studentId,
        staleTime: 60000
    });

    const handleConfirmPaymentForMonth = async () => {
        if (!studentId || !studentInfo) return;
        const isPaid = studentInfo.payment_status === 'paid';
        const nextStatus = isPaid ? 'unpaid' : 'paid';

        const monthsGeorgian = [
            'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
            'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'
        ];
        const currentMonthName = monthsGeorgian[new Date().getMonth()];

        try {
            await Promise.all([
                fetch(`/api/student/update/${studentInfo._id || studentId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        _id: studentInfo._id || studentId,
                        name: studentInfo.name,
                        surname: studentInfo.surname,
                        user_ID: studentId,
                        class_id: classId,
                        payment_status: nextStatus
                    })
                }),
                fetch('/api/student/pay-month', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        student_id: studentId,
                        month: currentMonthName,
                        status: nextStatus
                    })
                })
            ]);
            queryClient.invalidateQueries({ queryKey: ['student-info', studentId] });
        } catch (err) {
            console.error('Error confirming payment:', err);
        }
    };

    // Fetch all messages for unread badge evaluation
    const { data: allMessages } = useQuery({
        queryKey: ['student-messages-unread', studentId],
        queryFn: async () => {
            const response = await fetch(`/api/messages?user_id=${studentId}`);
            if (!response.ok) throw new Error();
            return response.json();
        },
        enabled: !!studentId,
        refetchInterval: 5000
    });

    // Fetch announcements for unread badge evaluation
    const { data: announcements } = useQuery({
        queryKey: ['announcements-unread'],
        queryFn: async () => {
            const response = await fetch('/api/announcements');
            if (!response.ok) throw new Error();
            return response.json();
        },
        refetchInterval: 8000
    });

    const hasUnreadMessages = React.useMemo(() => {
        if (!allMessages || !Array.isArray(allMessages)) return false;
        const incomingCount = allMessages.filter((m: any) => m.sender_id !== studentId).length;
        const seenCount = typeof window !== 'undefined' ? parseInt(localStorage.getItem('seen_incoming_messages_count') || '0', 10) : 0;
        return incomingCount > seenCount;
    }, [allMessages, studentId]);

    const hasUnreadNotices = React.useMemo(() => {
        if (!announcements || !Array.isArray(announcements)) return false;
        const totalNotices = announcements.length;
        const seenNotices = typeof window !== 'undefined' ? parseInt(localStorage.getItem('seen_notices_count') || '0', 10) : 0;
        return totalNotices > seenNotices;
    }, [announcements]);

    // Clear messages badge when user clicks on Messages tab
    React.useEffect(() => {
        if (activeTab === 'messages' && allMessages && Array.isArray(allMessages)) {
            const incomingCount = allMessages.filter((m: any) => m.sender_id !== studentId).length;
            localStorage.setItem('seen_incoming_messages_count', incomingCount.toString());
        }
    }, [activeTab, allMessages, studentId]);

    // Clear notices badge when user clicks on notices tab
    React.useEffect(() => {
        if (activeTab === 'notices' && announcements && Array.isArray(announcements)) {
            localStorage.setItem('seen_notices_count', announcements.length.toString());
        }
    }, [activeTab, announcements]);

    const studentFullName = studentInfo ? `${studentInfo.name} ${studentInfo.surname}` : 'მოსწავლე';

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const authRes = await verifyAuthMe('student');
                if (!authRes.authenticated || !authRes.user) {
                    clearAuthSession();
                    navigate('/', { replace: true });
                }
            } catch {
                clearAuthSession();
                navigate('/', { replace: true });
            }
        };
        checkAuth();
    }, [navigate]);

    const handleLogout = () => {
        clearAuthSession();
        navigate('/', { replace: true });
    };

    if (!studentId || !classId) {
        clearAuthSession();
        navigate('/', { replace: true });
        return null;
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'grades':
                return <StudentSubjectsGrades studentId={studentId} classId={classId} />;
            case 'timeline':
                return <DailyTimeline classId={classId} />;
            case 'homework':
                return <HomeworkModule userRole="student" userId={studentId} userName={studentFullName} classId={classId} selectedColor={selectedColor} />;
            case 'notices':
                return <NoticeBoard currentUser={{ id: studentId, name: studentFullName, role: 'student', classId: classId }} />;
            case 'messages':
                return <ChatModule currentUser={{ id: studentId, name: studentFullName, role: 'student' }} />;
            case 'payments':
                return (
                    <MonthlyPaymentButtons
                        studentId={studentId}
                        monthlyPayments={studentInfo?.monthly_payments}
                        selectedColor={selectedColor}
                        isReadOnly={true}
                        onPaymentUpdated={() => queryClient.invalidateQueries({ queryKey: ['student-info', studentId] })}
                    />
                );
        }
    };

    return (
        <div className="admin-page-wrapper">
            <div
                className="admin-page-bg-glow"
                style={{ background: `radial-gradient(circle at center, ${selectedColor}26 0%, transparent 70%)` }}
            />
            {/* Top Fixed Controls (Palette & Logout) */}
            <div className="student-top-controls">
                <ColorPalette />
                <button className="logout-btn" onClick={handleLogout} style={{ position: 'static' }}>
                    <FaSignOutAltIcon /> გამოსვლა
                </button>
            </div>

            <div className="admin-page-content">
                {/* Header Banner */}
                <header className="student-page-header animate-fade-in-down">
                    <h1 className="admin-page-title">
                        მშობლის / აღსაზრდელის <span style={{ color: selectedColor }}>პანელი</span>
                    </h1>
                    <p className="admin-page-subtitle">
                        {getGreeting()}, {studentFullName} • {getGeorgianDate()}
                    </p>
                </header>

                {/* Profile & Quick Info Card */}
                <div className="student-profile-card">
                    <div className="student-profile-info">
                        <div
                            className="student-avatar"
                            style={{
                                background: `linear-gradient(135deg, ${selectedColor}, ${selectedColor}aa)`,
                                boxShadow: `0 4px 15px ${selectedColor}40`
                            }}
                        >
                            {studentInfo?.name?.[0] || 'ა'}{studentInfo?.surname?.[0] || ''}
                        </div>
                        <div>
                            <div className="student-name-text">
                                {studentFullName}
                            </div>
                            <div className="student-subtext">
                                საბავშვო ბაღის ელექტრონული სისტემა • EKINDERGARTEN
                            </div>
                        </div>
                    </div>

                    <div className="student-profile-badges">
                        {studentInfo?.classInfo?.classname && (
                            <div style={{
                                padding: '8px 16px',
                                borderRadius: '12px',
                                background: `${selectedColor}20`,
                                border: `1px solid ${selectedColor}50`,
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <FaUserGraduate size={14} color={selectedColor} />
                                ჯგუფი: {studentInfo.classInfo.classname}
                            </div>
                        )}

                        {(() => {
                            const pStatus = getPaymentStatus(studentInfo?.payment_due_day, studentInfo?.payment_amount, studentInfo?.payment_status);
                            const isPaid = studentInfo?.payment_status === 'paid';
                            return (
                                <>
                                    <div style={{
                                        padding: '8px 16px',
                                        borderRadius: '12px',
                                        background: `${pStatus.badgeColor}18`,
                                        border: `1px solid ${pStatus.badgeColor}55`,
                                        color: 'white',
                                        fontWeight: 700,
                                        fontSize: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: `0 4px 12px ${pStatus.badgeColor}20`
                                    }}>
                                        <FaCreditCard size={14} color={pStatus.badgeColor} />
                                        <span>გადასახადი: <strong>{pStatus.amount} ₾</strong></span>
                                        <span style={{ color: pStatus.badgeColor, marginLeft: '4px' }}>| {pStatus.badgeText}</span>
                                    </div>

                                    <div
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '12px',
                                            background: isPaid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                            border: isPaid ? '1px solid #10b981' : '1px solid #ef4444',
                                            color: isPaid ? '#10b981' : '#fca5a5',
                                            fontWeight: 800,
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        {isPaid ? '🟢 გადახდილია' : '🔴 გადაუხდელია'}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="student-tabs-wrapper">
                    <div className="admin-tabs student-tabs">
                        <button
                            onClick={() => setActiveTab('timeline')}
                            className={`admin-tab-btn student-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
                        >
                            <FaCalendarAlt size={16} /> 🧸 დღის რეჟიმი & კვება
                        </button>
                        <button
                            onClick={() => setActiveTab('grades')}
                            className={`admin-tab-btn student-tab-btn ${activeTab === 'grades' ? 'active' : ''}`}
                        >
                            <FaGraduationCap size={16} /> 📊 შეფასება & უნარები
                        </button>
                        <button
                            onClick={() => setActiveTab('homework')}
                            className={`admin-tab-btn student-tab-btn ${activeTab === 'homework' ? 'active' : ''}`}
                        >
                            <FaTasks size={16} /> 🎨 სახლის აქტივობები
                        </button>
                        <button
                            onClick={() => setActiveTab('notices')}
                            className={`admin-tab-btn student-tab-btn ${activeTab === 'notices' ? 'active' : ''}`}
                            style={{ position: 'relative' }}
                        >
                            <FaBullhorn size={16} /> 📢 განცხადებები
                            {hasUnreadNotices && (
                                <span style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: '#ef4444',
                                    boxShadow: '0 0 6px #ef4444'
                                }} />
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('payments')}
                            className={`admin-tab-btn student-tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
                        >
                            <FaCreditCard size={16} /> 💳 თვიური გადასახადები
                        </button>
                    </div>
                </div>

                {/* Active Tab Panel Content */}
                <div className="student-main-view animate-zoom-in">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default Student;
